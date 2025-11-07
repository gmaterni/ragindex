/** @format */
"use strict";

import { UaLog } from "./services/ualog3.js";
import { DocsMgr } from "./services/docs_mgr.js";
import { idbMgr } from "./services/idb_mgr.js";
import { promptBuilder } from "./llm_prompts.js";
import { splitText } from "./text_splitter.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";
import { BuildStateMgr } from "./services/build_state_mgr.js";

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
        // AAA log.info request
        // const s = JSON.stringify(payload.messages, null, 2);
        // console.info("======= query:\n", s);
        // console.info("======= aanswer:\n", rr.data);

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

export const ragEngine = {
    docType: null,
    model: null,
    client: null,
    promptSize: 0,
    history: [],
    init(client, model, promptSize, docType) {
        this.client = client;
        this.model = model;
        this.promptSize = promptSize;
        this.docType = docType;
    },

    async buildKnBase() {
        let state = BuildStateMgr.loadState();
        const docNames = DocsMgr.names();

        if (state && state.status === "in_progress") {
            UaLog.log("Ripresa elaborazione interrotta...");
        } else {
            UaLog.log("Inizio nuova elaborazione Knowledge Base...");
            BuildStateMgr.clearState(); // Pulisce stati precedenti incompleti
            state = BuildStateMgr.initState(docNames);
        }

        const knBaseLst = [];

        // Carica le KB dei documenti già completati
        for (let i = 0; i < state.currentDocIndex; i++) {
            const docName = state.docNames[i];
            const knBaseDoc = BuildStateMgr.loadDocKb(docName);
            if (knBaseDoc) {
                knBaseLst.push(`DOCUMENTO: ${docName}\n${knBaseDoc}`);
            }
        }

        for (let i = state.currentDocIndex; i < docNames.length; i++) {
            const docName = docNames[i];
            state.currentDocIndex = i;
            BuildStateMgr.updateState(state);

            UaLog.log(`Elaborazione documento ${i + 1}/${docNames.length}: ${docName}`);

            const doc = DocsMgr.doc(i);
            // TODO
            console.info("prompt size:", this.promptSize);
            const docChunks = splitText(doc, this.promptSize, this.promptSize + 1000);
            // const docChunks = splitText(doc, 100000, 100000 + 1000);
            let docExtractions = BuildStateMgr.loadChunkResults(docName);
            if (docExtractions.length > 0) {
                UaLog.log(`Trovati ${docExtractions.length} chunk già processati per ${docName}.`);
                state.currentChunkIndex = docExtractions.length;
            } else {
                state.currentChunkIndex = 0;
            }

            for (let j = state.currentChunkIndex; j < docChunks.length; j++) {
                const chunk = docChunks[j];
                state.currentChunkIndex = j;
                BuildStateMgr.updateState(state);

                UaLog.log(`Processing chunk ${j + 1}/${docChunks.length} di ${docName}`);
                const chunkExtraction = await this._extractDataChunk(chunk);
                docExtractions.push(chunkExtraction);
                BuildStateMgr.saveChunkResults(docName, docExtractions);
            }

            UaLog.log(`Unificazione chunk per ${docName}...`);
            const knBaseDoc = await this._unifyContents(docExtractions);
            BuildStateMgr.saveDocKb(docName, knBaseDoc);
            knBaseLst.push(`DOCUMENTO: ${docName}\n${knBaseDoc}`);

            // Resetta l'indice dei chunk per il prossimo documento
            state.currentChunkIndex = 0;
            BuildStateMgr.updateState(state);
        }

        UaLog.log("Unificazione finale di tutte le Knowledge Base...");
        const knBase = await this._unifyContents(knBaseLst);

        await idbMgr.create(DATA_KEYS.KEY_KNBASE, knBase);
        UaLog.log("Knowledge Base creata con successo!");

        BuildStateMgr.clearState();
        return true;
    },

    async _extractDataChunk(chunk) {
        const messages = promptBuilder.extractionPrompt(chunk, this.docType);
        // console.debug("_extractDataChunkt messages;\n", messages);
        const payload = {
            model: this.model,
            messages: messages,
            random_seed: 42,
            temperature: 0.0,
            max_tokens: 4000,
        };
        const rr = await sendRequest(this.client, payload, "ERR1");
        if (!rr || !rr.ok) {
            throw rr ? rr.error : new Error("Request failed without response");
        }
        return rr.data;
    },

    async _unifyContents(lst) {
        const content = lst.join("\n\n---\n\n");
        const messages = promptBuilder.unificationPrompt(content, this.docType);
        // console.debug("_unifyContent messages;\n", messages);
        const payload = {
            model: this.model,
            messages: messages,
            random_seed: 42,
            temperature: 0.0,
            max_tokens: 16000,
        };
        const rr = await sendRequest(this.client, payload, "ERR2");
        if (!rr || !rr.ok) {
            throw rr ? rr.error : new Error("Request failed without response");
        }
        return rr.data;
    },

    async _extractContext(query) {
        const knBase = await idbMgr.read(DATA_KEYS.KEY_KNBASE);
        const messages = promptBuilder.extractorPrompt(knBase, query, this.docType);
        // console.debug("_extractContext messages;\n", messages);
        const payload = {
            model: this.model,
            messages: messages,
            random_seed: 42,
            temperature: 0.0,
            max_tokens: 16000,
        };
        UaLog.log("Select context.");
        const rr = await sendRequest(this.client, payload, "ERR3");
        if (!rr.ok) throw rr.error;
        const rsp = rr.data;
        return rsp;
    },

    async _getAnswer(context, history) {
        const messages = promptBuilder.answerPrompt(context, history);
        // AAA log messages
        // console.debug("_getAnswer messages;\n", messages);
        const payload = {
            model: this.model,
            messages: messages,
            random_seed: 42,
            temperature: 0.7,
            max_tokens: 9000,
        };
        UaLog.log("Domanda");
        const rr = await sendRequest(this.client, payload, "ERR4");
        if (!rr.ok) throw rr.error;
        const rsp = rr.data;
        return rsp;
    },

    async buildContext(query) {
        await idbMgr.delete(DATA_KEYS.KEY_THREAD);
        await idbMgr.delete(DATA_KEYS.KEY_CONTEXT);
        let context = await this._extractContext(query);
        await idbMgr.create(DATA_KEYS.KEY_CONTEXT, context);
        UaDb.save(DATA_KEYS.KEY_QUERY, query);
        this.history = [];
        this.history.push(`question: ${query}`);
        const first_answer = await this._getAnswer(context, this.history);
        this.history.push(`answer: ${first_answer}`);
        await idbMgr.create(DATA_KEYS.KEY_THREAD, this.history);
        UaDb.save(DATA_KEYS.KEY_RESPONSE, first_answer);
        return this.history;
    },

    async runConversation(query) {
        let context = await idbMgr.read(DATA_KEYS.KEY_CONTEXT);
        if (!context) {
            this.history = await idbMgr.read(DATA_KEYS.KEY_THREAD);
            if (!this.history) this.history = [];
            this.history.push(`question: ${query}`);
            const answer = await this._getAnswer(context, this.history);
            this.history.push(`answer: ${answer}`);
            await idbMgr.create(DATA_KEYS.KEY_THREAD, this.history);
            return this.history;
        }
        this.history = await idbMgr.read(DATA_KEYS.KEY_THREAD);
        if (!this.history) this.history = [];
        this.history.push(`question: ${query}`);
        const answer = await this._getAnswer(context, this.history);
        this.history.push(`answer: ${answer}`);
        await idbMgr.create(DATA_KEYS.KEY_THREAD, this.history);
        return this.history;
    },
};
