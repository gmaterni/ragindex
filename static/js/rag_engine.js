/**
 * rag_engine.js - Motore RAG principale
 * Coordina la creazione della knowledge base e la generazione delle risposte.
 * Modulo specifico dell'applicazione RagIndex.
 */
"use strict";

import { UaLog } from "./services/ualog3.js";
import { promptBuilder } from "./llm_prompts.js";
import { WORKER_PATH } from "./services/worker_path.js";

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Istanza del Web Worker.
 */
let _worker = null;

/**
 * Promesse in attesa di risposta dal worker.
 */
let _requestPromises = {};

/**
 * Client LLM corrente.
 */
let _client = null;

/**
 * Modello LLM corrente.
 */
let _model = null;

/**
 * Dimensione del prompt in byte.
 */
let _promptSize = 0;

// ============================================================================
// FUNZIONI PRIVATE - Worker Management
// ============================================================================

/**
 * Inizializza il Web Worker.
 */
const _initWorker = () => {
    const workerUrl = new URL(WORKER_PATH, import.meta.url).href;
    _worker = new Worker(workerUrl);

    _worker.onmessage = (e) => {
        const { status, command, result, error, progress } = e.data;

        if (status === "progress") {
            UaLog.log(progress);
            return;
        }

        const promise = _requestPromises[command];

        if (promise) {
            if (status === "complete") {
                promise.resolve(result);
            } else if (status === "error") {
                promise.reject(new Error(error));
            }

            delete _requestPromises[command];
        }
    };

    _worker.onerror = (e) => {
        console.error("Errore generico nel Web Worker:", e);
        Object.values(_requestPromises).forEach((p) => {
            p.reject(new Error("Errore nel worker"));
        });
        _requestPromises = {};
    };
};

/**
 * Invia un comando al Web Worker.
 */
const _postCommandToWorker = (command, data) => {
    if (!_worker) {
        _initWorker();
    }

    const promise = new Promise((resolve, reject) => {
        _requestPromises[command] = { resolve, reject };
        _worker.postMessage({ command, data });
    });

    return promise;
};

// ============================================================================
// FUNZIONI PRIVATE - LLM Communication
// ============================================================================

/**
 * Distilla la query dell'utente in parole chiave ottimizzate per la ricerca.
 * Utilizza l'LLM stesso per estrarre i concetti core senza rispondere.
 *
 * @param {string} query - Domanda originale dell'utente
 * @returns {Promise<string>} Parole chiave ottimizzate
 * @private
 */
const _distillQuery = async (query) => {
    UaLog.log("🔍 Ottimizzazione termini di ricerca...");

    const distillationPrompt = `
# COMPITO
Agisci come un esperto di Information Retrieval. Data la domanda di un utente, estrai esclusivamente una lista di 5-8 parole chiave (nomi, entità, concetti tecnici) ottimizzate per una ricerca lessicale BM25.

# REGOLE
1. Restituisci SOLO le parole chiave separate da spazio.
2. NON rispondere alla domanda.
3. NON aggiungere commenti, introduzioni o conclusioni.
4. Rimuovi verbi di cortesia (vorrei, sapresti, dimmi) e focalizzati sul core informativo.

# DOMANDA UTENTE
${query}

# PAROLE CHIAVE OTTIMIZZATE:
`.trim();

    console.debug("PROMPT ESTENDI DOMANDA:");
    console.debug(distillationPrompt);
    const payload = {
        model: _model,
        messages: [{ role: "user", content: distillationPrompt }],
        temperature: 0.1,
        max_tokens: 50
    };

    const rr = await _sendRequest(_client, payload, "ERR_DISTILL_QUERY");

    if (!rr || !rr.ok) {
        console.warn("Distillazione fallita o interrotta, uso query originale.");
        return query;
    }

    const distilled = rr.data.trim();
    console.debug("KEYWORDS:", distilled);
    console.debug("=========================");

    return distilled;
};

/**
 * Pausa di attesa.
 */
const _sleep = (ms) => {
    const promise = new Promise((resolve) => setTimeout(resolve, ms));
    return promise;
};

/**
 * Invia richiesta al client LLM con retry.
 */
const _sendRequest = async (client, payload, errorTag) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;

    let result = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const rr = await client.sendRequest(payload, 90);

        if (!rr || rr.ok) {
            result = rr;
            break;
        }

        const err = rr.error;
        console.error(`${errorTag} (Attempt ${attempt}/${MAX_RETRIES}):`, err);

        if (err && (err.code === 408 || [500, 502, 503, 504].includes(err.code))) {
            UaLog.log(`Transient error ${err.code}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await _sleep(RETRY_DELAY_MS);
        } else {
            result = rr;
            break;
        }
    }

    return result;
};

// ============================================================================
// API PUBBLICA
// ============================================================================

/**
 * Motore RAG principale.
 */
export const ragEngine = {

    /**
     * Inizializza il motore RAG.
     */
    init: (client, model, promptSize) => {
        _client = client;
        _model = model;
        _promptSize = promptSize;

        if (!_worker) {
            _initWorker();
        }
    },

    /**
     * Ferma il worker e pulisce le risorse.
     */
    stop: () => {
        if (_worker) {
            _worker.terminate();
            _worker = null;
            Object.values(_requestPromises).forEach((p) => {
                p.reject(new Error("Operazione interrotta dall'utente"));
            });
            _requestPromises = {};
            console.log("RagEngine: Worker terminato.");
        }
    },

    /**
     * Crea la Knowledge Base dai documenti.
     */
    createKnowledgeBase: (documents) => {
        const promise = _postCommandToWorker("createKnowledgeBase", documents);
        return promise;
    },

    /**
     * Costruisce il contesto dalla query (metodo interno).
     */
    buildContext: (serializedIndex, allChunks, query) => {
        const index = lunr.Index.load(JSON.parse(serializedIndex));
        const searchResults = index.search(query);

        let context = "";
        const MAX_CONTEXT_LENGTH = _promptSize * 0.7;
        const usedParentIds = new Set();

        for (const result of searchResults) {
            const parentId = result.ref.split("#")[0];
            if (!usedParentIds.has(parentId)) {
                usedParentIds.add(parentId);
                const chunk = allChunks.find((c) => c.id === parentId);
                if (chunk) {
                    const chunkSnippet = `--- Context: ${chunk.id} (Score: ${result.score.toFixed(4)}) ---\n${chunk.text}\n\n`;
                    if ((context + chunkSnippet).length <= MAX_CONTEXT_LENGTH) {
                        context += chunkSnippet;
                    } else {
                        break;
                    }
                }
            }
        }

        return context;
    },

    /**
     * Ottiene il contesto ottimizzato (Workflow RAG).
     * Gestisce internamente la distillazione se è la prima domanda.
     * 
     * @param {string} query - Domanda attuale
     * @param {Object} kbData - {index, chunks}
     * @param {Array} thread - Cronologia
     * @returns {Promise<string>} Contesto RAG
     */
    getOptimizedContext: async (query, kbData, thread) => {
        const isFirstQuestion = !thread || thread.length <= 1;

        if (!kbData || !kbData.index || !isFirstQuestion) {
            if (kbData && kbData.index) {
                console.info("RAG: Conversazione in corso, salto la generazione del contesto.");
            }
            return "";
        }

        console.info("--- [RAG WORKFLOW: CONTEXT GENERATION] ---");

        // 1. Distillazione Query
        const searchTerms = await _distillQuery(query);

        // 2. Ricerca
        UaLog.log("📄 Recupero informazioni pertinenti...");
        const context = ragEngine.buildContext(kbData.index, kbData.chunks, searchTerms);

        console.info(`Found context length: ${context.length} chars`);
        console.info("--- [RAG WORKFLOW END] ---");

        return context;
    },

    /**
     * Genera la risposta finale dall'LLM.
     * 
     * @param {string} context - Contesto RAG già pronto
     * @param {Array} thread - Cronologia messaggi (contiene l'ultima domanda)
     * @returns {Promise<string>} Risposta LLM
     */
    generateResponse: async (context, thread) => {
        const messages = promptBuilder.answerPrompt(context, thread);
        console.debug("PHASE 2: FINAL RESPONSE GENERATION                           ║");
        for (const x of messages) {
            console.debug(x.role);
            console.debug(x.content);
        }
        console.debug("===============================");

        const payload = {
            model: _model,
            messages: messages,
            random_seed: 42,
            temperature: 0.7,
            max_tokens: 4000
        };

        UaLog.log("✍️ Generazione risposta LLM...");
        console.info(`Requesting final answer from ${_model}...`);

        const rr = await _sendRequest(_client, payload, "ERR_GENERATE_RESPONSE");

        if (!rr || !rr.ok) {
            const errorToThrow = rr ? rr.error : new Error("Request failed without response");
            throw errorToThrow;
        }

        return rr.data;
    }
};
