"use strict";

import { UaWindowAdm } from "./services/uawindow.js";
import van from "./services/vendor/van.mjs"; // AAA VanJS
import { UaLog } from "./services/ualog3.js";
import { help0_html, help1_html, help2_html } from "./services/help.js";
import { docuentUploader } from "./uploader.js";
import { AppMgr } from "./app_mgr.js";
import { UaDb } from "./services/uadb.js";
import { DocsMgr } from "./services/docs_mgr.js";
import { LlmProvider } from "./llm_provider.js";
import { textFormatter, messages2html, messages2text } from "./history_utils.js";
import { ragEngine } from "./rag_engine.js";
import { DATA_KEYS, getDescriptionForKey } from "./services/data_keys.js";
import { idbMgr } from "./services/idb_mgr.js";
import { requestGet } from "./services/http_request.js";
import { cleanDoc } from "./text_cleaner.js"
import { addApiKey } from "./services/key_retriever.js";

// AAA VanJS - Helper per gestire stringhe HTML (per Readme/Quickstart)
const htmlDiv = (content, className) => van.tags.div({ class: className, innerHTML: content });

const Spinner = {
  show: () => {
    const p = document.querySelector("#id-text-out .div-text");
    p.classList.add("spinner-bg");
    const spinner = document.getElementById("spinner");
    spinner.classList.add("show-spinner");
    spinner.addEventListener("click", Spinner.stop);
  },
  hide: () => {
    const p = document.querySelector("#id-text-out .div-text");
    p.classList.remove("spinner-bg");
    const spinner = document.getElementById("spinner");
    spinner.classList.remove("show-spinner");
    spinner.removeEventListener("click", Spinner.stop);
  },
  stop: async () => {
    if (await confirm("Confermi Cancellazione Richiesta?")) {
      AppMgr.clientLLM.cancelRequest();
      Spinner.hide();
    }
  },
};

const WaitSpinner = {
  show: () => document.getElementById("spinner-wait").classList.add("show-spinner-wait"),
  hide: () => document.getElementById("spinner-wait").classList.remove("show-spinner-wait"),
};

const errorDumps = (err) => {
  const s = JSON.stringify(err, null, 2);
  return s === "{}" ? `${err}` : s;
};

const WndPre = (id) => {
  return {
    w: UaWindowAdm.create(id),
    show(s, delAll = true) {
      const { div, button, pre } = van.tags;
      if (delAll) wnds.closeAll();
      this.w.drag().setZ(12);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, 1);
      
      this.w.setHtml(div({ class: "window-text" },
        div({ class: "btn-wrapper" },
          button({ class: "btn-copy wcp tt-left", "data-tt": "Copia", onclick: () => this.copy() }, 
            van.tags.svg({ class: "copy-icon", viewBox: "0 0 20 24" }, 
              van.tags.path({ d: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" })
            )
          ),
          button({ class: "btn-close wcl tt-left", "data-tt": "chiudi", onclick: () => this.close() }, "X")
        ),
        pre({ class: "pre-text" }, s)
      ));
      this.w.show();
    },
    close() { this.w.close(); },
    async copy() {
      const t = this.w.getElement().querySelector(".pre-text").textContent;
      try { await navigator.clipboard.writeText(t); } catch (err) { console.error(err); }
    }
  };
};

const WndDiv = (id) => {
  return {
    w: UaWindowAdm.create(id),
    show(s, delAll = true) {
      const { div, button } = van.tags;
      if (delAll) wnds.closeAll();
      this.w.drag().setZ(12);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, 1);
      
      this.w.setHtml(div({ class: "window-text" },
        div({ class: "btn-wrapper" },
          button({ class: "btn-copy wcp tt-left", "data-tt": "Copia", onclick: () => this.copy() }, 
            van.tags.svg({ class: "copy-icon", viewBox: "0 0 20 24" }, 
              van.tags.path({ d: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" })
            )
          ),
          button({ class: "btn-close wcl tt-left", "data-tt": "chiudi", onclick: () => this.close() }, "X")
        ),
        htmlDiv(s, "div-text")
      ));
      this.w.show();
    },
    close() { this.w.close(); },
    async copy() {
      const t = this.w.getElement().querySelector(".div-text").textContent;
      try { await navigator.clipboard.writeText(t); } catch (err) { console.error(err); }
    }
  };
};

const WndInfo = (id) => {
  return {
    w: UaWindowAdm.create(id),
    showe(s) { this.show(van.tags.pre({ class: "pre-text" }, s)); },
    show(s, delAll = true) {
      const { div, button } = van.tags;
      if (delAll) wnds.closeAll();
      this.w.drag().setZ(11);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, -1);

      this.w.setHtml(div({ class: "window-info" },
        div({ class: "btn-wrapper" },
          button({ class: "btn-close tt-left", onclick: () => this.close() }, "X")
        ),
        div({ class: "div-info" }, typeof s === 'string' ? van.tags.div({ innerHTML: s }) : s)
      ));
      this.w.show();
    },
    close() { this.w.close(); }
  };
};

export const wnds = {
  wdiv: null, wpre: null, winfo: null,
  init() {
    this.wdiv = WndDiv("id_w0");
    this.wpre = WndPre("id_w1");
    this.winfo = WndInfo("id_info");
  },
  closeAll() {
    UaWindowAdm.close("id_w0");
    UaWindowAdm.close("id_w1");
    UaWindowAdm.close("id_info");
  },
};

export const Commands = {
  init() { },
  help() { wnds.wdiv.show(help0_html); },
  upload() { docuentUploader.open(); },
  log() { UaLog.toggle(); },
  providerSettings() { LlmProvider.toggleTreeView(); },
};

const setResponseHtml = (html) => {
  const p = document.querySelector("#id-text-out .div-text");
  p.innerHTML = html;
  p.scrollTop = p.scrollHeight;
};

export const TextInput = {
  init() { this.inp = document.querySelector(".text-input"); },
  handleEnter(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.continueConversation();
    }
  },
  clear() { this.inp.value = ""; this.inp.focus(); },

  async createKnowledge() {
    UaLog.log("Creazione Knowledge Base...");
    const docNames = await DocsMgr.names(); // AAA Dexie - await
    const docs = [];
    for(let i=0; i<docNames.length; i++) {
        const t = await DocsMgr.doc(i); // AAA Dexie - await
        docs.push({ name: docNames[i], text: t });
    }
    const validDocuments = docs.filter(doc => doc.text && doc.text.trim() !== "");
    
    if (validDocuments.length === 0) return alert("Nessun documento valido.");
    if (!await confirm(`Crea KB da ${validDocuments.length} documenti?`)) return;
    
    WaitSpinner.show();
    setTimeout(async () => {
      try {
        const { chunks, serializedIndex: chunksIndex } = await ragEngine.createKnowledgeBase(validDocuments);
        await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, chunks);
        await idbMgr.create(DATA_KEYS.PHASE1_INDEX, chunksIndex);
        await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
        await updateActiveKbDisplay(); // AAA Dexie - await
        alert(`KB creata: ${chunks.length} frammenti.`);
      } catch (error) { alert(error); }
      finally { WaitSpinner.hide(); }
    }, 50);
  },

  async startConversation() {
    const query = this.inp.value.trim();
    if (!query) return alert("Inserisci una query.");
    const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
    const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
    if (!index) return alert("Esegui Azione 1.");
    
    Spinner.show();
    setTimeout(async () => {
      try {
        await idbMgr.delete(DATA_KEYS.KEY_THREAD);
        const context = ragEngine.buildContext(index, chunks, query);
        await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, context);
        await AppMgr.initConfig(); // AAA Dexie - await
        const thread = [{ role: 'user', content: query }];
        const answer = await ragEngine.generateResponse(query, context, thread);
        thread.push({ role: 'assistant', content: answer });
        await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
        await showHtmlThread(); // AAA Dexie - await
        this.clear();
      } catch (error) { alert(error); }
      finally { Spinner.hide(); }
    }, 50);
  },

  async continueConversation() {
    const query = this.inp.value.trim();
    if (!query) return alert("Inserisci una query.");
    Spinner.show();
    setTimeout(async () => {
      try {
        let thread = await idbMgr.read(DATA_KEYS.KEY_THREAD) || [];
        let context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT) || "";
        thread.push({ role: 'user', content: query });
        await AppMgr.initConfig(); // AAA Dexie - await
        const answer = await ragEngine.generateResponse(query, context, thread);
        thread.push({ role: 'assistant', content: answer });
        await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
        await showHtmlThread(); // AAA Dexie - await
        this.clear();
      } catch (error) { alert(error); }
      finally { Spinner.hide(); }
    }, 50);
  },
};

export const TextOutput = {
  init() { this.copyBtn = document.querySelector(".copy-output"); },
  async copy() {
    const pre = document.querySelector("#id-text-out .div-text");
    if (pre.textContent.trim().length < 2) return;
    try {
      await navigator.clipboard.writeText(textFormatter(pre.textContent));
      pre.classList.add("copied");
      setTimeout(() => pre.classList.remove("copied"), 2000);
    } catch (err) { console.error(err); }
  },
  async clearHistory() {
    if (await confirm("Nuova conversazione?")) {
      await idbMgr.delete(DATA_KEYS.KEY_THREAD);
      setResponseHtml("");
    }
  },
  async clearHistoryContext() {
    if (await confirm("Nuovo Contesto & Conversazione?")) {
      await idbMgr.delete(DATA_KEYS.PHASE2_CONTEXT);
      await idbMgr.delete(DATA_KEYS.KEY_THREAD);
      await idbMgr.delete(DATA_KEYS.PHASE0_CHUNKS);
      await idbMgr.delete(DATA_KEYS.PHASE1_INDEX);
      await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
      await updateActiveKbDisplay(); // AAA Dexie - await
      setResponseHtml("");
    }
  }
};

export const getTheme = async () => {
  const t = await UaDb.read(DATA_KEYS.KEY_THEME); // AAA Dexie - await
  document.body.classList.toggle("theme-light", t === "light");
  document.body.classList.toggle("theme-dark", t !== "light");
};

const setTheme = async (theme) => {
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme !== "light");
  await UaDb.save(DATA_KEYS.KEY_THEME, theme); // AAA Dexie - await
};

const showReadme = () => wnds.wdiv.show(help1_html);
const showQuickstart = () => wnds.wdiv.show(help2_html);

const viewConversation = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD);
  if (lst) wnds.wpre.show(messages2text(lst));
  else alert("Nessuna conversazione attiva.");
};

export const showHtmlThread = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD);
  if (lst) setResponseHtml(messages2html(lst));
};

const viewContext = async () => {
  const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
  if (context) wnds.wpre.show(context);
  else alert("Nessun contesto.");
};

// AAA VanJS - Stato reattivo globale
export const activeKbState = van.state("Nessuna KB attiva");

export const updateActiveKbDisplay = async () => {
  const el = document.getElementById("active-kb-display");
  if (!el) return;

  const chunksExist = await idbMgr.exists(DATA_KEYS.PHASE0_CHUNKS);
  const indexExist = await idbMgr.exists(DATA_KEYS.PHASE1_INDEX);

  if (!chunksExist || !indexExist) {
    activeKbState.val = "Nessuna KB attiva";
    await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
  } else {
    const savedName = await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
    activeKbState.val = savedName || "BASE CORRENTE";
  }

  if (!el.dataset.vanjs) {
    van.add(el, () => `KB: ${activeKbState.val}`);
    el.dataset.vanjs = "true";
    el.childNodes[0].textContent = "";
  }
};

const saveKnowledgeBase = async () => {
  const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
  const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
  if (!chunks || !index) return alert("Crea prima una KB.");
  let name = await prompt("Nome per archiviare la KB:");
  if (name?.trim()) {
    name = name.replace(/\s+/g, '_');
    await idbMgr.create(`${DATA_KEYS.KEY_KB_PRE}${name}`, { chunks, serializedIndex: index });
    await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, name); // AAA Dexie - await
    await updateActiveKbDisplay(); // AAA Dexie - await
    alert(`Knowledge Base archiviata come: ${name}`);
  }
};

const saveConversation = async () => {
  const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
  const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
  if (!thread || thread.length === 0) return alert("Nessuna conversazione attiva.");
  let name = await prompt("Nome per archiviare la Conversazione:");
  if (name?.trim()) {
    name = name.replace(/\s+/g, '_');
    await idbMgr.create(`${DATA_KEYS.KEY_CONVO_PRE}${name}`, { context, thread });
    alert(`Conversazione archiviata come: ${name}`);
  }
};

// AAA VanJS - Riproduzione ESATTA di elencoArtefatti
const elencoArtefatti = async (prefix, title, loadHandler) => {
  const keys = await idbMgr.selectKeys(prefix);
  const { div, h4, table, thead, tbody, tr, th, td, button, p } = van.tags;

  const content = div({ class: "data-dialog" },
    h4(`Gestione ${title}`),
    keys.length > 0 ? table({ class: "table-data" },
      thead(tr(th("Nome"), th("Azioni"))),
      tbody(keys.map(key => {
        const dName = key.slice(prefix.length);
        return tr(
          td(dName),
          td(
            button({ class: "btn-load-item btn-success", onclick: async () => { await loadHandler(key); wnds.winfo.close(); } }, "Carica"),
            button({ class: "btn-delete-item btn-danger", style: "margin-left:5px", onclick: async () => {
              if (await confirm(`Confermi l'eliminazione di '${dName}'?`)) {
                await idbMgr.delete(key);
                const currentActive = await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
                if (prefix === DATA_KEYS.KEY_KB_PRE && currentActive === dName) await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // AAA Dexie - await
                await updateActiveKbDisplay(); wnds.winfo.close(); elencoArtefatti(prefix, title, loadHandler);
              }
            }}, "Elimina")
          )
        );
      }))
    ) : p(`Nessun dato di tipo '${title}' trovato.`)
  );
  wnds.winfo.show(content);
};

const loadKnowledgeBase = async (key) => {
  const data = await idbMgr.read(key);
  if (data?.chunks && data.serializedIndex) {
    await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, data.chunks);
    await idbMgr.create(DATA_KEYS.PHASE1_INDEX, data.serializedIndex);
    await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, key.slice(DATA_KEYS.KEY_KB_PRE.length)); // AAA Dexie - await
    await updateActiveKbDisplay(); alert("KB caricata.");
  } else alert("Errore KB non valida.");
};

const loadConversation = async (key) => {
  const data = await idbMgr.read(key);
  if (data?.thread) {
    await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, data.context || "");
    await idbMgr.create(DATA_KEYS.KEY_THREAD, data.thread);
    alert("Conversazione caricata."); await showHtmlThread(); // AAA Dexie - await
  } else alert("Errore Conversazione non valida.");
};

const elencoKnowledgeBases = () => elencoArtefatti(DATA_KEYS.KEY_KB_PRE, "Knowledge Base", loadKnowledgeBase);
const elencoConversations = () => elencoArtefatti(DATA_KEYS.KEY_CONVO_PRE, "Conversazioni", loadConversation);

// AAA VanJS - Riproduzione ESATTA di elencoDati
const elencoDati = async () => {
  const { div, h4, table, thead, tbody, tr, th, td, a, p } = van.tags;
  
  const idbKeysToDisplay = [];
  const staticIdb = [DATA_KEYS.PHASE0_CHUNKS, DATA_KEYS.PHASE1_INDEX, DATA_KEYS.PHASE2_CONTEXT, DATA_KEYS.KEY_THREAD];
  for (const k of staticIdb) {
    if (await idbMgr.exists(k)) {
      const v = await idbMgr.read(k);
      idbKeysToDisplay.push({ key: k, desc: getDescriptionForKey(k), size: JSON.stringify(v).length });
    }
  }
  for (const pre of [DATA_KEYS.KEY_KB_PRE, DATA_KEYS.KEY_CONVO_PRE]) {
    const keys = await idbMgr.selectKeys(pre);
    for (const k of keys) {
      const v = await idbMgr.read(k);
      idbKeysToDisplay.push({ key: k, desc: getDescriptionForKey(k), size: JSON.stringify(v).length });
    }
  }

  const staticLsKeys = [DATA_KEYS.KEY_WEB_ID, DATA_KEYS.KEY_THEME, DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_API_KEYS, DATA_KEYS.ACTIVE_KB_NAME, DATA_KEYS.KEY_BUILD_STATE, DATA_KEYS.KEY_DOCS];
  const lsFound = [];
  for (const k of staticLsKeys) {
      const val = await UaDb.read(k); // AAA Dexie - await
      if(val) lsFound.push({key: k, val});
  }
  const docNames = await DocsMgr.names(); // AAA Dexie - await
  for (const n of docNames) {
      const k = `${DATA_KEYS.KEY_DOC_PRE}${n}`;
      const val = await UaDb.read(k); // AAA Dexie - await
      if(val) lsFound.push({key: k, val});
  }

  const showData = async (e, key, type) => {
    e.preventDefault();
    const data = type === 'ls' ? await UaDb.read(key) : await idbMgr.read(key); // AAA Dexie - await
    wnds.wpre.show(typeof data === 'string' ? data : JSON.stringify(data, null, 2), false);
  };

  const content = div(
    h4('Dati in IndexedDB'),
    idbKeysToDisplay.length > 0 ? table({ class: "table-data" },
      thead(tr(th("Chiave"), th("Descrizione"), th("Dimensione"))),
      tbody(idbKeysToDisplay.map(item => tr(
        td(a({ href: "#", class: "link-show-data", onclick: (e) => showData(e, item.key, 'idb') }, item.key)),
        td(item.desc),
        td({ class: "size" }, `${(item.size / 1024).toFixed(2)} KB`)
      )))
    ) : p('Nessun dato in IndexedDB.'),
    h4('Impostazioni e Configurazioni'),
    lsFound.length > 0 ? table({ class: "table-data" },
      thead(tr(th("Chiave"), th("Descrizione"), th("Dimensione"))),
      tbody(lsFound.map(item => {
        return tr(
          td(a({ href: "#", class: "link-show-data", onclick: (e) => showData(e, item.key, 'ls') }, item.key)),
          td(getDescriptionForKey(item.key)),
          td({ class: "size" }, `${item.val ? item.val.length : 0} bytes`)
        );
      }))
    ) : p('Nessuna impostazione trovata.')
  );
  wnds.winfo.show(content);
};

// AAA VanJS - Riproduzione ESATTA di elencoDocs
const elencoDocs = async () => {
  const arr = await DocsMgr.names(); // AAA Dexie - await
  const { div, h4, table, thead, tbody, tr, th, td, button, input, label, p } = van.tags;
  const content = div({ class: "docs-dialog" },
    div({ class: "docs-header" },
      h4("Elenco Documenti"),
      label({ class: "select-all-label" },
        input({ type: "checkbox", id: "select-all-docs-checkbox", onclick: (e) => {
          document.querySelectorAll(".doc-checkbox").forEach(cb => cb.checked = e.target.checked);
        }}), " Seleziona tutto"
      )
    ),
    arr.length > 0 ? [
      table({ class: "table-data" },
        thead(tr(th("Selez."), th("Nome"), th("Azioni"))),
        tbody(arr.map((name, i) => tr(
          td(input({ type: "checkbox", class: "doc-checkbox", "data-doc-name": name })),
          td(name),
          td(button({ class: "link-show-doc btn-success", onclick: async () => {
              const text = await DocsMgr.doc(i); // AAA Dexie - await
              wnds.wpre.show(text, false); 
          } }, "Visualizza"))
        )))
      ),
      div({ class: "docs-footer" },
        button({ class: "btn-danger", id: "delete-selected-docs-btn", onclick: async () => {
          const sel = document.querySelectorAll(".doc-checkbox:checked");
          if (sel.length && await confirm(`Confermi l'eliminazione di ${sel.length} documenti?`)) {
            for (const cb of sel) await DocsMgr.delete(cb.dataset.docName); // AAA Dexie - await
            wnds.winfo.close(); await elencoDocs();
          }
        }}, "Cancella Selezionati")
      )
    ] : p("Nessun documento caricato.")
  );
  wnds.winfo.show(content);
};

// AAA VanJS - Riproduzione ESATTA di deleteAllData
const deleteAllData = async () => {
  const { div, h4, h5, table, tr, td, button, input } = van.tags;
  const idbKeys = [];
  const lsKeys = [];
  
  const staticIdb = [DATA_KEYS.PHASE0_CHUNKS, DATA_KEYS.PHASE1_INDEX, DATA_KEYS.PHASE2_CONTEXT, DATA_KEYS.KEY_THREAD];
  for (const k of staticIdb) { if (await idbMgr.exists(k)) idbKeys.push(k); }
  const kbKeys = await idbMgr.selectKeys(DATA_KEYS.KEY_KB_PRE); idbKeys.push(...kbKeys);
  const convoKeys = await idbMgr.selectKeys(DATA_KEYS.KEY_CONVO_PRE); idbKeys.push(...convoKeys);
  
  const staticLs = [DATA_KEYS.KEY_WEB_ID, DATA_KEYS.KEY_THEME, DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_API_KEYS, DATA_KEYS.ACTIVE_KB_NAME, DATA_KEYS.KEY_BUILD_STATE, DATA_KEYS.KEY_DOCS];
  for (const k of staticLs) { if (await UaDb.read(k)) lsKeys.push(k); } // AAA Dexie - await
  
  const docNames = await DocsMgr.names(); // AAA Dexie - await
  for (const n of docNames) { if (await UaDb.read(`${DATA_KEYS.KEY_DOC_PRE}${n}`)) lsKeys.push(`${DATA_KEYS.KEY_DOC_PRE}${n}`); }

  const content = div({ class: "delete-dialog" },
    h4("Seleziona Dati da Cancellare"),
    idbKeys.length > 0 ? [
      h5("Dati Principali"),
      table({ class: "table-data" }, idbKeys.map(k => tr(
        td(input({ type: "checkbox", class: "del-idb-cb", "data-key": k, "data-storage": "idb" }), ` ${k}`),
        td(getDescriptionForKey(k))
      )))
    ] : null,
    lsKeys.length > 0 ? [
      h5("Impostazioni e Preferenze"),
      table({ class: "table-data" }, lsKeys.map(k => tr(
        td(input({ type: "checkbox", class: "del-ls-cb", "data-key": k, "data-storage": "ls" }), ` ${k}`),
        td(getDescriptionForKey(k))
      )))
    ] : null,
    div({ class: "delete-actions", style: "margin-top:15px" },
      button({ class: "btn-delete-selected", onclick: async () => {
        const idbSel = document.querySelectorAll(".del-idb-cb:checked");
        const lsSel = document.querySelectorAll(".del-ls-cb:checked");
        if (!idbSel.length && !lsSel.length) return alert("Nessun elemento selezionato.");
        if (await confirm("Confermi la cancellazione?")) {
          for (const cb of idbSel) await idbMgr.delete(cb.dataset.key);
          for (const cb of lsSel) await UaDb.delete(cb.dataset.key); // AAA Dexie - await
          alert("Dati selezionati cancellati."); wnds.winfo.close(); await updateActiveKbDisplay();
        }
      }}, "Cancella Selezionati"),
            button({ class: "btn-delete-all", id: "delete-all-btn", onclick: async () => {
              if (await confirm("ATTENZIONE: Questa azione cancellerà OGNI DATO dell'applicazione in modo irreversibile. Confermi?")) {
                // AAA Dexie - Nuke totale
                await idbMgr.clearAll(); 
                localStorage.clear(); 
                location.reload();
              }
            }}, "Cancella Tutto")    )
  );
  wnds.winfo.show(content);
};

const showEsempiDocs = async () => {
  const text = await requestGet("./data/help_test.html");
  wnds.winfo.show(text);
  const element = wnds.winfo.w.getElement();
  element.querySelectorAll(".doc-esempio").forEach((link) => {
    link.onclick = async (event) => {
      event.preventDefault();
      const name = event.currentTarget.dataset.exampleName;
      if (name) {
        const text = await requestGet(`data/${name}`);
        if (!await DocsMgr.exists(name)) { // AAA Dexie - await
          await DocsMgr.add(name, cleanDoc(text)); // AAA Dexie - await
          wnds.winfo.close();
        }
      }
    };
  });
};

export function bindEventListener() {
  document.getElementById("btn-help").onclick = Commands.help;
  document.getElementById("btn-upload").onclick = Commands.upload;
  document.getElementById("id_log").onclick = Commands.log;
  document.getElementById("btn-provider-settings").onclick = Commands.providerSettings;
  document.getElementById("btn-dark-theme").onclick = () => setTheme("dark");
  document.getElementById("btn-light-theme").onclick = () => setTheme("light");
  document.getElementById("menu-readme").onclick = showReadme;
  document.getElementById("menu-quickstart").onclick = showQuickstart;
  document.getElementById("menu-show-config").onclick = LlmProvider.showConfig;
  document.getElementById("menu-save-kb").onclick = saveKnowledgeBase;
  document.getElementById("menu-elenco-kb").onclick = elencoKnowledgeBases;
  document.getElementById("menu-view-convo").onclick = viewConversation;
  document.getElementById("menu-save-convo").onclick = saveConversation;
  document.getElementById("menu-elenco-convo").onclick = elencoConversations;
  document.getElementById("menu-view-context").onclick = viewContext;
  document.getElementById("menu-elenco-docs").onclick = elencoDocs;
  document.getElementById("menu-elenco-dati").onclick = elencoDati;
  document.getElementById("menu-delete-all").onclick = deleteAllData;
  document.getElementById("menu-help-esempi").onclick = showEsempiDocs;
  document.getElementById("menu-add-api-key").onclick = addApiKey;

  const textInput = document.querySelector(".text-input");
  textInput.onkeydown = (e) => TextInput.handleEnter(e);
  document.getElementById("btn-action1-knowledge").onclick = () => TextInput.createKnowledge();
  document.getElementById("btn-action2-start-convo").onclick = () => TextInput.startConversation();
  document.getElementById("btn-action3-continue-convo").onclick = () => TextInput.continueConversation();
  document.querySelector(".clear-input").onclick = () => TextInput.clear();
  document.querySelector(".copy-output").onclick = () => TextOutput.copy();
  document.querySelector("#clear-history1").onclick = () => TextOutput.clearHistory();
  document.querySelector("#clear-history2").onclick = () => TextOutput.clearHistoryContext();

  const btn = document.querySelector("#id-menu-btn");
  btn.onchange = () => document.body.classList.toggle("menu-open", btn.checked);
}