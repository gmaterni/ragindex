/** @format */
"use strict";

import van from "./services/vendor/van.mjs"; // AAA VanJS
import { getApiKey, fetchApiKeys } from "./services/key_retriever.js";
import { GeminiClient } from './llmclient/gemini_client.js';
import { GroqClient } from './llmclient/groq_client.js';
import { MistralClient } from './llmclient/mistral_client.js';
import { HuggingFaceClient } from './llmclient/huggingface_client.js';
import { OpenRouterClient } from './llmclient/openrouter_client.js';
import { wnds } from "./app_ui.js";
import { UaWindowAdm } from "./services/uawindow.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { UaDb } from "./services/uadb.js";

export let PROVIDER_CONFIG = {};
export let CLIENTS = {};

// Caricamento dinamico della configurazione modelli
try {
  const response = await fetch("./data/models.json");
  if (response.ok) {
    PROVIDER_CONFIG = await response.json();
    // Inizializza CLIENTS in base ai provider disponibili in PROVIDER_CONFIG
    for (const providerName in PROVIDER_CONFIG) {
      const provider = PROVIDER_CONFIG[providerName];
      CLIENTS[provider.client] = null;
    }
  } else {
    console.error("Errore: Impossibile caricare ./data/models.json");
  }
} catch (error) {
  console.error("Eccezione durante il caricamento di models.json:", error);
}

const DEFAULT_PROVIDER_CONFIG = {
  provider: "gemini",
  model: "gemini-2.5-flash-lite",
  windowSize: 600,
  client: "gemini",
};

export const LlmProvider = {
  isTreeVisible: false,
  config: {
    provider: "",
    model: "",
    windowSize: 0,
    client: "",
  },
  container_id: "provvider_id",
  async init() {
    await fetchApiKeys();
    
    // Popola dinamicamente i client in base alla configurazione
    for (const providerName in PROVIDER_CONFIG) {
      const provider = PROVIDER_CONFIG[providerName];
      const clientName = provider.client;
      const apiKey = await getApiKey(clientName);
      
      switch(clientName) {
        case "gemini":
          CLIENTS[clientName] = new GeminiClient(apiKey);
          break;
        case "groq":
          CLIENTS[clientName] = new GroqClient(apiKey);
          break;
        case "mistral":
          CLIENTS[clientName] = new MistralClient(apiKey);
          break;
        case "huggingface":
          CLIENTS[clientName] = new HuggingFaceClient(apiKey);
          break;
        case "openrouter":
          CLIENTS[clientName] = new OpenRouterClient(apiKey);
          break;
        default:
          // Per client sconosciuti, impostiamo null ma non generiamo errore
          CLIENTS[clientName] = null;
          console.warn(`Client non supportato: ${clientName}`);
          break;
      }
    }
  },
  // AAA Dexie - initConfig ora è asincrono
  async initConfig() {
    const savedConfig = await UaDb.readJson(DATA_KEYS.KEY_PROVIDER);
    if (this._isValidConfig(savedConfig)) {
      this.config = savedConfig;
    } else {
      if (savedConfig && savedConfig.provider)
        alert("Errore nella configurazione provider/model");
      this.config = { ...DEFAULT_PROVIDER_CONFIG };
      await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, this.config);
    }
    this._updateActiveModelDisplay();
  },

  _isValidConfig(config) {
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) return false;
    const { provider, model, client } = config;
    if (!provider || !PROVIDER_CONFIG[provider]) return false;
    if (!model || !PROVIDER_CONFIG[provider].models[model]) return false;
    if (typeof client !== "string" || !CLIENTS[client]) return false;
    return true;
  },

  getclient() {
    const currentclientName = this.config.client;
    return CLIENTS[currentclientName] || null;
  },
  // Visualizzazione tree
  toggleTreeView() {
    const wnd = UaWindowAdm.create(this.container_id);
    const container = wnd.getElement();
    if (!container) return;
    wnd.addClassStyle("provider-tree-container");
    this.isTreeVisible = !this.isTreeVisible;
    container.style.display = this.isTreeVisible ? "block" : "none";
    if (this.isTreeVisible) {
      this._buildTreeView();
    }
  },
  getConfig() {
    return this.config;
  },
  _buildTreeView() {
    const wnd = UaWindowAdm.get(this.container_id);
    const container = wnd.getElement()
    if (!container) return;
    let treeHtml = `
      <div class="provider-tree-header">
        <span>Seleziona Modello</span>
        <button class="provider-tree-close-btn">&times;</button>
      </div>
      <ul class="provider-tree">
    `;
    for (const providerName in PROVIDER_CONFIG) {
      const provider = PROVIDER_CONFIG[providerName];
      const isActiveProvider = providerName === this.config.provider;
      treeHtml += `
        <li class="provider-node">
          <span class="${isActiveProvider ? "active" : ""}" data-provider="${providerName}">
            ${isActiveProvider ? "&#9660;" : "&#9658;"} ${providerName}
          </span>
          <ul class="model-list" style="display: ${isActiveProvider ? "block" : "none"};">
      `;
      Object.keys(provider.models).forEach((modelName) => {
        const modelData = provider.models[modelName];
        const isActiveModel = isActiveProvider && modelName === this.config.model;
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
    wnd.setHtml(treeHtml);
    this._addTreeEventListeners();
  },

  _addTreeEventListeners() {
    const container = UaWindowAdm.get(this.container_id).getElement();
    if (!container) return;
    const closeBtn = container.querySelector(".provider-tree-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.toggleTreeView());
    }
    // Click sui provider (per aprire/chiudere)
    container.querySelectorAll(".provider-node > span").forEach((span) => {
      span.addEventListener("click", (e) => {
        const modelList = e.target.nextElementSibling;
        const isOpening = modelList.style.display === "none";
        // Chiudi tutti i menu
        container.querySelectorAll(".model-list").forEach((ml) => (ml.style.display = "none"));
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
        this._setProviderAndModel(providerName, modelName);
      });
    });
  },

  async _setProviderAndModel(provider, model) {
    this.config = {
      provider: provider,
      model: model,
      windowSize: PROVIDER_CONFIG[provider].models[model].windowSize,
      client: PROVIDER_CONFIG[provider].client,
    };

    // AAA Dexie - Salvataggio asincrono
    await UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, this.config);

    // Aggiorna il display
    this._updateActiveModelDisplay();

    // Ricostruisci il tree per aggiornare gli stati attivi
    if (this.isTreeVisible) {
      this._buildTreeView();
    }

    // Chiudi il tree
    this.toggleTreeView();
  },

  _updateActiveModelDisplay() {
    const displayElement = document.getElementById("active-model-display");
    if (displayElement) {
      displayElement.textContent = `${this.config.model} (${this.config.windowSize}k)`;
    }
  },

  showConfig() {
    const llmConfig = LlmProvider.getConfig();

    // AAA VanJS - Inizio refactoring
    const { div, table, tr, td } = van.tags;

    const configTable = div({ class: "config-confirm" },
      table({ class: "table-data" },
        tr(td("Provider"), td(llmConfig.provider)),
        tr(td("Modello"), td(llmConfig.model)),
        tr(td("Prompt Size"), td(`${llmConfig.windowSize}k`)),
        tr(td("client"), td(llmConfig.client))
      )
    );

    // Passiamo l'elemento DOM direttamente a wnds.winfo.show
    // Nota: wnds.winfo deve supportare sia stringhe che elementi DOM
    wnds.winfo.show(configTable);
    // AAA VanJS - Fine refactoring
  },
};