"use strict";

import { UaLog } from "./services/ualog3.js";
import { promptBuilder } from "./llm_prompts.js";
import { WORKER_PATH } from "./services/worker_path.js";

// #region Gestione Worker
let worker;
let requestPromises = {};

function initWorker() {
    worker = new Worker(WORKER_PATH);
    worker.onmessage = (e) => {
        const { status, command, result, error, progress } = e.data;

        if (status === 'progress') {
            UaLog.log(progress);
            return;
        }

        const promise = requestPromises[command];
        if (promise) {
            if (status === 'complete') {
                promise.resolve(result);
            } else if (status === 'error') {
                promise.reject(new Error(error));
            }
            delete requestPromises[command];
        }
    };
    worker.onerror = (e) => {
        console.error("Errore generico nel Web Worker:", e);
        Object.values(requestPromises).forEach(p => p.reject(new Error("Errore nel worker")));
        requestPromises = {};
    };
}

function postCommandToWorker(command, data) {
    return new Promise((resolve, reject) => {
        requestPromises[command] = { resolve, reject };
        worker.postMessage({ command, data });
    });
}
// #endregion

// #region LLM Communication
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendRequest = async (client, payload, errorTag) => {
    // logMessages(payload); 
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const rr = await client.sendRequest(payload, 90);
        if (!rr) return rr;

        if (rr.ok) return rr;
        const err = rr.error;
        console.error("****\n", `${errorTag} (Attempt ${attempt}/${MAX_RETRIES}):`, err);
        if (err && err.code === 413) {
            await alert("Prompt troppo grande per questo Modello");
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
    return null;
};

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

    /**
     * Azione 1: Chiama il worker per creare la Knowledge Base.
     */
    createKnowledgeBase(documents) {
        return postCommandToWorker('createKnowledgeBase', documents);
    },

    /**
     * Azione 2 (parte 1): Costruisce la stringa di contesto.
     * Operazione veloce, eseguita nel thread principale.
     */
    buildContext(serializedIndex, allChunks, query) {
        const index = lunr.Index.load(JSON.parse(serializedIndex));
        const searchResults = index.search(query);

        let context = "";
        const MAX_CONTEXT_LENGTH = this.promptSize * 0.7;

        // Parent-Child Logic:
        // L'indice contiene riferimenti ai "Child" (frasi), ma noi vogliamo recuperare
        // i "Parent" (interi paragrafi) per il contesto.
        const usedParentIds = new Set();

        for (const result of searchResults) {
            // result.ref è nel formato "parentID#childID" (es. "d0p5#3")
            // A noi serve "d0p5".
            const parentId = result.ref.split('#')[0];

            if (!usedParentIds.has(parentId)) {
                usedParentIds.add(parentId);

                // 'allChunks' contiene i Parent Chunks
                const chunk = allChunks.find(c => c.id === parentId);
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

    async generateResponse(query, context, thread) {
        const messages = promptBuilder.answerPrompt(context, thread);
        // //////////////////////
        // AAA debug messges
        // console.debug("\n*** nessages ****\n")
        // for (const msg of messages) {
        //     console.debug("** role:", msg.role);
        //     console.debug("** content:", msg.content);
        //     console.debug("--------");
        // }
        // console.debug("============")
        /////////////////
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
