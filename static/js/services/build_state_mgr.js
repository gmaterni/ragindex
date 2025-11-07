/** @format */
"use strict";

import { UaDb } from "./uadb.js";

const STATE_KEY = "knbase_build_state";
const CHUNK_RESULTS_PREFIX = "knbase_chunks_";
const DOC_KB_PREFIX = "knbase_doc_kb_";

export const BuildStateMgr = {
  // Inizializza lo stato per un nuovo processo di build
  initState(docNames) {
    const state = {
      status: "in_progress",
      docNames: docNames,
      currentDocIndex: 0,
      currentChunkIndex: 0,
    };
    UaDb.saveJson(STATE_KEY, state);
    return state;
  },

  // Carica lo stato corrente
  loadState() {
    return UaDb.readJson(STATE_KEY);
  },

  // Aggiorna e salva lo stato
  updateState(state) {
    UaDb.saveJson(STATE_KEY, state);
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
    UaDb.delete(STATE_KEY);
  },

  // Funzioni per gestire i risultati intermedi dei chunk
  getChunkResultsKey: (docName) => `${CHUNK_RESULTS_PREFIX}${docName}`,

  saveChunkResults(docName, results) {
    UaDb.saveArray(this.getChunkResultsKey(docName), results);
  },

  loadChunkResults(docName) {
    return UaDb.readArray(this.getChunkResultsKey(docName));
  },

  // Funzioni per gestire le KB dei singoli documenti
  getDocKbKey: (docName) => `${DOC_KB_PREFIX}${docName}`,

  saveDocKb(docName, docKb) {
    UaDb.save(this.getDocKbKey(docName), docKb);
  },

  loadDocKb(docName) {
    return UaDb.read(this.getDocKbKey(docName));
  },
};