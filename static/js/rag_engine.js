/** @format */
"use strict";

/**
 * @file rag_engine.js
 * @description
 * Questo file contiene il "cervello" della logica RAG (Retrieval-Augmented Generation).
 * È progettato per essere un modulo di "business logic" puro, il che significa che
 * non interagisce direttamente con il DOM, lo storage o le API di rete.
 * Le sue funzioni ricevono dati, li elaborano e restituiscono un risultato,
 * lasciando al chiamante (app_ui.js) il compito di orchestrare il flusso.
 */

// App Integration Dependencies
import { UaLog } from "./services/ualog3.js";
import { promptBuilder } from "./llm_prompts.js";

// #region LLM Communication (copied from original rag_engine)
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
    },

    /**
     * Esegue l'intera logica di business per la Fase 0.
     * Prende i documenti, li cicla, li segmenta e arricchisce i chunk con metadati.
     * @param {Array<Object>} documents - Array di oggetti documento, es. [{name: 'doc1.txt', text: '...'}]
     * @returns {Promise<Array<Object>>} Una promessa che si risolve con l'array completo di tutti i chunk processati.
     */
    async processDocumentsForPhase0(documents) {
        let allChunks = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            UaLog.log(` Elaborazione documento ${i + 1}/${documents.length}: ${doc.name}`);
            
            // La funzione ne0_chunkAndAnnotate usa la libreria globale 'nlp' (compromise.js),
            // caricata via tag <script> in ragtext.html, per l'analisi del testo.
            const docChunks = await this.ne0_chunkAndAnnotate(doc.text);
            
            // Arricchisce i chunk con un ID univoco basato sul documento di origine.
            docChunks.forEach((chunk, index) => {
                chunk.id = `doc${i}-chunk${index}`;
            });
            
            allChunks.push(...docChunks);
        }
        return allChunks;
    },

    /**
     * Logica interna della Fase 0: Segmentazione e Annotazione di un singolo testo.
     * @param {string} text - Il contenuto testuale di un documento.
     * @returns {Promise<Array<Object>>} Un array di oggetti chunk per il documento fornito.
     */
    async ne0_chunkAndAnnotate(text) {
        const chunks = [];
        const sentences = nlp(text).sentences().out('array');
        let currentChunkText = "";
        let chunkIdCounter = 0;

        const MIN_CHUNK_SIZE = 300;
        const MAX_CHUNK_SIZE = 1500;

        for (const sentence of sentences) {
            if (currentChunkText.length + sentence.length + 1 > MAX_CHUNK_SIZE && currentChunkText.length >= MIN_CHUNK_SIZE) {
                chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
                currentChunkText = sentence;
            } else {
                currentChunkText += (currentChunkText.length > 0 ? " " : "") + sentence;
            }
        }

        if (currentChunkText.length > 0) {
            chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
        }
        return chunks;
    },

    async _processChunk(chunkText, id) {
        const doc = nlp(chunkText);
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        const adjectives = doc.adjectives().out('array');
        const keywords = [...new Set([...nouns, ...verbs, ...adjectives])]
            .map(word => word.toLowerCase())
            .filter(word => word.length > 2);

        const people = doc.people().out('array');
        const places = doc.places().out('array');
        const organizations = doc.organizations().out('array');
        const entities = [...new Set([...people, ...places, ...organizations])]
            .map(entity => entity.toLowerCase());

        return {
            id: `chunk-${String(id).padStart(3, '0')}`,
            text: chunkText,
            keywords: keywords,
            entities: entities,
        };
    },

    /**
     * Fase 1: Indicizzazione.
     * Input: Array di chunk dalla Fase 0.
     * Output: Oggetto indice di Lunr.js.
     * @param {Array<Object>} chunks - L'array di oggetti chunk prodotto dalla Fase 0.
     * @returns {Object} Un oggetto indice di Lunr.js.
     */
    ne1_buildIndex(chunks) {
        const idx = lunr(function () {
            this.use(lunr.it);
            this.ref('id');
            this.field('body');

            chunks.forEach(chunk => {
                const fullText = `${chunk.text} ${chunk.keywords.join(" ")} ${chunk.entities.join(" ")}`;
                this.add({ id: chunk.id, body: fullText });
            });
        });
        return idx;
    },

    /**
     * Fase 2: Ricerca (Creazione del Contesto).
     * Input: Indice serializzato da IndexedDB e query dall'utente.
     * Output: Array di risultati di ricerca.
     * @param {string} serializedIndex - L'indice serializzato (JSON) creato nella Fase 1.
     * @param {string} query - La domanda dell'utente.
     * @returns {Array<Object>} Un array di risultati di ricerca di Lunr.js.
     */
    ne2_search(serializedIndex, query) {
        if (!serializedIndex) {
            throw new Error("Indice serializzato non fornito a ne2_search.");
        }
        const index = lunr.Index.load(JSON.parse(serializedIndex));
        return index.search(query);
    },

    /**
     * Fase 3: Generazione della Risposta.
     * Input: Query utente, risultati della ricerca (contesto) e tutti i chunk.
     * Output: Stringa di testo con la risposta dell'LLM.
     * @param {string} query - La domanda originale dell'utente.
     * @param {Array<Object>} searchResults - I risultati della ricerca dalla Fase 2.
     * @param {Array<Object>} allChunks - Tutti i chunk dalla Fase 0.
     * @returns {Promise<string>} Una promessa che si risolve con la risposta testuale dell'LLM.
     */
    async ne3_generateResponse(query, searchResults, allChunks) {
        let context = "";
        const MAX_CONTEXT_LENGTH = this.promptSize * 0.7;

        for (const result of searchResults) {
            const chunk = allChunks.find(c => c.id === result.ref);
            if (chunk) {
                const chunkSnippet = `--- Chunk: ${chunk.id}, Score: ${result.score.toFixed(4)} ---\n${chunk.text}\n\n`;
                if ((context + chunkSnippet).length <= MAX_CONTEXT_LENGTH) {
                    context += chunkSnippet;
                } else {
                    break;
                }
            }
        }

        if (!context) {
            UaLog.log("Nessun contesto pertinente trovato per la query.");
            return "Non sono riuscito a trovare informazioni pertinenti nei documenti per rispondere alla tua domanda.";
        }
        
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
    // #endregion
};