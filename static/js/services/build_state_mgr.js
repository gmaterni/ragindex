/** @format */
"use strict";

import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";

export const BuildStateMgr = {
  // Inizializza lo stato per un nuovo processo di build
  async initState(docNames) {
    const state = {
      status: "in_progress",
      docNames: docNames,
      currentDocIndex: 0,
      currentChunkIndex: 0,
    };
    await UaDb.saveJson(DATA_KEYS.KEY_BUILD_STATE, state);
    return state;
  },

  // Carica lo stato corrente
  async loadState() {
    return await UaDb.readJson(DATA_KEYS.KEY_BUILD_STATE);
  },

  // Aggiorna e salva lo stato
  async updateState(state) {
    await UaDb.saveJson(DATA_KEYS.KEY_BUILD_STATE, state);
  },

  // Pulisce lo stato e tutti i dati intermedi
  async clearState() {
    const state = await this.loadState();
    if (state && state.docNames) {
      for (const docName of state.docNames) {
        await UaDb.delete(this.getChunkResultsKey(docName));
        await UaDb.delete(this.getDocKbKey(docName));
      }
    }
    await UaDb.delete(DATA_KEYS.KEY_BUILD_STATE);
  },

  // Funzioni per gestire i risultati intermedi dei chunk
  getChunkResultsKey: (docName) => `${DATA_KEYS.KEY_CHUNK_RES_PRE}${docName}`,

  async saveChunkResults(docName, results) {
    await UaDb.saveArray(this.getChunkResultsKey(docName), results);
  },

  async loadChunkResults(docName) {
    return await UaDb.readArray(this.getChunkResultsKey(docName));
  },

  // Funzioni per gestire le KB dei singoli documenti
  getDocKbKey: (docName) => `${DATA_KEYS.KEY_DOC_KB_PRE}${docName}`,

  async saveDocKb(docName, docKb) {
    await UaDb.save(this.getDocKbKey(docName), docKb);
  },

  async loadDocKb(docName) {
    return await UaDb.read(this.getDocKbKey(docName));
  },
};