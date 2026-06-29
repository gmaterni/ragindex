/**
 * rag_engine.js - Motore RAG principale.
 *
 * Coordina la creazione della knowledge base, il recupero del contesto e
 * la generazione delle risposte tramite LLM. Gestisce il ciclo di vita del
 * Web Worker per le operazioni intensive.
 *
 * @module  rag_engine
 * @version 1.1.0
 * @date    2026-05-14
 * @author  Gemini CLI
 */

"use strict";

import { UaLog } from "./services/ualog3.js";
import { promptBuilder } from "./llm_prompts.js";
import { WORKER_PATH } from "./services/worker_path.js";
import { cleanLlmResponse } from "./services/history_utils.js";

// ============================================================================
// COSTANTI DI MODULO
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const DISTILLATION_TOKEN_LIMIT = 50;
const CONTEXT_PERCENTAGE = 0.7;
const DISTILLATION_TEMPERATURE = 0.1;
const GENERATION_TEMPERATURE = 0.7;
const GENERATION_MAX_TOKENS = 4000;
const REQUEST_TIMEOUT_SEC = 90;
const GENERATION_RANDOM_SEED = 42;
const RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504];

// ============================================================================
// STATO PRIVATO DEL MODULO
// ============================================================================

let _worker = null;
const _requestPromises = {};
let _client = null;
let _model = null;
let _promptSize = 0;

// ============================================================================
// FUNZIONI PRIVATE - Gestione Worker
// ============================================================================

/**
 * Inizializza il Web Worker per l'elaborazione RAG.
 * Configura gli handler per i messaggi e gli errori.
 *
 * @private
 */
const _initWorker = function () {
  if (_worker) {
    return;
  }

  try {
    const workerUrl = new URL(WORKER_PATH, import.meta.url).href;
    _worker = new Worker(workerUrl);
  } catch (e) {
    console.error("_initWorker: impossibile creare il Web Worker:", e);
    UaLog.log("ERRORE: Web Worker non disponibile, pipeline interrotta.");
    const workerErr = new Error("Web Worker non disponibile");
    Object.values(_requestPromises).forEach(function (p) {
      p.reject(workerErr);
    });
    for (const key in _requestPromises) {
      delete _requestPromises[key];
    }
    return;
  }

  /**
   * Handler per i messaggi dal worker.
   */
  _worker.onmessage = function (e) {
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
        const err = new Error(error);
        promise.reject(err);
      }
      delete _requestPromises[command];
    }
  };

  /**
   * Handler per gli errori del worker.
   */
  _worker.onerror = function (e) {
    console.error("_initWorker (error):", e);
    const errorMsg = "Errore critico nel worker RAG";
    const workerErr = new Error(errorMsg);

    Object.values(_requestPromises).forEach(function (p) {
      p.reject(workerErr);
    });

    // Pulizia totale dei riferimenti alle promesse
    for (const key in _requestPromises) {
      delete _requestPromises[key];
    }
  };
};

/**
 * Invia un comando al worker e restituisce una promessa.
 *
 * @param {string} command - Nome del comando da eseguire.
 * @param {any} data - Dati associati al comando.
 * @returns {Promise<any>} Risultato dell'operazione.
 * @private
 */
const _postCommandToWorker = function (command, data) {
  _initWorker();

  if (!_worker) {
    const err = new Error("Web Worker non disponibile");
    UaLog.log(`ERRORE: ${err.message} — comando "${command}" annullato.`);
    return Promise.reject(err);
  }

  const promise = new Promise(function (resolve, reject) {
    _requestPromises[command] = { resolve, reject };
    _worker.postMessage({ command, data });
  });

  return promise;
};

// ============================================================================
// FUNZIONI PRIVATE - Comunicazione LLM
// ============================================================================

/**
 * Distilla una query utente in termini di ricerca ottimizzati.
 *
 * @param {string} query - La domanda originale dell'utente.
 * @returns {Promise<string>} Termini di ricerca ottimizzati.
 * @private
 */
const _distillQuery = async function (query) {
  // Fail Fast
  if (!query) {
    console.error("_distillQuery: query mancante");
    return "";
  }

  UaLog.log("🔍 Ottimizzazione termini di ricerca...");

  const promptText = `
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

  const payload = {
    model: _model,
    messages: [{ role: "user", content: promptText }],
    temperature: DISTILLATION_TEMPERATURE,
    max_tokens: DISTILLATION_TOKEN_LIMIT,
  };

  const rr = await _sendRequest(_client, payload, "ERR_DISTILL_QUERY");

  let result = query;
  if (rr && rr.ok) {
    const data = rr.data;
    result = data.trim();
  } else {
    console.warn("_distillQuery: distillazione fallita, uso query originale.");
  }

  return result;
};

/**
 * Sospende l'esecuzione per un periodo specificato.
 *
 * @param {number} ms - Millisecondi di attesa.
 * @returns {Promise<void>}
 * @private
 */
const _sleep = function (ms) {
  const promise = new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
  return promise;
};

/**
 * Invia una richiesta al client LLM con gestione dei tentativi (retry).
 *
 * @param {Object} client - Istanza del client LLM.
 * @param {Object} payload - Payload della richiesta.
 * @param {string} errorTag - Etichetta per il logging degli errori.
 * @returns {Promise<Object|null>} Risultato della richiesta o null.
 * @private
 */
const _sendRequest = async function (client, payload, errorTag) {
  // Fail Fast
  if (!client || !payload) {
    console.error("_sendRequest: client o payload mancanti");
    return null;
  }

  let result = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const rr = await client.sendRequest(payload, REQUEST_TIMEOUT_SEC);

    if (!rr || rr.ok) {
      result = rr;
      break;
    }

    const err = rr.error;
    const errCode = err ? err.code : null;
    const attemptLog = `Attempt ${attempt}/${MAX_RETRIES}`;
    console.error(`_sendRequest.${errorTag} (${attemptLog}):`, err);

    const isRetryable = RETRYABLE_STATUS_CODES.includes(errCode);

    if (isRetryable) {
      const retryMsg = `Errore transitorio ${errCode}. Riprovo...`;
      UaLog.log(retryMsg);
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
 * Gestore del motore RAG.
 */
export const ragEngine = {
  /**
   * Inizializza il motore con le configurazioni LLM.
   *
   * @param {Object} client - Client LLM attivo.
   * @param {string} model - Nome del modello selezionato.
   * @param {number} promptSize - Dimensione massima del prompt in byte.
   */
  init: function (client, model, promptSize) {
    _client = client;
    _model = model;
    _promptSize = promptSize;

    _initWorker();
  },

  /**
   * Ferma il motore RAG e termina il worker.
   * Pulisce le promesse pendenti.
   */
  stop: function () {
    if (_worker) {
      _worker.terminate();
      _worker = null;

      const stopErr = new Error("Operazione interrotta dall'utente");
      Object.values(_requestPromises).forEach(function (p) {
        p.reject(stopErr);
      });

      for (const key in _requestPromises) {
        delete _requestPromises[key];
      }

      console.debug("ragEngine.stop: Worker terminato.");
    }
  },

  /**
   * Avvia la creazione della Knowledge Base dai documenti.
   *
   * @param {Array<Object>} documents - Lista di documenti {name, text}.
   * @returns {Promise<Object>} Risultato della creazione KB.
   */
  createKnowledgeBase: function (documents) {
    const promise = _postCommandToWorker("createKnowledgeBase", documents);
    return promise;
  },

  /**
   * Esegue solo chunking su documenti, senza creare indice Lunr.
   * Usato per aggiornamenti incrementali della KB.
   *
   * @param {Array<Object>} documents - Lista di documenti {name, text}.
   * @param {number} startDocIndex - Indice di partenza per ID univoci.
   * @returns {Promise<Object>} {parents: [], childEntries: [{docName, children, docIndex}]}.
   */
  chunkDocumentsAsync: function (documents, startDocIndex) {
    const promise = _postCommandToWorker("chunkDocuments", {
      documents: documents,
      startDocIndex: startDocIndex,
    });
    return promise;
  },

  /**
   * Costruisce il contesto rilevante per una query tramite ricerca Lunr.
   *
   * @param {string} serializedIndex - Indice Lunr serializzato in JSON.
   * @param {Array<Object>} allChunks - Tutti i frammenti (Parent Chunks).
   * @param {string} query - Termini di ricerca ottimizzati.
   * @returns {string} Stringa di contesto formattata.
   */
  buildContext: function (serializedIndex, allChunks, query) {
    // Fail Fast
    if (!serializedIndex || !allChunks || !query) {
      console.error("ragEngine.buildContext: input mancanti");
      return "";
    }

    const indexJson = JSON.parse(serializedIndex);
    const index = self.lunr.Index.load(indexJson);
    const searchResults = index.search(query);

    let context = "";
    const MAX_CONTEXT_LENGTH = _promptSize * CONTEXT_PERCENTAGE;
    const usedParentIds = new Set();

    for (const result of searchResults) {
      const parentId = result.ref.split("#")[0];

      if (!usedParentIds.has(parentId)) {
        usedParentIds.add(parentId);
        const chunk = allChunks.find(function (c) {
          const isMatch = c.id === parentId;
          return isMatch;
        });

        if (chunk) {
          const scoreStr = result.score.toFixed(4);
          const chunkId = chunk.id;
          const chunkText = chunk.text;
          const chunkSnippet = `--- Context: ${chunkId} (Score: ${scoreStr}) ---\n${chunkText}\n\n`;

          if (context.length + chunkSnippet.length <= MAX_CONTEXT_LENGTH) {
            context += chunkSnippet;
          } else {
            break;
          }
        }
      }
    }

    const finalContext = context;
    return finalContext;
  },

  /**
   * Ottiene il contesto ottimizzato tramite distillazione della query.
   *
   * @param {string} query - Query originale dell'utente.
   * @param {Object} kbData - Dati della KB {index, chunks}.
   * @param {Array} thread - Cronologia messaggi della conversazione.
   * @returns {Promise<string>} Contesto recuperato.
   */
  getOptimizedContext: async function (query, kbData, thread) {
    const isFirstQuestion = !thread || thread.length <= 1;

    if (!kbData || !kbData.index || !isFirstQuestion) {
      return "";
    }

    const searchTerms = await _distillQuery(query);
    UaLog.log("📄 Recupero informazioni pertinenti...");

    const context = ragEngine.buildContext(kbData.index, kbData.chunks, searchTerms);
    const result = context;
    return result;
  },

  /**
   * Genera una risposta tramite LLM dato il contesto e il thread.
   *
   * @param {string} context - Contesto recuperato dai documenti.
   * @param {Array} thread - Cronologia messaggi.
   * @returns {Promise<string>} Risposta generata e pulita.
   */
  generateResponse: async function (context, thread) {
    // TODO: Valore contesto prima di generare risposta
    console.debug("ragEngine.generateResponse - context length:", context ? context.length : 0);
    const messages = promptBuilder.answerPrompt(context, thread);

    console.debug("%c🚀 LLM REQUEST — %d messaggi", "color:#00bd97;font-weight:bold;font-size:1.1em", messages.length);

    messages.forEach(function(msg, i) {
      const role = msg.role;
      const color = role === "system" ? "#e82323" : role === "user" ? "#f6e602" : "#00bd97";
      const label = role.toUpperCase();
      console.info("%c[%s]%c %s", "color:" + color + ";font-weight:bold", label, "color:#e0e0e0", msg.content);
    });

    const payload = {
      model: _model,
      messages: messages,
      random_seed: GENERATION_RANDOM_SEED,
      temperature: GENERATION_TEMPERATURE,
      max_tokens: GENERATION_MAX_TOKENS,
    };

    console.debug("PAYLOAD:", JSON.stringify(payload, null, 2));

    UaLog.log("✍️ Generazione risposta LLM...");
    const rr = await _sendRequest(_client, payload, "ERR_GENERATE_RESPONSE");

    if (!rr || !rr.ok) {
      const errorToThrow = rr ? rr.error : new Error("Request failed without response");
      throw errorToThrow;
    }

    const rawData = rr.data;
    const cleanedData = cleanLlmResponse(rawData);
    console.info("%c[%s]%c %s", "color:#00bd97;font-weight:bold", "ASSISTANT", "color:#e0e0e0", cleanedData);
    const result = cleanedData;
    return result;
  },
};
