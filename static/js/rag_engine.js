import nlp from "./services/vendor/compromise.js";
import * as lunr from "./services/vendor/lunr.js";
import "./services/vendor/lunr.stemmer.support.js";
import "./services/vendor/lunr.it.js";

export const newRagEngine = {
    async ne0_chunkAndAnnotate(text) {
        const chunks = [];
        const sentences = nlp(text).sentences().out('array');

        let currentChunkText = "";
        let chunkIdCounter = 0;

        const MIN_CHUNK_SIZE = 300; // Caratteri minimi per un chunk
        const MAX_CHUNK_SIZE = 1500; // Caratteri massimi per un chunk

        for (const sentence of sentences) {
            if (currentChunkText.length + sentence.length + 1 > MAX_CHUNK_SIZE && currentChunkText.length >= MIN_CHUNK_SIZE) {
                // Se l'aggiunta della frase supera la dimensione massima e il chunk corrente è già abbastanza grande,
                // finalizza il chunk corrente e inizia uno nuovo.
                chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
                currentChunkText = sentence;
            } else {
                // Altrimenti, aggiungi la frase al chunk corrente.
                currentChunkText += (currentChunkText.length > 0 ? " " : "") + sentence;
            }
        }

        // Aggiungi l'ultimo chunk se non vuoto
        if (currentChunkText.length > 0) {
            chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
        }

        return chunks;
    },

    async _processChunk(chunkText, id) {
        const doc = nlp(chunkText);

        // Estrazione Keywords (Nomi, Verbi, Aggettivi)
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        const adjectives = doc.adjectives().out('array');
        const keywords = [...new Set([...nouns, ...verbs, ...adjectives])]
            .map(word => word.toLowerCase())
            .filter(word => word.length > 2); // Filtra parole troppo corte

        // Estrazione Entità (Persone, Luoghi, Organizzazioni)
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

    ne1_buildIndex(chunks) {
        const idx = lunr(function () {
            this.use(lunr.it); // Abilita il supporto per la lingua italiana
            this.ref('id');
            this.field('body');

            chunks.forEach(chunk => {
                const fullText = `${chunk.text} ${chunk.keywords.join(" ")} ${chunk.entities.join(" ")}`;
                this.add({ id: chunk.id, body: fullText });
            });
        });
        return idx;
    },

/** @format */
"use strict";

// Core RAG Logic
import nlp from "../services/vendor/compromise.js";
import * as lunr from "../services/vendor/lunr.js";
import "../services/vendor/lunr.stemmer.support.js";
import "../services/vendor/lunr.it.js";

// App Integration Dependencies
import { UaLog } from "./services/ualog3.js";
import { DocsMgr } from "./services/docs_mgr.js";
import { idbMgr } from "./services/idb_mgr.js";
import { promptBuilder } from "./llm_prompts.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";

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
    docType: null,
    promptSize: 0,
    history: [],
    
    // Stored Knowledge Base
    chunks: [],
    index: null,

    // #region Public Interface (imitating original rag_engine)
    init(client, model, promptSize, docType) {
        this.client = client;
        this.model = model;
        this.promptSize = promptSize;
        this.docType = docType;
    },

    async buildKnBase() {
        UaLog.log("Inizio nuova elaborazione Knowledge Base (lessicale)...");
        const docNames = DocsMgr.names();
        let allChunks = [];

        for (let i = 0; i < docNames.length; i++) {
            const docName = docNames[i];
            UaLog.log(` Elaborazione documento ${i + 1}/${docNames.length}: ${docName}`);
            const docText = DocsMgr.doc(i);
            const docChunks = await this.ne0_chunkAndAnnotate(docText);
            allChunks.push(...docChunks);
        }

        UaLog.log(`Creazione dell'indice per ${allChunks.length} chunk...`);
        const index = this.ne1_buildIndex(allChunks);

        // Serializza l'indice per la memorizzazione
        const serializedIndex = JSON.stringify(index);

        await idbMgr.create(DATA_KEYS.KEY_KNBASE_CHUNKS, allChunks);
        await idbMgr.create(DATA_KEYS.KEY_KNBASE_INDEX, serializedIndex);

        UaLog.log("Knowledge Base lessicale creata con successo!");
        return true;
    },

    async buildContext(query) {
        await this._loadKnBaseFromDb();
        if (!this.index || this.chunks.length === 0) {
             UaLog.log("Knowledge Base non trovata. Costruiscila prima di iniziare.");
             return ["Knowledge Base non trovata. Costruiscila prima di iniziare."];
        }

        UaLog.log("Ricerca lessicale dei chunk pertinenti...");
        const searchResults = this.ne2_search(this.index, query);

        await idbMgr.delete(DATA_KEYS.KEY_THREAD);
        UaDb.save(DATA_KEYS.KEY_QUERY, query);
        
        this.history = [`question: ${query}`];
        
        const first_answer = await this.ne3_generateResponse(query, searchResults, this.chunks, this.history);
        
        this.history.push(`answer: ${first_answer}`);
        await idbMgr.create(DATA_KEYS.KEY_THREAD, this.history);
        UaDb.save(DATA_KEYS.KEY_RESPONSE, first_answer);
        
        return this.history;
    },

    async runConversation(query) {
        if (!this.index || this.chunks.length === 0) {
            await this._loadKnBaseFromDb();
            if (!this.index) {
                UaLog.log("Knowledge Base non trovata per la conversazione.");
                return ["Knowledge Base non trovata."];
            }
        }
        
        this.history = await idbMgr.read(DATA_KEYS.KEY_THREAD) || [];
        this.history.push(`question: ${query}`);

        // Nella nuova architettura, la ricerca viene fatta solo all'inizio.
        // Per le conversazioni successive, si potrebbe decidere di fare una nuova ricerca
        // o continuare con il contesto implicito nella cronologia.
        // Per ora, continuiamo a usare il contesto implicito.
        const searchResults = this.ne2_search(this.index, query); // Eseguiamo comunque una ricerca per coerenza
        
        const answer = await this.ne3_generateResponse(query, searchResults, this.chunks, this.history);
        
        this.history.push(`answer: ${answer}`);
        await idbMgr.create(DATA_KEYS.KEY_THREAD, this.history);
        
        return this.history;
    },
    // #endregion

    // #region Internal Logic (ne0, ne1, ne2, ne3)
    async ne0_chunkAndAnnotate(text) {
        const chunks = [];
        const sentences = nlp(text).sentences().out('array');
        let currentChunkText = "";
        let chunkIdCounter = this.chunks ? this.chunks.length : 0;

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

    ne2_search(index, query) {
        return index.search(query);
    },

    async ne3_generateResponse(query, searchResults, allChunks, history) {
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
        
        const fullHistory = [...history, `question: ${query}`];
        const messages = promptBuilder.answerPrompt(context, fullHistory);
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
    },
    
    async _loadKnBaseFromDb() {
        UaLog.log("Caricamento Knowledge Base da DB...");
        const serializedIndex = await idbMgr.read(DATA_KEYS.KEY_KNBASE_INDEX);
        const chunks = await idbMgr.read(DATA_KEYS.KEY_KNBASE_CHUNKS);

        if (serializedIndex && chunks) {
            this.index = lunr.Index.load(JSON.parse(serializedIndex));
            this.chunks = chunks;
            UaLog.log("Knowledge Base caricata.");
            return true;
        }
        UaLog.log("Nessuna Knowledge Base trovata nel DB.");
        return false;
    }
    // #endregion
};

