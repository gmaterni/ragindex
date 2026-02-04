/** @format */
"use strict";

import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";

export const BuildStateMgr = {
  // Inizializza lo stato per un nuovo processo di build
  initState(docNames) {
    const state = {
      status: "in_progress",
      docNames: docNames,
      currentDocIndex: 0,
      currentChunkIndex: 0,
    };
    UaDb.saveJson(DATA_KEYS.KEY_BUILD_STATE, state);
    return state;
  },

  // Carica lo stato corrente
  loadState() {
    return UaDb.readJson(DATA_KEYS.KEY_BUILD_STATE);
  },

  // Aggiorna e salva lo stato
  updateState(state) {
    UaDb.saveJson(DATA_KEYS.KEY_BUILD_STATE, state);
  },

  // Pulisce lo stato e tutti i dati intermedi
  clearState() {
    const state = this.loadState();
    if (state && state.docNames) {
      state.docNames.forEach(docName => {
        UaDb.delete(this.getChunkResultsKey(docName));
        UaDb.delete(this.getDocKbKey(docName));
      });
    }
    UaDb.delete(DATA_KEYS.KEY_BUILD_STATE);
  },

  // Funzioni per gestire i risultati intermedi dei chunk
  getChunkResultsKey: (docName) => `${DATA_KEYS.KEY_CHUNK_RES_PRE}${docName}`,

  saveChunkResults(docName, results) {
    UaDb.saveArray(this.getChunkResultsKey(docName), results);
  },

  loadChunkResults(docName) {
    return UaDb.readArray(this.getChunkResultsKey(docName));
  },

  // Funzioni per gestire le KB dei singoli documenti
  getDocKbKey: (docName) => `${DATA_KEYS.KEY_DOC_KB_PRE}${docName}`,

  saveDocKb(docName, docKb) {
    UaDb.save(this.getDocKbKey(docName), docKb);
  },

  loadDocKb(docName) {
    return UaDb.read(this.getDocKbKey(docName));
  },
};