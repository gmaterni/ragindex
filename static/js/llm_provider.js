/** @format */
"use strict";

import { getApiKey } from "./services/key_retriever.js";
import { GeminiClient } from './llmclient/gemini_client.js';
import { GroqClient } from './llmclient/groq_client.js';
import { MistralClient } from './llmclient/mistral_client.js';
// import { HuggingFaceClient } from './llmclient/huggingface_client.js';
import { UaDb } from "./services/uadb.js";
import { wnds } from "./app_ui.js";
import { DocType } from "./services/doc_types.js";
import { UaWindowAdm } from "./services/uawindow.js";
import { DATA_KEYS } from "./services/data_keys.js";

const CLIENTS = {
  "gemini": null,
  "groq": null,
  "mistral": null,
};

export const PROVIDER_CONFIG = {
  mistral: {
    client: "mistral",
    models: {
      "mistral-large-latest": { windowSize: 128 },
      "mistral-medium-latest": { windowSize: 128 },
      "mistral-small-latest": { windowSize: 128 },
      "open-mixtral-8x7b": { windowSize: 32 },
    },
  },
  gemini: {
    client: "gemini",
    models: {
      "gemini-2.0-flash": { windowSize: 200 },
      "gemini-2.5-flash": { windowSize: 200 },
      "gemini-2.5-flash-lite": { windowSize: 200 }
    },
  },
  groq: {
    client: "groq",
    models: {
      "llama-3.1-8b-instant": { windowSize: 8 },          // Meta, 131,072 tokens  
      "llama-3.3-70b-versatile": { windowSize: 8 },       // Meta, 131,072 tokens
      "meta-llama/llama-guard-4-12b": { windowSize: 8 },  // Meta, 131,072 tokens
      "qwen/qwen3-32b": { windowSize: 8 },                    // Alibaba Cloud, 131,072 tokens
    },
  }
};

const DEFAULT_PROVIDER_CONFIG = {
  provider: "gemini",
  model: "gemini-2.5-flash-lite",
  windowSize: 200,
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
  init() {
    let apikey = getApiKey("gemini")
    CLIENTS.gemini = new GeminiClient(apikey)
    apikey = getApiKey("groq")
    CLIENTS.groq = new GroqClient(apikey)
    apikey = getApiKey("mistral")
    CLIENTS.mistral = new MistralClient(apikey)
  },
  initConfig() {
    const savedConfig = UaDb.readJson(DATA_KEYS.KEY_PROVIDER);
    if (this._isValidConfig(savedConfig)) {
      this.config = savedConfig;
    } else {
      if (!!savedConfig.provider)
        alert("Errore nella configurazione provider/model");
      this.config = { ...DEFAULT_PROVIDER_CONFIG };
      UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, this.config);
    }
    this._updateActiveModelDisplay();
  },

  _isValidConfig(config) {
    if (!config || typeof config !== "object") return false;
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

  _setProviderAndModel(provider, model) {
    this.config = {
      provider: provider,
      model: model,
      windowSize: PROVIDER_CONFIG[provider].models[model].windowSize,
      client: PROVIDER_CONFIG[provider].client,
    };

    // Salva nel database
    UaDb.saveJson(DATA_KEYS.KEY_PROVIDER, this.config);

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
      // AAA displayElement.textContent = `${this.config.provider} / ${this.config.model} (${this.config.windowSize}k)`;
      displayElement.textContent = `${this.config.model} (${this.config.windowSize}k)`;
    }
  },

  showConfig() {
    const llmConfig = LlmProvider.getConfig();
    const docTypeConfig = DocType.getConfig();

    const html = `
      <div class="config-confirm">
          <table class="table-data">
                <tr><td>Provider</td><td>${llmConfig.provider}</td></tr>
                <tr><td>Modello</td><td>${llmConfig.model}</td></tr>
                <tr><td>Prompt Size</td><td>${llmConfig.windowSize}k</td></tr>
                <tr><td>client</td><td>${llmConfig.client}</td></tr>
                <tr><td>Tipo Documento</td><td>${docTypeConfig.docType}</td></tr>
          </table>
      </div>
    `;
    wnds.winfo.show(html);
  },
};
