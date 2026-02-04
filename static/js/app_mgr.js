/** @format */
"use strict";

import { LlmProvider } from "./llm_provider.js";
import { ragEngine } from "./rag_engine.js";

const tokensToBytes = (nk = 32) => {
  const nc = 1024 * nk * 3;
  const sp = nc * 0.1;
  const mlr = Math.trunc(nc + sp);
  return mlr;
};

// AAA Dexie - AppMgr ora gestisce inizializzazione asincrona
export const AppMgr = {
  configLLM: null,
  clientLLM: null,
  promptSize: 0,

  async initApp() {
    await LlmProvider.init();
    await this.initConfig();
  },

  async initConfig() {
    await LlmProvider.initConfig();
    this.configLLM = LlmProvider.getConfig();
    this.promptSize = tokensToBytes(this.configLLM.windowSize);
    console.info("=============================")
    console.info(`*** PROVIDER    : ${this.configLLM.provider}`);
    console.info(`*** MODEL       : ${this.configLLM.model}`);
    console.info(`*** WINDOW_SIZE : ${this.configLLM.windowSize}`);
    console.info(`*** PROMPT_SIZE : ${this.promptSize}`);
    console.info(`*** CLIENT     : ${this.configLLM.client}`);
    const model = this.configLLM.model;
    const promptSize = this.promptSize;
    this.clientLLM = LlmProvider.getclient();
    ragEngine.init(this.clientLLM, model, promptSize);
  },
};