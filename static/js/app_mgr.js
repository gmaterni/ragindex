/** @format */
"use strict";

// import { getApiKey } from "./services/key_retriever.js";
import { LlmProvider } from "./llm_provider.js";
import { DocType } from "./services/doc_types.js";
import { ragEngine } from "./rag_engine.js";

const tokensToBytes = (nk = 32) => {
  const nc = 1024 * nk * 3;
  const sp = nc * 0.1;
  const mlr = Math.trunc(nc + sp);
  return mlr;
};

export const AppMgr = {
  configTD: null,
  configLLM: null,
  clientLLM: null,
  promptSize: 0,

  initApp() {
    LlmProvider.init()
    this.initConfig();
  },

  initConfig() {
    LlmProvider.initConfig();
    DocType.init();
    this.configTD = DocType.getConfig();
    this.configLLM = LlmProvider.getConfig();
    this.promptSize = tokensToBytes(this.configLLM.windowSize);
    console.info("=============================")
    console.info(`*** PROVIDER    : ${this.configLLM.provider}`);
    console.info(`*** MODEL       : ${this.configLLM.model}`);
    console.info(`*** WINDOW_SIZE : ${this.configLLM.windowSize}`);
    console.info(`*** PROMPT_SIZE : ${this.promptSize}`);
    console.info(`*** DOC_TYPE    : ${this.configTD.docType}`);
    console.info(`*** CLIENT     : ${this.configLLM.client}`);
    const model = this.configLLM.model;
    const promptSize = this.promptSize;
    const docType = this.configTD.docType;
    this.clientLLM = LlmProvider.getclient();
    ragEngine.init(this.clientLLM, model, promptSize, docType);
  },
};
