/** @format */
"use strict";

// Core RAG Logic

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
    promptSize: 0,

    init(client, model, promptSize) {
        this.client = client;
        this.model = model;
        this.promptSize = promptSize;
    },

    // #region Core Logic (ne0, ne1, ne2, ne3)
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
        // Note: The index must be deserialized (lunr.Index.load) before being passed here.
        return index.search(query);
    },

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