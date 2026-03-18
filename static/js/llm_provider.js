/**
 * @fileoverview llm_provider.js - Gestione provider LLM
 * @description Fornisce funzioni per caricare e gestire provider e modelli LLM.
 *              Modulo specifico dell'applicazione RagIndex.
 * @module llm_provider
 */
"use strict";

import { UaJtfh } from "./services/uajtfh.js";
import { getApiKey, fetchApiKeys } from "./services/key_retriever.js";
import { GeminiClient } from "./llmclient/gemini_client.js";
import { MistralClient } from "./llmclient/mistral_client.js";
import { OpenRouterClient } from "./llmclient/openrouter_client.js";
import { GroqClient } from "./llmclient/groq_client.js";
import { UaWindowAdm } from "./services/uawindow.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";

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
    model: "gemini-2.5-flash-lite",
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
 * @param {Object} config - Configurazione da validare
 * @returns {boolean} True se la configurazione è valida
 * @private
 */
const _isValidConfig = (config) => {
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) {
        return false;
    }

    const { provider, model, client } = config;

    if (!provider || !_PROVIDER_CONFIG[provider]) {
        return false;
    }

    if (!model || !_PROVIDER_CONFIG[provider].models[model]) {
        return false;
    }

    return true;
};

/**
 * Aggiorna il display del modello attivo.
 * @private
 */
const _updateActiveModelDisplay = () => {
    const displayElement = document.getElementById("active-model-display");

    if (displayElement) {
        displayElement.textContent = `${_config.model} (${_config.windowSize}k)`;
    }
};

/**
 * Costruisce l'albero di selezione provider/modelli.
 * @returns {string} HTML dell'albero
 * @private
 */
const _buildTreeView = () => {
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

        treeHtml += `
        <li class="provider-node">
          <span class="${isActiveProvider ? "active" : ""}" data-provider="${providerName}">
            ${isActiveProvider ? "&#9660;" : "&#9658;"} ${providerName}
          </span>
          <ul class="model-list" style="display: ${isActiveProvider ? "block" : "none"};">
      `;

        Object.keys(provider.models).forEach((modelName) => {
            const modelData = provider.models[modelName];
            const isActiveModel = isActiveProvider && modelName === _config.model;

            treeHtml += `
          <li class="model-node ${isActiveModel ? "active" : ""}"
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
 * @private
 */
const _addTreeEventListeners = () => {
    const container = UaWindowAdm.get("provvider_id").getElement();

    if (!container) {
        return;
    }

    const closeBtn = container.querySelector(".provider-tree-close-btn");

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            LlmProvider.toggleTreeView();
        });
    }

    // Click sui provider (per aprire/chiudere)
    container.querySelectorAll(".provider-node > span").forEach((span) => {
        span.addEventListener("click", (e) => {
            const modelList = e.target.nextElementSibling;
            const isOpening = modelList.style.display === "none";

            // Chiudi tutti i menu
            container.querySelectorAll(".model-list").forEach((ml) => {
                ml.style.display = "none";
            });

            container.querySelectorAll(".provider-node > span").forEach((s) => {
                s.innerHTML = `&#9658; ${s.dataset.provider}`;
            });

            // Se stavo aprendo, mostra il menu
            if (isOpening) {
                modelList.style.display = "block";
                e.target.innerHTML = `&#9660; ${e.target.dataset.provider}`;
            }
        });
    });

    // Click sui modelli (per selezionare)
    container.querySelectorAll(".model-node").forEach((node) => {
        node.addEventListener("click", (e) => {
            const providerName = e.target.dataset.provider;
            const modelName = e.target.dataset.model;

            LlmProvider._setProviderAndModel(providerName, modelName);
        });
    });
};

/**
 * Crea o aggiorna un client LLM.
 * @param {string} clientName - Nome del client
 * @param {string} apiKey - Chiave API
 * @private
 */
const _createClientInstance = (clientName, apiKey) => {
    switch (clientName) {
        case "gemini":
            _CLIENTS[clientName] = new GeminiClient(apiKey);
            break;
        case "mistral":
            _CLIENTS[clientName] = new MistralClient(apiKey);
            break;
        case "openrouter":
            _CLIENTS[clientName] = new OpenRouterClient(apiKey);
            break;
        case "groq":
            _CLIENTS[clientName] = new GroqClient(apiKey);
            break;
        default:
            _CLIENTS[clientName] = null;
            console.warn(`Client non supportato: ${clientName}`);
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
        console.log(`[LlmProvider] Client '${clientName}' aggiornato con nuova API Key.`);
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
            // AAA lista providers
            // const providers = ["gemini", "mistral", "openrouter", "groq"];
            const providers = ["gemini", "mistral", "openrouter"];
            for (const p of providers) {
                try {
                    const response = await fetch(`./data/models/${p}_wnd.txt`);
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
    getclient: () => {
        const currentClientName = _config.client;
        const client = _CLIENTS[currentClientName] || null;
        return client;
    },

    /**
     * Ottiene la configurazione corrente.
     * @returns {Object} Configurazione corrente
     * @public
     */
    getConfig: () => {
        return _config;
    },

    /**
     * Mostra/nasconde l'albero di selezione provider.
     * @public
     */
    toggleTreeView: () => {
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

    /**
     * Imposta provider e modello.
     * @param {string} provider - Nome provider
     * @param {string} model - Nome modello
     * @returns {void}
     * @private
     */
    _setProviderAndModel: async (provider, model) => {
        _config.provider = provider;
        _config.model = model;
        _config.windowSize = _PROVIDER_CONFIG[provider].models[model].windowSize;
        _config.client = _PROVIDER_CONFIG[provider].client;

        await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, _config);

        // Aggiorna il display
        _updateActiveModelDisplay();

        // Ricostruisci il tree per aggiornare gli stati attivi
        if (LlmProvider.isTreeVisible) {
            const treeHtml = _buildTreeView();
            const wnd = UaWindowAdm.get(LlmProvider.container_id);
            wnd.setHtml(treeHtml);
            _addTreeEventListeners();
        }

        // Chiudi il tree
        LlmProvider.toggleTreeView();
    },

    /**
     * Mostra la configurazione corrente.
     * @returns {void}
     * @public
     */
    showConfig: async () => {
        const llmConfig = LlmProvider.getConfig();

        const jfh = UaJtfh();
        jfh.append('<div class="config-confirm">');
        jfh.append('<table class="table-data">');
        jfh.append(`<tr><td>Provider</td><td>${llmConfig.provider}</td></tr>`);
        jfh.append(`<tr><td>Modello</td><td>${llmConfig.model}</td></tr>`);
        jfh.append(`<tr><td>Prompt Size</td><td>${llmConfig.windowSize}k</td></tr>`);
        jfh.append(`<tr><td>client</td><td>${llmConfig.client}</td></tr>`);
        jfh.append("</table></div>");

        // Passiamo l'elemento HTML direttamente a wnds.winfo.show
        const { wnds } = await import("./app_ui.js");
        wnds.winfo.show(jfh.html());
    }
};
