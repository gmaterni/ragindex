/**
 * @fileoverview app_mgr.js - Gestore configurazione applicazione
 * @description Inizializza e gestisce la configurazione del provider LLM.
 *              Modulo specifico dell'applicazione RagIndex.
 * @module app_mgr
 */
"use strict";

import { LlmProvider } from "./llm_provider.js";
import { ragEngine } from "./rag_engine.js";

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Configurazione LLM corrente.
 * @type {Object|null}
 * @private
 */
let _configLLM = null;

/**
 * Client LLM corrente.
 * @type {Object|null}
 * @private
 */
let _clientLLM = null;

/**
 * Dimensione del prompt in byte.
 * @type {number}
 * @private
 */
let _promptSize = 0;

// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Converte token in byte.
 * @param {number} nk - Token in migliaia (default: 32)
 * @returns {number} Byte stimati
 * @private
 */
const _tokensToBytes = (nk = 32) => {
    const nc = 1024 * nk * 3;
    const sp = nc * 0.1;
    const mlr = Math.trunc(nc + sp);
    return mlr;
};

// ============================================================================
// API PUBBLICA
// ============================================================================

/**
 * Gestore principale dell'applicazione.
 * @namespace
 */
export const AppMgr = {

    /**
     * Inizializza l'applicazione.
     * @returns {void}
     * @public
     */
    initApp: async () => {
        await LlmProvider.init();
        await AppMgr.initConfig();
    },

    /**
     * Inizializza la configurazione LLM.
     * @returns {void}
     * @public
     */
    initConfig: async () => {
        await LlmProvider.initConfig();

        _configLLM = LlmProvider.getConfig();
        _promptSize = _tokensToBytes(_configLLM.windowSize);

        console.info("=============================");
        console.info(`*** PROVIDER    : ${_configLLM.provider}`);
        console.info(`*** MODEL       : ${_configLLM.model}`);
        console.info(`*** WINDOW_SIZE : ${_configLLM.windowSize}`);
        console.info(`*** PROMPT_SIZE : ${_promptSize}`);
        console.info(`*** CLIENT      : ${_configLLM.client}`);

        const model = _configLLM.model;
        const promptSize = _promptSize;

        _clientLLM = LlmProvider.getclient();
        ragEngine.init(_clientLLM, model, promptSize);
    },

    /**
     * Ottiene la configurazione LLM.
     * @returns {Object|null} Configurazione LLM
     * @public
     */
    getConfigLLM: () => {
        return _configLLM;
    },

    /**
     * Ottiene il client LLM.
     * @returns {Object|null} Client LLM
     * @public
     */
    getClientLLM: () => {
        return _clientLLM;
    },

    /**
     * Ottiene la dimensione del prompt.
     * @returns {number} Dimensione prompt in byte
     * @public
     */
    getPromptSize: () => {
        return _promptSize;
    }
};
