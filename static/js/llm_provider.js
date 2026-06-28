/**
 * @fileoverview llm_provider.js - Gestione provider LLM
 * @description Fornisce funzioni per caricare e gestire provider e modelli LLM.
 *              Modulo specifico dell'applicazione RagIndex.
 * @module llm_provider
 * @version 0.1.0
 * @date 2026-04-30
 * @author Team Sviluppo
 */
"use strict";

import { UaJtfh } from "./services/uajtfh.js";
import { getApiKey, fetchApiKeys } from "./services/key_retriever.js";
import { GeminiClient, MistralClient, HuggingFaceClient, GroqClient, OpenAIClient, OpenRouterClient, CerebrasClient, SiliconFlowClient } from "./llmclient/index.js";
import { UaWindowAdm } from "./services/uawindow.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";

// ============================================================================
// COSTANTI DI MODULO
// ============================================================================

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Configurazione dei provider disponibili.
 * @type {Object}
 * @private
 */
let _PROVIDER_CONFIG = {};

/**
 * Istanze dei client LLM.
 * @type {Object}
 * @private
 */
const _CLIENTS = {};

/**
 * Configurazione default del provider.
 * @type {Object}
 * @private
 */
const _DEFAULT_PROVIDER_CONFIG = {
    provider: "gemini",
    model: "gemini-flash-latest",
    windowSize: 1024,
    client: "gemini"
};

// ============================================================================
// API PUBBLICA - PROVIDER_CONFIG getter
// ============================================================================

/**
 * Restituisce la configurazione dei provider.
 * @returns {Object} Configurazione dei provider
 * @public
 */
export const getProviderConfig = () => {
    return _PROVIDER_CONFIG;
};

/**
 * Oggetto PROVIDER_CONFIG per compatibilità con key_retriever.js
 */
export const PROVIDER_CONFIG = new Proxy({}, {
    get: (target, prop) => {
        return _PROVIDER_CONFIG[prop];
    },
    has: (target, prop) => {
        return prop in _PROVIDER_CONFIG;
    }
});

/**
 * Configurazione corrente del provider.
 * @type {Object}
 * @private
 */
const _config = {
    provider: "",
    model: "",
    windowSize: 0,
    client: ""
};

// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Controlla se una configurazione è valida.
 * @param {Object} config - Configurazione da validare.
 * @returns {boolean} True se valida.
 */
const _isValidConfig = function(config) {
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) {
        return false;
    }

    const { provider, model } = config;
    if (!provider || !_PROVIDER_CONFIG[provider]) {
        return false;
    }

    if (!model || !_PROVIDER_CONFIG[provider].models[model]) {
        return false;
    }

    const isValid = true;
    return isValid;
};

/**
 * Aggiorna il display del modello attivo.
 */
const _updateActiveModelDisplay = function() {
    const displayElement = document.getElementById("active-model-display");
    if (!displayElement) {
        return;
    }

    const displayText = `${_config.model} (${_config.windowSize}k)`;
    displayElement.textContent = displayText;
};

/**
 * Costruisce l'albero di selezione provider/modelli.
 * @returns {string} HTML dell'albero.
 */
const _buildTreeView = function() {
    const wnd = UaWindowAdm.get("provvider_id");
    const container = wnd.getElement();
    if (!container) {
        return "";
    }

    let treeHtml = `
      <div class="provider-tree-header">
        <span>Seleziona Modello</span>
        <button class="provider-tree-close-btn">&times;</button>
      </div>
      <ul class="provider-tree">
    `;

    for (const providerName in _PROVIDER_CONFIG) {
        const provider = _PROVIDER_CONFIG[providerName];
        const isActiveProvider = providerName === _config.provider;
        const icon = isActiveProvider ? "&#9660;" : "&#9658;";
        const activeClass = isActiveProvider ? "active" : "";

        treeHtml += `
        <li class="provider-node">
          <span class="${activeClass}" data-provider="${providerName}">
            ${icon} ${providerName}
          </span>
          <ul class="model-list" style="display: ${isActiveProvider ? "block" : "none"};">
      `;

        Object.keys(provider.models).forEach(function(modelName) {
            const modelData = provider.models[modelName];
            const isActiveModel = isActiveProvider && modelName === _config.model;
            const activeModelClass = isActiveModel ? "active" : "";

            treeHtml += `
          <li class="model-node ${activeModelClass}"
              data-provider="${providerName}"
              data-model="${modelName}">
            ${modelName} (${modelData.windowSize}k)
          </li>`;
        });

        treeHtml += `</ul></li>`;
    }

    treeHtml += `</ul>`;
    return treeHtml;
};

/**
 * Aggiunge gli event listener all'albero di selezione.
 */
const _addTreeEventListeners = function() {
    const wnd = UaWindowAdm.get("provvider_id");
    const container = wnd.getElement();
    if (!container) {
        return;
    }

    const closeBtn = container.querySelector(".provider-tree-close-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            LlmProvider.toggleTreeView();
        });
    }

    container.querySelectorAll(".provider-node > span").forEach(function(span) {
        span.addEventListener("click", function(e) {
            const modelList = e.target.nextElementSibling;
            const isOpening = modelList.style.display === "none";

            container.querySelectorAll(".model-list").forEach(function(ml) {
                ml.style.display = "none";
            });

            container.querySelectorAll(".provider-node > span").forEach(function(s) {
                const provName = s.dataset.provider;
                s.innerHTML = `&#9658; ${provName}`;
            });

            if (isOpening) {
                modelList.style.display = "block";
                const provName = e.target.dataset.provider;
                e.target.innerHTML = `&#9660; ${provName}`;
            }
        });
    });

    container.querySelectorAll(".model-node").forEach(function(node) {
        node.addEventListener("click", function(e) {
            const providerName = e.target.dataset.provider;
            const modelName = e.target.dataset.model;
            LlmProvider._setProviderAndModel(providerName, modelName);
        });
    });
};

/**
 * Crea o aggiorna un client LLM.
 * @param {string} clientName - Nome del client.
 * @param {string} apiKey - Chiave API.
 */
const _createClientInstance = function(clientName, apiKey) {
    if (!clientName) {
        console.error("LlmProvider._createClientInstance: clientName mancante");
        return;
    }

    switch (clientName) {
        case "gemini":
            _CLIENTS[clientName] = new GeminiClient(apiKey);
            break;
        case "mistral":
            _CLIENTS[clientName] = new MistralClient(apiKey);
            break;
        case "huggingface":
            _CLIENTS[clientName] = new HuggingFaceClient(apiKey);
            break;
        case "groq":
            _CLIENTS[clientName] = new GroqClient(apiKey);
            break;
        case "openai":
            _CLIENTS[clientName] = new OpenAIClient(apiKey);
            break;
        case "openrouter":
            _CLIENTS[clientName] = new OpenRouterClient(apiKey);
            break;
        case "cerebras":
            _CLIENTS[clientName] = new CerebrasClient(apiKey);
            break;
        case "siliconflow":
            _CLIENTS[clientName] = new SiliconFlowClient(apiKey);
            break;
        default:
            _CLIENTS[clientName] = null;
            console.warn(`LlmProvider._createClientInstance: client non supportato: ${clientName}`);
            break;
    }
};

// ============================================================================
// API PUBBLICA
// ============================================================================

/**
 * Gestore provider LLM.
 * @namespace
 */
export const LlmProvider = {

    /**
     * Stato visibilità albero di selezione.
     * @type {boolean}
     * @public
     */
    isTreeVisible: false,

    /**
     * ID container per UI.
     * @type {string}
     * @public
     */
    container_id: "provvider_id",

    /**
     * Aggiorna un client con una nuova chiave API.
     * @param {string} clientName - Nome del client da aggiornare
     * @public
     */
    updateClient: async (clientName) => {
        const apiKey = await getApiKey(clientName);
        _createClientInstance(clientName, apiKey);
        console.debug(`[LlmProvider] Client '${clientName}' aggiornato con nuova API Key.`);
    },

    /**
     * Carica la configurazione dei modelli dai file.
     * @returns {void}
     * @public
     */
    loadModels: async () => {
        if (Object.keys(_PROVIDER_CONFIG).length > 0) {
            return;
        }

        try {
            console.info("**** load models *******");
            //  lista providers
            const providers = ["gemini", "mistral", "huggingface", "groq", "openai", "openrouter", "cerebras", "siliconflow"];
            for (const p of providers) {
                try {
                    const response = await fetch(`./data/models/${p}.txt`);
                    if (response.ok) {
                        const text = await response.text();
                        const lines = text.split("\n").filter((line) => line.trim() !== "");
                        _PROVIDER_CONFIG[p] = {
                            client: p,
                            models: {}
                        };
                        lines.forEach((line) => {
                            const [name, windowSizeTokens] = line.split("|");
                            if (name && windowSizeTokens) {
                                // Convertiamo i token in "k" (es: 1048576 -> 1024)
                                _PROVIDER_CONFIG[p].models[name] = {
                                    windowSize: Math.round(parseInt(windowSizeTokens) / 1024)
                                };
                            }
                        });
                        if (Object.keys(_PROVIDER_CONFIG[p].models).length > 0) {
                            _CLIENTS[p] = null;
                        }
                    }
                } catch (e) {
                    console.warn(`Impossibile caricare i modelli per ${p}:`, e);
                }
            }
        } catch (error) {
            console.error("Eccezione durante il caricamento dei modelli:", error);
        }
    },

    /**
     * Inizializza il provider LLM.
     * @returns {void}
     * @public
     */
    init: async () => {
        await LlmProvider.loadModels();
        await fetchApiKeys();

        // Popola dinamicamente i client in base alla configurazione
        for (const providerName in _PROVIDER_CONFIG) {
            const provider = _PROVIDER_CONFIG[providerName];
            const clientName = provider.client;
            const apiKey = await getApiKey(clientName);
            if (!apiKey) continue;
            _createClientInstance(clientName, apiKey);
        }
    },

    /**
     * Inizializza la configurazione del provider.
     * @returns {void}
     * @public
     */
    initConfig: async () => {
        await LlmProvider.loadModels();

        const savedConfig = await UaDb.readJson(DATA_KEYS.KEY_PROVIDER);

        if (_isValidConfig(savedConfig)) {
            Object.assign(_config, savedConfig);
        } else {
            // Se savedConfig non è valido, reset al default
            Object.assign(_config, _DEFAULT_PROVIDER_CONFIG);
            await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, _config);
        }

        _updateActiveModelDisplay();
    },

    /**
     * Ottiene il client LLM corrente.
     * @returns {Object|null} Istanza del client o null
     * @public
     */
    getclient: function() {
        const clientName = _config.client;
        const result = _CLIENTS[clientName] || null;
        return result;
    },

    getConfig: function() {
        const config = _config;
        return config;
    },

    toggleTreeView: function() {
        const wnd = UaWindowAdm.create(LlmProvider.container_id);
        const container = wnd.getElement();
        if (!container) {
            return;
        }

        wnd.addClassStyle("provider-tree-container");
        LlmProvider.isTreeVisible = !LlmProvider.isTreeVisible;
        container.style.display = LlmProvider.isTreeVisible ? "block" : "none";

        if (LlmProvider.isTreeVisible) {
            const treeHtml = _buildTreeView();
            wnd.setHtml(treeHtml);
            _addTreeEventListeners();
        }
    },

    _setProviderAndModel: async function(provider, model) {
        if (!provider || !model) {
            console.error("LlmProvider._setProviderAndModel: parametri mancanti");
            return;
        }

        _config.provider = provider;
        _config.model = model;
        _config.windowSize = _PROVIDER_CONFIG[provider].models[model].windowSize;
        _config.client = _PROVIDER_CONFIG[provider].client;

        await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, _config);
        _updateActiveModelDisplay();

        if (LlmProvider.isTreeVisible) {
            const treeHtml = _buildTreeView();
            const wnd = UaWindowAdm.get(LlmProvider.container_id);
            wnd.setHtml(treeHtml);
            _addTreeEventListeners();
        }
        LlmProvider.toggleTreeView();
    },

    showConfig: async function() {
        const llmConfig = LlmProvider.getConfig();
        const jfh = UaJtfh();

        const prov = llmConfig.provider;
        const mod = llmConfig.model;
        const size = `${llmConfig.windowSize}k`;
        const cli = llmConfig.client;

        jfh.append('<div class="config-confirm">');
        jfh.append('<table class="table-data">');
        jfh.append(`<tr><td>Provider</td><td>${prov}</td></tr>`);
        jfh.append(`<tr><td>Modello</td><td>${mod}</td></tr>`);
        jfh.append(`<tr><td>Prompt Size</td><td>${size}</td></tr>`);
        jfh.append(`<tr><td>client</td><td>${cli}</td></tr>`);
        jfh.append("</table></div>");

        const { wnds } = await import("./app_ui.js");
        wnds.winfo.show(jfh.html());
    }
};
