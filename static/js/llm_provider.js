/**
 * llm_provider.js - Gestione stato provider LLM e cache client.
 *
 * Modulo puro: nessuna UI, nessun riferimento al DOM.
 * Si occupa solo di:
 *   1. Caricare modelli da file (loadModels)
 *   2. Mantenere provider/modello attivo in memoria
 *   3. Mantenere una singola istanza client + API key in variabili dirette
 *   4. Persistenza su IndexedDB (salva/carica configurazione)
 *   5. Fornire getClient() come punto d'ingresso unico per le richieste LLM
 *
 * UI (tree view, toggle, showConfig) in app_ui.js.
 *
 * @module llm_provider
 * @version 0.3.0
 * @date    2026-06-29
 */

"use strict";

import { getApiKey, fetchApiKeys } from "./services/key_retriever.js";
import {
    GeminiClient, MistralClient, GroqClient,
    OpenRouterClient, CerebrasClient, SiliconFlowClient
} from "./llmclient/index.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";

// ============================================================================
// COSTANTI
// ============================================================================

// Non c'è un config di default — se nessuna configurazione è stata
// salvata in precedenza, _activeProvider/_activeModel restano vuoti
// e l'utente deve selezionare manualmente un provider.

const SUPPORTED_PROVIDERS = [
    "gemini", "mistral", "groq",
    "openrouter", "cerebras", "siliconflow"
];

// ============================================================================
// STATO PRIVATO
// ============================================================================

/** @type {Object<string, {client: string, models: Object}>} */
let _providerModels = {};

/** @type {Object|null} Istanza client per il provider attivo. */
let _activeClient = null;

/** @type {string} Provider per cui _activeClient è stato creato. */
let _activeClientProvider = "";

/** @type {string} API key usata per creare _activeClient. */
let _activeApiKey = "";

/** @type {string} */
let _activeProvider = "";

/** @type {string} */
let _activeModel = "";

/** @type {number} */
let _windowSize = 0;

// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Crea una nuova istanza client per il provider specificato.
 * Imposta _activeClient, _activeClientProvider e _activeApiKey.
 * @param {string} clientName
 * @param {string} apiKey
 */
const _createClientInstance = function(clientName, apiKey) {
    if (!clientName) {
        console.error("_createClientInstance: clientName mancante");
        return;
    }

    switch (clientName) {
        case "gemini":
            _activeClient = new GeminiClient(apiKey);
            break;
        case "mistral":
            _activeClient = new MistralClient(apiKey);
            break;
        case "groq":
            _activeClient = new GroqClient(apiKey);
            break;
        case "openrouter":
            _activeClient = new OpenRouterClient(apiKey);
            break;
        case "cerebras":
            _activeClient = new CerebrasClient(apiKey);
            break;
        case "siliconflow":
            _activeClient = new SiliconFlowClient(apiKey);
            break;
        default:
            _activeClient = null;
            console.warn(`_createClientInstance: client non supportato: ${clientName}`);
            break;
    }

    if (_activeClient) {
        _activeClientProvider = clientName;
        _activeApiKey = apiKey;
    }
};

/**
 * Controlla se una configurazione salvata è ancora valida.
 * @param {Object} config
 * @returns {boolean}
 */
const _isValidConfig = function(config) {
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) {
        return false;
    }

    const { provider, model } = config;
    if (!provider || !_providerModels[provider]) {
        return false;
    }

    if (!model || !_providerModels[provider].models[model]) {
        return false;
    }

    return true;
};

const _setDefaultConfig = function() {
    const defaultProvider = "gemini";
    if (_providerModels[defaultProvider]) {
        const models = Object.keys(_providerModels[defaultProvider].models);
        if (models.length > 0) {
            const ok = LlmProvider.setActive(defaultProvider, models[0]);
            if (ok) {
                console.debug("Configurazione non trovata: impostato default su Gemini.");
            } else {
                console.error("_setDefaultConfig: impossibile impostare default Gemini.");
            }
        }
    }
};

// ============================================================================
// API PUBBLICA — providerModels
// ============================================================================

/**
 * Restituisce la mappa provider → modelli caricata da file.
 * @returns {Object}
 */
export const getProviderConfig = function() {
    return _providerModels;
};

/**
 * Proxy per compatibilità con key_retriever.js.
 * Permette accesso dinamico del tipo _PROVIDER_CONFIG[providerName].
 */
export const PROVIDER_CONFIG = new Proxy({}, {
    get: (target, prop) => {
        return _providerModels[prop];
    },
    has: (target, prop) => {
        return prop in _providerModels;
    }
});

// ============================================================================
// API PUBBLICA — LlmProvider
// ============================================================================

export const LlmProvider = {

    // ========================================================================
    // INIZIALIZZAZIONE
    // ========================================================================

    /**
     * Carica la configurazione dei modelli dai file su disco.
     * @param {boolean} [force=false] - Se true, ricarica da file anche se già caricati.
     * @returns {Promise<void>}
     */
    loadModels: async (force = false) => {
        if (force || Object.keys(_providerModels).length > 0) {
            _providerModels = {};
        }

        for (const p of SUPPORTED_PROVIDERS) {
            try {
                const response = await fetch(`./data/models/${p}.txt`);
                if (response.ok) {
                    const text = await response.text();
                    const lines = text.split("\n").filter(function(line) {
                        return line.trim() !== "";
                    });

                    _providerModels[p] = {
                        client: p,
                        models: {}
                    };

                    lines.forEach(function(line) {
                        const [name, windowSizeTokens] = line.split("|");
                        if (name && windowSizeTokens) {
                            const tokens = Math.round(parseInt(windowSizeTokens, 10) / 1024);
                            _providerModels[p].models[name] = {
                                windowSize: tokens
                            };
                        }
                    });
                }
            } catch (e) {
                console.warn(`Impossibile caricare i modelli per ${p}:`, e);
            }
        }
    },

    /**
     * Inizializzazione rapida: carica modelli e API keys.
     * @returns {Promise<void>}
     */
    init: async () => {
        await LlmProvider.loadModels();
        await fetchApiKeys();
    },

    // ========================================================================
    // STATO ATTIVO
    // ========================================================================

    /**
     * Restituisce l'oggetto configurazione corrente (provider, model, windowSize, client).
     * @returns {Object}
     */
    getConfig: function() {
        const config = {
            provider: _activeProvider,
            model: _activeModel,
            windowSize: _windowSize
        };
        return config;
    },

    /**
     * API key attualmente in uso.
     * @returns {string}
     */
    getApiKey: function() {
        return _activeApiKey;
    },

    /**
     * Imposta provider e modello attivi in memoria.
     * Invalida il client se il provider cambia.
     * NON salva su DB, NON tocca la UI.
     * @param {string} provider
     * @param {string} model
     * @returns {boolean} true se impostato correttamente
     */
    setActive: function(provider, model) {
        if (!provider || !model) {
            console.error("LlmProvider.setActive: parametri mancanti");
            return false;
        }

        const providerData = _providerModels[provider];
        if (!providerData) {
            console.error(`LlmProvider.setActive: provider sconosciuto: ${provider}`);
            return false;
        }

        const modelData = providerData.models[model];
        if (!modelData) {
            console.error(`LlmProvider.setActive: modello sconosciuto: ${model}`);
            return false;
        }

        const providerChanged = provider !== _activeProvider;

        _activeProvider = provider;
        _activeModel = model;
        _windowSize = modelData.windowSize;

        if (providerChanged) {
            _activeClient = null;
            _activeClientProvider = "";
            _activeApiKey = "";
        }

        return true;
    },

    // ========================================================================
    // CLIENT
    // ========================================================================

    /**
     * Restituisce il client LLM per il provider attivo.
     * Crea una nuova istanza se _activeClient è null o se
     * il provider attivo è cambiato dopo l'ultima creazione.
     * @returns {Promise<Object|null>}
     */
    getClient: async function() {
        if (!_activeProvider) {
            console.error("LlmProvider.getClient: nessun provider attivo");
            return null;
        }

        const apiKey = await getApiKey(_activeProvider);
        if (!apiKey) {
            console.error(`LlmProvider.getClient: chiave API mancante per ${_activeProvider}`);
            _activeClient = null;
            _activeClientProvider = "";
            _activeApiKey = "";
            return null;
        }

        _createClientInstance(_activeProvider, apiKey);
        return _activeClient;
    },

    /**
     * Invalida il client attivo se corrisponde al provider specificato.
     * Chiamato da key_retriever.js quando una chiave viene aggiunta o attivata.
     * @param {string} clientName
     */
    updateClient: async (clientName) => {
        if (_activeProvider === clientName) {
            _activeClient = null;
            _activeClientProvider = "";
            _activeApiKey = "";
        }
    },

    // ========================================================================
    // PERSISTENZA
    // ========================================================================

    /**
     * Carica la configurazione salvata da IndexedDB e la applica.
     * Se nessuna configurazione valida trovata, imposta il primo modello di Gemini
     * come default (scenario primo avvio).
     * @returns {Promise<void>}
     */
    loadConfig: async function() {
        await LlmProvider.loadModels();

        const savedConfig = await UaDb.readJson(DATA_KEYS.KEY_PROVIDER);

        if (_isValidConfig(savedConfig)) {
            _activeProvider = savedConfig.provider;
            _activeModel = savedConfig.model;
            _windowSize = savedConfig.windowSize;
        } else {
            _setDefaultConfig();
        }
    },

    /**
     * Salva la configurazione corrente su IndexedDB.
     * @returns {Promise<void>}
     */
    saveConfig: async function() {
        const config = LlmProvider.getConfig();
        await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, config);
    }
};
