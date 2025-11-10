/** @format */
"use strict";

/**
 * @file rag_engine.js
 * @description
 * Questo file agisce come un "proxy" verso il Web Worker (rag_worker.js).
 * Il suo ruolo è di ricevere le richieste da app_ui.js, inviarle come messaggi
 * al worker, e restituire una Promise che si risolverà con il risultato del worker.
 * Mantiene anche la logica per la Fase 3 (chiamate LLM), che rimane nel thread principale.
 */

import { UaLog } from "./services/ualog3.js";
import { promptBuilder } from "./llm_prompts.js";

// #region Gestione Worker
let worker;
let requestPromises = {}; // Oggetto per mappare comandi a promise

function initWorker() {
    worker = new Worker('./js/rag_worker.js');
    worker.onmessage = (e) => {
        const { status, command, result, error, progress } = e.data;
        
        if (status === 'progress') {
            UaLog.log(progress); // Logga i progressi inviati dal worker
            return;
        }

        const promise = requestPromises[command];
        if (promise) {
            if (status === 'complete') {
                promise.resolve(result);
            } else if (status === 'error') {
                promise.reject(new Error(error));
            }
            delete requestPromises[command]; // Pulisce la promise dopo l'uso
        }
    };
    worker.onerror = (e) => {
        console.error("Errore generico nel Web Worker:", e);
        // Rifiuta tutte le promise in attesa
        Object.values(requestPromises).forEach(p => p.reject(new Error("Errore nel worker")));
        requestPromises = {};
    };
}

function postCommandToWorker(command, data) {
    return new Promise((resolve, reject) => {
        // Salva la promise in modo che il listener onmessage possa risolverla
        requestPromises[command] = { resolve, reject };
        worker.postMessage({ command, data });
    });
}

// #endregion

// #region LLM Communication
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logMessages = (payload) => {
    const msgs = payload.messages;
    console.debug("*** messages **************************************");
    for (const m of msgs) {
        console.debug(m.role);
        console.debug(m.content);
        console.debug("-------------------------------------")
    }
}

const sendRequest = async (client, payload, errorTag) => {
    logMessages(payload);
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    let last_rr = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const rr = await client.sendRequest(payload, 90);
        last_rr = rr;
        if (!rr) return rr;

        if (rr.ok) return rr;
        const err = rr.error;
        console.error("****\n", `${errorTag} (Attempt ${attempt}/${MAX_RETRIES}):`, err);
        if (err && err.code === 413) {
            await alert("Prompt troppo grande per questo Mddel");
            client.cancelRequest();
            return rr;
        }
        if (err && (err.code === 408 || [500, 502, 503, 504].includes(err.code))) {
            UaLog.log(`Transient error ${err.code}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await sleep(RETRY_DELAY_MS);
        } else {
            return rr;
        }
    }
    return last_rr;
};
// #endregion

export const ragEngine = {
    client: null,
    model: null,
    promptSize: 0,

    init(client, model, promptSize) {
        this.client = client;
        this.model = model;
        this.promptSize = promptSize;
        if (!worker) {
            initWorker();
        }
    },

    // --- Funzioni Proxy per il Worker ---

    processDocumentsForPhase0(documents) {
        return postCommandToWorker('phase0', documents);
    },

    ne1_buildIndex(chunks) {
        return postCommandToWorker('phase1', chunks);
    },

    ne2_search(serializedIndex, query) {
        return postCommandToWorker('phase2', { serializedIndex, query });
    },

    // --- Logica che rimane nel Thread Principale ---

    /**
     * Fase 3: Generazione della Risposta.
     * Costruisce il contesto basandosi sui risultati della ricerca e lo invia all'LLM.
     * 
     * La logica di costruzione del contesto è la seguente:
     * 1. Itera sui risultati della ricerca della Fase 2 (i più pertinenti prima).
     * 2. Per ogni risultato, trova il testo completo del chunk corrispondente.
     * 3. Crea uno "snippet" formattato che include l'ID del chunk, il punteggio di pertinenza e il testo.
     * 4. Aggiunge lo snippet al contesto finale, controllando di non superare una dimensione massima
     *    (MAX_CONTEXT_LENGTH) per evitare di creare un prompt troppo grande per l'LLM.
     * 5. Una volta costruito il contesto, lo unisce alla query dell'utente e invia tutto all'LLM.
     * 
     * @param {string} query - La domanda originale dell'utente.
     * @param {Array<Object>} searchResults - I risultati della ricerca dalla Fase 2.
     * @param {Array<Object>} allChunks - Tutti i chunk dalla Fase 0.
     * @returns {Promise<string>} Una promessa che si risolve con la risposta testuale dell'LLM.
     */
    async ne3_generateResponse(query, searchResults, allChunks) {
        let context = "";
        const MAX_CONTEXT_LENGTH = this.promptSize * 0.7; // Usa il 70% dello spazio per il contesto

        // Costruisce la stringa di contesto iterando sui risultati della ricerca
        for (const result of searchResults) {
            // Trova il chunk completo usando l'ID restituito dalla ricerca
            const chunk = allChunks.find(c => c.id === result.ref);
            if (chunk) {
                const chunkSnippet = `--- Chunk: ${chunk.id}, Score: ${result.score.toFixed(4)} ---\n${chunk.text}\n\n`;
                
                // Aggiunge il chunk al contesto solo se non si supera la dimensione massima
                if ((context + chunkSnippet).length <= MAX_CONTEXT_LENGTH) {
                    context += chunkSnippet;
                } else {
                    // Se si supera la dimensione, interrompe il ciclo per non aggiungere altri chunk
                    break;
                }
            }
        }

        if (!context) {
            UaLog.log("Nessun contesto pertinente trovato per la query.");
            return "Non sono riuscito a trovare informazioni pertinenti nei documenti per rispondere alla tua domanda.";
        }
        
        // Assembla il prompt finale e lo invia all'LLM
        const messages = promptBuilder.answerPrompt(context, [{role: 'user', content: query}]);
        const payload = {
            model: this.model,
            messages: messages,
            random_seed: 42,
            temperature: 0.7,
            max_tokens: 4000,
        };

        UaLog.log("Generazione risposta LLM...");
        const rr = await sendRequest(this.client, payload, "ERR_GENERATE_RESPONSE");
        if (!rr || !rr.ok) {
            throw rr ? rr.error : new Error("Request failed without response");
        }
        return rr.data;
    }
};
