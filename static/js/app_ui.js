"use strict";

/**
 * @file app_ui.js
 * @description Controller principale dell'applicazione. Gestisce UI, eventi e orchestra il flusso RAG.
 */

import { UaWindowAdm } from "./services/uawindow.js";
import { UaLog } from "./services/ualog3.js";
import { help0_html, help1_html, help2_html } from "./services/help.js";
import { docuentUploader } from "./uploader.js";
import { AppMgr } from "./app_mgr.js";
import { UaDb } from "./services/uadb.js";
import { DocsMgr } from "./services/docs_mgr.js";
import { LlmProvider } from "./llm_provider.js";
import { textFormatter, messages2html, messages2text } from "./history_utils.js";
import { ragEngine } from "./rag_engine.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { idbMgr } from "./services/idb_mgr.js";
import { UaJtfh } from "./services/uajtfh.js";
import { requestGet } from "./services/http_request.js";
import { cleanDoc } from "./text_cleaner.js"
// FirebaseLogger e WebId sono usati in AppMgr, quindi l'import qui non è strettamente necessario
// ma lo manteniamo per chiarezza finché non si sposta la logica di init.

const Spinner = {
  show: () => {
    const p = document.querySelector("#id-text-out .div-text");
    p.classList.add("spinner-bg")
    const spinner = document.getElementById("spinner");
    spinner.classList.add("show-spinner");
    spinner.addEventListener("click", Spinner.stop);
  },

  hide: () => {
    const p = document.querySelector("#id-text-out .div-text");
    p.classList.remove("spinner-bg")
    const spinner = document.getElementById("spinner");
    spinner.classList.remove("show-spinner");
    spinner.removeEventListener("click", Spinner.stop);
  },

  stop: async () => {
    const ok = await confirm("Confermi Cancellazione Richiesta?");
    if (!ok) return;
    const client = AppMgr.clientLLM;
    client.cancelRequest();
    Spinner.hide();
  },
};

const WaitSpinner = {
  show: () => {
    const spinner = document.getElementById("spinner-wait");
    spinner.classList.add("show-spinner-wait");
  },

  hide: () => {
    const spinner = document.getElementById("spinner-wait");
    spinner.classList.remove("show-spinner-wait");
  },
};


const errorDumps = (err) => {
  const s = JSON.stringify(err, null, 2);
  if (s == "{}") return `${err}`;
  return s;
};

const WndPre = (id) => {
  return {
    w: UaWindowAdm.create(id),
    show(s, delAll = true) {
      const fh = (txt) => {
        return `
<div class="window-text">
<div class="btn-wrapper">
<button class="btn-copy tt-left" data-tt="Copia">
<svg class="copy-icon" viewBox="0 0 20 24">
  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
</svg>
</button>
<button class="btn-close tt-left btn-window-close" data-tt="chiudi">X</button>
</div>
<pre class="pre-text">${txt}</pre>
</div>
    `;
      };
      if (delAll)
        wnds.closeAll();
      const h = fh(s);
      this.w.drag();
      this.w.setZ(12);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, 1);
      this.w.setHtml(h);
      this.w.show();
      this.addEventListeners();
    },
    addEventListeners() {
      const element = this.w.getElement();
      const copyBtn = element.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          this.copy();
        });
      }
      const closeBtn = element.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.close();
        });
      }
    },
    close() {
      this.w.close();
    },
    async copy() {
      const e = this.w.getElement();
      const pre = e.querySelector(".pre-text");
      const t = pre.textContent;
      try {
        await navigator.clipboard.writeText(t);
      } catch (err) {
        console.error("Errore  ", err);
      }
    },
  };
};

const WndDiv = (id) => {
  return {
    w: UaWindowAdm.create(id),
    show(s, delAll = true) {
      const fh = (txt) => {
        return `
<div class="window-text">
<div class="btn-wrapper">
<button class="btn-copy wcp tt-left" data-tt="Copia">
<svg class="copy-icon" viewBox="0 0 20 24">
  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
</svg>
</button>
<button class="btn-close wcl tt-left btn-window-close" data-tt="chiudi">X</button>
</div>
<div class="div-text">${txt}</div>
</div>`;
      };
      if (delAll)
        wnds.closeAll();
      const h = fh(s);
      this.w.drag();
      this.w.setZ(12);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, 1);
      this.w.setHtml(h);
      this.w.show();
      this.addEventListeners();
    },
    addEventListeners() {
      const element = this.w.getElement();
      const copyBtn = element.querySelector('.wcp');
      copyBtn.addEventListener('click', () => {
        this.copy();
      });
      const closeBtn = element.querySelector('.wcl');
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    },
    close() {
      this.w.close();
    },
    async copy() {
      const e = this.w.getElement();
      const pre = e.querySelector(".text");
      const t = pre.textContent;
      try {
        await navigator.clipboard.writeText(t);
      } catch (err) {
        console.error("Errore durante la copia: ", err);
      }
    },
  };
};

const WndInfo = (id) => {
  return {
    w: UaWindowAdm.create(id),
    showe(s) {
      const x = `<pre class="pre-text">${s}</pre>`;
      this.show(x);
    },
    show(s, delAll = true) {
      const fh = (txt) => {
        return `
<div class="window-info">
<div class="btn-wrapper">
<button class="btn-close tt-left btn-window-close" data-tt="chiudi">X</button>
</div>
<div class="div-info">${txt}</div>
</div>`;
      };
      if (delAll)
        wnds.closeAll();
      const h = fh(s);
      this.w.drag();
      this.w.setZ(11);
      const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
      this.w.vw_vh().setXY(xPos, 5, -1);
      this.w.setHtml(h);
      this.w.show();
      this.addEventListeners();
    },
    addEventListeners() {
      const element = this.w.getElement();
      const copyBtn = element.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          this.copy();
        });
      }
      const closeBtn = element.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.close();
        });
      }
    },
    close() {
      this.w.close();
    }
  };
};

export const wnds = {
  wdiv: null,
  wpre: null,
  winfo: null,
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

  help() {
    wnds.wdiv.show(help0_html);
  },
  upload() {
    docuentUploader.open();
  },
  log() {
    UaLog.toggle();
  },
  providerSettings() {
    LlmProvider.toggleTreeView();
  },
};

const setResponseHtml = (html) => {
  const p = document.querySelector("#id-text-out .div-text");
  p.innerHTML = html;
  p.style.display = "none";
  p.style.display = "";
  p.scrollTop = p.scrollHeight;
};

export const TextInput = {
  init() {
    this.inp = document.querySelector(".text-input");
  },

  clear() {
    this.inp.value = "";
    this.inp.focus();
  },

  async runAction1_CreateKnowledgeBase() {
    UaLog.log("Azione 1: Creazione Knowledge Base...");
    
    // Controllo di coerenza robusto: verifica sia la lista che il contenuto.
    const docNames = DocsMgr.names();
    const validDocuments = docNames
      .map((name, i) => ({ name, text: DocsMgr.doc(i) }))
      .filter(doc => doc.text && doc.text.trim() !== "");

    if (validDocuments.length === 0) {
      alert("Nessun documento valido trovato. Carica dei file con contenuto prima di creare una Knowledge Base.");
      return;
    }

    const ok = await confirm(`Verrà creata una nuova Knowledge Base da ${validDocuments.length} documenti validi. L'operazione sovrascriverà la KB di lavoro corrente. Confermi?`);
    if (!ok) return;

    WaitSpinner.show();
    setTimeout(async () => {
      try {
        // Usa solo i documenti validati
        const { chunks, serializedIndex } = await ragEngine.createKnowledgeBase(validDocuments);

        await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, chunks);
        await idbMgr.create(DATA_KEYS.PHASE1_INDEX, serializedIndex);
        UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // New KB is active, but not saved yet
        updateActiveKbDisplay();

        alert(`Knowledge Base creata.\n- ${chunks.length} frammenti generati.\n- Indice di ricerca creato.`);
      } catch (error) {
        console.error("Errore durante la creazione della Knowledge Base", error);
        alert(errorDumps(error));
      } finally {
        WaitSpinner.hide();
      }
    }, 50);
  },

  async runAction2_StartConversation() {
    UaLog.log("Azione 2: Inizio Conversazione...");
    const query = this.inp.value.trim();
    if (!query) {
      alert("Inserisci una query per iniziare la conversazione.");
      return;
    }

    const serializedIndex = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
    const allChunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);

    if (!serializedIndex || !allChunks) {
      alert("Knowledge Base non trovata. Esegui prima l'Azione 1.");
      return;
    }

    Spinner.show();
    setTimeout(async () => {
      try {
        await idbMgr.delete(DATA_KEYS.KEY_THREAD);
        setResponseHtml("");

        UaLog.log("...creazione contesto...");
        const context = ragEngine.buildContext(serializedIndex, allChunks, query);
        await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, context);
        UaLog.log(` -> Contesto creato (lunghezza: ${context.length}).`);

        UaLog.log("...generazione prima risposta...");
        AppMgr.initConfig();
        const thread = [{ role: 'user', content: query }];
        const answerText = await ragEngine.generateResponse(query, context, thread);
        
        thread.push({ role: 'assistant', content: answerText });
        await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
        showHtmlThread();
        this.clear();
      } catch (error) {
        console.error("Errore durante l'inizio della conversazione", error);
        alert(errorDumps(error));
      } finally {
        Spinner.hide();
      }
    }, 50);
  },

  async runAction3_ContinueConversation() {
    UaLog.log("Azione 3: Continuazione Conversazione...");
    const query = this.inp.value.trim();
    if (!query) {
      alert("Inserisci una query per continuare la conversazione.");
      return;
    }

    Spinner.show();
    setTimeout(async () => {
      try {
        let thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
        let context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);

        if (!thread) {
          UaLog.log("Nessuna conversazione attiva, avvio conversazione libera.");
          thread = []; 
          context = ""; 
        }
        
        thread.push({ role: 'user', content: query });
        
        AppMgr.initConfig();
        const answerText = await ragEngine.generateResponse(query, context, thread);

        thread.push({ role: 'assistant', content: answerText });
        await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
        showHtmlThread();
        this.clear();
      } catch (error) {
        console.error("Errore durante la continuazione della conversazione", error);
        alert(errorDumps(error));
      } finally {
        Spinner.hide();
      }
    }, 50);
  },
};

export const TextOutput = {
  init() {
    this.copyBtn = document.querySelector(".copy-output");
  },
  openWnd() {
    showThread();
  },
  async copy() {
    const pre = document.querySelector("#id-text-out .div-text");
    let t = pre.textContent;
    if (t.trim().length < 2) return;
    pre.classList.add("copied");
    this.copyBtn.classList.add("copied");
    try {
      t = textFormatter(t);
      await navigator.clipboard.writeText(t);
    } catch (err) {
      console.error("Errore  ", err);
    }
    setTimeout(() => {
      this.copyBtn.classList.remove("copied");
      pre.classList.remove("copied");
    }, 5000);
  },
  clear() {
    const out = document.querySelector("#id-text-out .div-text");
    out.textContent = "";
  },
  async clearHistory() {
    const ok = await confirm("Confermi nuova conversazione ? ");
    if (!ok) return;
    await idbMgr.delete(DATA_KEYS.KEY_THREAD);
    setResponseHtml("");
  },
  async clearHistoryContext() {
    const ok = await confirm("Confermi nuovo Contesto & Conversazione ?  ");
    if (!ok) return;
    await idbMgr.delete(DATA_KEYS.PHASE2_CONTEXT);
    await idbMgr.delete(DATA_KEYS.KEY_THREAD);
    UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // Clear active KB name
    updateActiveKbDisplay(); // Update display
    setResponseHtml("");
  },

};

export const getTheme = () => {
  const t = UaDb.read(DATA_KEYS.KEY_THEME);
  if (t === "light") {
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.add("theme-dark");
  }
};

const setTheme = (theme) => {
  if (theme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
    UaDb.save(DATA_KEYS.KEY_THEME, "light");
  } else {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
    UaDb.save(DATA_KEYS.KEY_THEME, "dark");
  }
};

const showReadme = () => {
  wnds.wdiv.show(help1_html);
};

const showQuickstart = () => {
  wnds.wdiv.show(help2_html);
};

const viewConversation = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD)
  if (!lst) {
    alert("Nessuna conversazione attiva.");
    return;
  }
  const s = messages2text(lst);
  wnds.wpre.show(s);
};

export const showHtmlThread = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD)
  if (!lst) return;
  const html = messages2html(lst);
  setResponseHtml(html);
};

export const updateActiveKbDisplay = async () => {
  const displayElement = document.getElementById("active-kb-display");
  if (!displayElement) return;

  const chunksExist = await idbMgr.exists(DATA_KEYS.PHASE0_CHUNKS);
  const indexExist = await idbMgr.exists(DATA_KEYS.PHASE1_INDEX);

  if (!chunksExist || !indexExist) {
    displayElement.textContent = "Nessuna KB attiva";
    UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME); // Ensure it's cleared if KB is gone
    return;
  }

  const activeKbName = UaDb.read(DATA_KEYS.ACTIVE_KB_NAME);
  if (activeKbName) {
    displayElement.textContent = `KB: ${activeKbName}`;
  } else {
    displayElement.textContent = "KB: BASE CORRENTE";
  }
};

// ==================================================
// NUOVA GESTIONE DATI UNIFICATA
// ==================================================

const saveKnowledgeBase = async () => {
  const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
  const serializedIndex = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);

  if (!chunks || !serializedIndex) {
    alert("Nessuna Knowledge Base di lavoro da archiviare. Esegui prima l'Azione 1.");
    return;
  }

  let name = await prompt("Nome per archiviare la Knowledge Base:");
  if (name) {
    name = name.replace(/\s+/g, '_');
    const key = `${DATA_KEYS.KEY_KB_PRE}${name}`;
    const kb_data = { chunks, serializedIndex };
    await idbMgr.create(key, kb_data);
    UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, name); // Set as active saved KB
    updateActiveKbDisplay(); // Update display
    alert(`Knowledge Base archiviata come: ${name}`);
  }
};

const saveConversation = async () => {
  const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
  const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);

  if (!thread || thread.length === 0) {
    alert("Nessuna conversazione attiva da archiviare.");
    return;
  }

  let name = await prompt("Nome per archiviare la Conversazione:");
  if (name) {
    name = name.replace(/\s+/g, '_');
    const key = `${DATA_KEYS.KEY_CONVO_PRE}${name}`;
    const convo_data = { context, thread };
    await idbMgr.create(key, convo_data);
    alert(`Conversazione archiviata come: ${name}`);
  }
};


const elencoArtefatti = async (prefix, title, loadHandler) => {
  const keys = await idbMgr.selectKeys(prefix);
  const jfh = UaJtfh();
  jfh.append(`<div class="data-dialog"><h4>Gestione ${title}</h4>`);
  if (keys.length > 0) {
    jfh.append('<table class="table-data"><thead><tr><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
    for (const key of keys) {
      const displayName = key.slice(prefix.length);
      jfh.append(`
        <tr>
          <td>${displayName}</td>
          <td><button class="btn-load-item btn-success" data-item-key="${key}">Carica</button></td>
          <td><button class="btn-delete-item btn-danger" data-item-key="${key}">Elimina</button></td>
        </tr>
      `);
    }
    jfh.append("</tbody></table>");
  } else {
    jfh.append(`<p>Nessun dato di tipo '${title}' trovato.</p>`);
  }
  jfh.append("</div>");
  wnds.winfo.show(jfh.html());

  const element = wnds.winfo.w.getElement();

  element.querySelectorAll(".btn-load-item").forEach(btn => btn.addEventListener("click", async (event) => {
    const key = event.currentTarget.dataset.itemKey;
    await loadHandler(key);
    wnds.winfo.close();
  }));

  element.querySelectorAll(".btn-delete-item").forEach(btn => btn.addEventListener("click", async (event) => {
    const key = event.currentTarget.dataset.itemKey;
    const displayName = key.slice(prefix.length);
    const ok = await confirm(`Confermi l'eliminazione di '${displayName}'?`);
    if (ok) {
      await idbMgr.delete(key);
      // If the deleted KB was the active one, clear the active KB name
      if (prefix === DATA_KEYS.KEY_KB_PRE && UaDb.read(DATA_KEYS.ACTIVE_KB_NAME) === displayName) {
        UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
      }
      updateActiveKbDisplay(); // Update display
      wnds.winfo.close();
      elencoArtefatti(prefix, title, loadHandler); // Refresh
    }
  }));
};


const loadKnowledgeBase = async (key) => {
  const kb_data = await idbMgr.read(key);
  if (kb_data && kb_data.chunks && kb_data.serializedIndex) {
    await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, kb_data.chunks);
    await idbMgr.create(DATA_KEYS.PHASE1_INDEX, kb_data.serializedIndex);
    const name = key.slice(DATA_KEYS.KEY_KB_PRE.length);
    UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, name); // Set as active saved KB
    updateActiveKbDisplay(); // Update display
    alert(`Knowledge Base '${name}' caricata come KB di lavoro.`);
  } else {
    alert("Errore: Dati della Knowledge Base non validi.");
  }
};

const loadConversation = async (key) => {
  const convo_data = await idbMgr.read(key);
  if (convo_data && convo_data.thread) {
    await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, convo_data.context || ""); // Gestisce vecchi salvataggi senza contesto
    await idbMgr.create(DATA_KEYS.KEY_THREAD, convo_data.thread);
    const name = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
    alert(`Conversazione '${name}' caricata come conversazione attiva.`);
    showHtmlThread();
  } else {
    alert("Errore: Dati della conversazione non validi.");
  }
};

const elencoKnowledgeBases = () => elencoArtefatti(DATA_KEYS.KEY_KB_PRE, "Knowledge Base", loadKnowledgeBase);
const elencoConversations = () => elencoArtefatti(DATA_KEYS.KEY_CONVO_PRE, "Conversazioni", loadConversation);


const KEY_DESCRIPTIONS = {
  [DATA_KEYS.PHASE0_CHUNKS]: "Knowledge Base di Lavoro (Chunks)",
  [DATA_KEYS.PHASE1_INDEX]: "Knowledge Base di Lavoro (Index)",
  [DATA_KEYS.PHASE2_CONTEXT]: "Conversazione Attiva (Contesto)",
  [DATA_KEYS.KEY_THREAD]: "Conversazione Attiva (Thread)",
  
  [DATA_KEYS.KEY_PROVIDER]: "Configurazione Provider LLM",
  [DATA_KEYS.KEY_THEME]: "Tema UI (dark/light)",
  [DATA_KEYS.PHASE2_QUERY]: "Ultima Query",
  [DATA_KEYS.KEY_DOCS]: "Elenco Documenti Caricati",
  [DATA_KEYS.ACTIVE_KB_NAME]: "Nome KB Attiva"
};

const getDescriptionForKey = (key) => {
  if (KEY_DESCRIPTIONS[key]) {
    return KEY_DESCRIPTIONS[key];
  }
  if (key.startsWith(DATA_KEYS.KEY_KB_PRE)) {
    return "Knowledge Base Archiviata";
  }
  if (key.startsWith(DATA_KEYS.KEY_CONVO_PRE)) {
    return "Conversazione Archiviata";
  }
  if (key.startsWith(DATA_KEYS.KEY_THREAD_PRE)) {
    return "Archivio Conversazione (Vecchio formato)";
  }
  return "Dato non classificato";
};

const elencoDati = async () => {
  const jfh = UaJtfh();
  const allIdbKeys = await idbMgr.getAllKeys();
  const allLsKeys = UaDb.getAllIds();

  jfh.append('<h4>Dati in IndexedDB</h4>');
  if (allIdbKeys.length > 0) {
    jfh.append(`<table class="table-data"><thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead><tbody>`);
    
    const processedIdbKeys = new Set();
    for (const key of allIdbKeys) {
      if (key.startsWith("idoc_") || processedIdbKeys.has(key)) {
        continue; // Skip document keys and already processed keys
      }

      let description = getDescriptionForKey(key);
      let displayKey = key;
      let size = 0;
      let value;

      if (key === DATA_KEYS.PHASE0_CHUNKS) {
        // Group PHASE0_CHUNKS and PHASE1_INDEX
        const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
        const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
        if (chunks || index) {
          displayKey = "Knowledge Base di Lavoro";
          description = "Knowledge Base di Lavoro (Chunks + Index)";
          size = (chunks ? JSON.stringify(chunks).length : 0) + (index ? JSON.stringify(index).length : 0);
          processedIdbKeys.add(DATA_KEYS.PHASE1_INDEX); // Mark index as processed
        } else {
          continue; // If both are empty, don't list
        }
      } else if (key.startsWith(DATA_KEYS.KEY_KB_PRE)) {
        // Handle saved KBs
        value = await idbMgr.read(key);
        if (value && value.chunks && value.serializedIndex) {
          displayKey = `KB Archiviata: ${key.slice(DATA_KEYS.KEY_KB_PRE.length)}`;
          description = "Knowledge Base Archiviata (Chunks + Index)";
          size = JSON.stringify(value.chunks).length + JSON.stringify(value.serializedIndex).length;
        } else {
          continue; // Skip invalid saved KBs
        }
      } else {
        value = await idbMgr.read(key);
        size = value ? JSON.stringify(value).length : 0;
      }

      jfh.append(
        `<tr>
          <td><a href="#" class="link-show-data" data-key="${key}" data-storage-type="idb">${displayKey}</a></td>
          <td>${description}</td>
          <td class="size">${size}</td>
        </tr>`
      );
      processedIdbKeys.add(key);
    }
    jfh.append('</tbody></table>');
  } else {
    jfh.append('<p>Nessun dato in IndexedDB.</p>');
  }


  jfh.append('<h4>Dati in LocalStorage</h4>');
  if (allLsKeys.length > 0) {
    jfh.append(`<table class="table-data"><thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead><tbody>`);
    for (const key of allLsKeys) {
      if (key.startsWith("idoc_") || key === DATA_KEYS.KEY_DOCS) {
        continue; // Skip document related keys
      }
      const value = UaDb.read(key);
      if (value) {
        const description = getDescriptionForKey(key);
        const size = value.length;
        jfh.append(
          `<tr>
            <td><a href="#" class="link-show-data" data-key="${key}" data-storage-type="ls">${key}</a></td>
            <td>${description}</td>
            <td class="size">${size}</td>
          </tr>`
        );
      }
    }
    jfh.append('</tbody></table>');
  } else {
    jfh.append('<p>Nessun dato in LocalStorage.</p>');
  }


  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();
  element.querySelectorAll(".link-show-data").forEach(link => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const key = event.currentTarget.dataset.key;
      const storageType = event.currentTarget.dataset.storageType;
      let data;
      if (storageType === 'ls') {
        data = UaDb.read(key);
      } else if (storageType === 'idb') {
        if (key === DATA_KEYS.PHASE0_CHUNKS) {
          // Special handling for active KB
          const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
          const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
          data = { chunks, serializedIndex: index };
        } else if (key.startsWith(DATA_KEYS.KEY_KB_PRE)) {
          data = await idbMgr.read(key);
        } else {
          data = await idbMgr.read(key);
        }
      }
      data = data ?? "";
      const dataFormat = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      wnds.wpre.show(dataFormat, false);
    });
  });
};

const elencoDocs = () => {
  const arr = DocsMgr.names();
  const jfh = UaJtfh();
  jfh.append('<div class="docs-dialog">');
  jfh.append("<h4>Elenco Documenti</h4>");
  if (arr.length > 0) {
    jfh.append(`
      <table class="table-data">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
    `);
    arr.forEach((docName, index) => {
      jfh.append(`
<tr>
<td>${docName}</td>
<td><button class="link-show-doc btn-success" data-doc-index="${index}">Visualizza</button></td>
<td><button class="delete-doc-btn btn-danger" data-doc-index="${index}">Elimina</button></td>
</tr>
`);
    });
    jfh.append(`</tbody></table>`);
  } else {
    jfh.append("<p>Nessun documento trovato.</p>");
  }
  jfh.append("</div>");
  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();

  element.querySelectorAll(".link-show-doc").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const docIndex = event.currentTarget.dataset.docIndex;
      if (docIndex !== null) {
        const n = parseInt(docIndex, 10);
        const s = DocsMgr.doc(n);
        wnds.wpre.show(s, false);
      }
    });
  });

  element.querySelectorAll(".delete-doc-btn").forEach((icon) => {
    icon.addEventListener("click", async (event) => {
      event.preventDefault();
      const docIndex = event.currentTarget.dataset.docIndex;
      if (docIndex !== null) {
        const n = parseInt(docIndex, 10);
        const docName = DocsMgr.name(n);
        const ok = await confirm(`Confermi la cancellazione del documento "${docName}"?`);
        if (ok) {
          DocsMgr.delete(docName);
          elencoDocs();
        }
      }
    });
  });
};

const deleteAllData = async () => {
  const jfh = UaJtfh();
  const allIdbKeys = await idbMgr.getAllKeys();
  const allLsKeys = UaDb.getAllIds();

  jfh.append('<div class="delete-dialog">');
  jfh.append('<h4>Seleziona Dati da Cancellare</h4>');
  
  const idbKeysToDisplay = [];
  const processedIdbKeysForDelete = new Set();

  for (const key of allIdbKeys) {
    if (key.startsWith("idoc_") || processedIdbKeysForDelete.has(key)) {
      continue;
    }

    if (key === DATA_KEYS.PHASE0_CHUNKS) {
      // Group active KB
      const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
      const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
      if (chunks || index) {
        idbKeysToDisplay.push({
          key: DATA_KEYS.PHASE0_CHUNKS, // Use chunks key as identifier for the group
          description: "Knowledge Base di Lavoro (Chunks + Index)",
          displayKey: "Knowledge Base di Lavoro"
        });
        processedIdbKeysForDelete.add(DATA_KEYS.PHASE1_INDEX);
      }
    } else if (key.startsWith(DATA_KEYS.KEY_KB_PRE)) {
      // Saved KBs
      idbKeysToDisplay.push({
        key: key,
        description: "Knowledge Base Archiviata",
        displayKey: `KB Archiviata: ${key.slice(DATA_KEYS.KEY_KB_PRE.length)}`
      });
    } else {
      idbKeysToDisplay.push({
        key: key,
        description: getDescriptionForKey(key),
        displayKey: key
      });
    }
    processedIdbKeysForDelete.add(key);
  }

  if (idbKeysToDisplay.length > 0) {
    jfh.append('<h5>Dati in IndexedDB</h5><table class="table-data">');
    idbKeysToDisplay.forEach(item => {
      jfh.append(`
        <tr>
          <td><input type="checkbox" data-key="${item.key}" data-storage="idb"> ${item.displayKey}</td>
          <td>${item.description}</td>
        </tr>`);
    });
    jfh.append('</table>');
  }

  const lsKeysToDisplay = allLsKeys.filter(key => !key.startsWith("idoc_") && key !== DATA_KEYS.KEY_DOCS);

  if (lsKeysToDisplay.length > 0) {
    jfh.append('<h5>Dati in LocalStorage</h5><table class="table-data">');
    lsKeysToDisplay.forEach(key => {
      jfh.append(`
        <tr>
          <td><input type="checkbox" data-key="${key}" data-storage="ls"> ${key}</td>
          <td>${getDescriptionForKey(key)}</td>
        </tr>`);
    });
    jfh.append('</table>');
  }

  jfh.append('<div class="delete-actions">');
  jfh.append('<button id="delete-selected-btn" class="btn-delete-selected">Cancella Selezionati</button>');
  jfh.append('<button id="delete-all-btn" class="btn-delete-all">Cancella Tutto</button>');
  jfh.append('</div></div>');
  
  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();

  element.querySelector("#delete-selected-btn").addEventListener("click", async () => {
    const keysToDelete = { ls: [], idb: [] };

    element.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const storage = cb.dataset.storage;
      const key = cb.dataset.key;
      if (storage === 'ls') keysToDelete.ls.push(key);
      else if (storage === 'idb') keysToDelete.idb.push(key);
    });

    if (keysToDelete.ls.length === 0 && keysToDelete.idb.length === 0) {
      alert("Nessun elemento selezionato.");
      return;
    }

    const ok = await confirm("Confermi la cancellazione degli elementi selezionati?");
    if (ok) {
      for (const key of keysToDelete.ls) {
        UaDb.delete(key);
      }
      for (const key of keysToDelete.idb) {
        if (key === DATA_KEYS.PHASE0_CHUNKS) {
          await idbMgr.delete(DATA_KEYS.PHASE0_CHUNKS);
          await idbMgr.delete(DATA_KEYS.PHASE1_INDEX);
          UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
        } else {
          await idbMgr.delete(key);
        }
      }
      alert("Dati selezionati cancellati con successo.");
      wnds.winfo.close();
      updateActiveKbDisplay(); // Update display after deletion
      // Re-open delete dialog to show updated state
      deleteAllData();
    }
  });

  element.querySelector("#delete-all-btn").addEventListener("click", async () => {
    const ok = await confirm("ATTENZIONE: Stai per cancellare TUTTI i dati dell'applicazione (LocalStorage e IndexedDB), ESCLUSI i documenti caricati. Confermi?");
    if (ok) {
      // Clear LocalStorage, but preserve document-related keys
      const allLsKeys = UaDb.getAllIds();
      for (const key of allLsKeys) {
        if (!key.startsWith("idoc_") && key !== DATA_KEYS.KEY_DOCS) {
          UaDb.delete(key);
        }
      }
      // Clear IndexedDB, but preserve document-related keys (if any were mistakenly there)
      const allIdbKeys = await idbMgr.getAllKeys();
      for (const key of allIdbKeys) {
        if (!key.startsWith("idoc_")) { // Ensure no idoc_ keys are deleted from idb if they somehow got there
          await idbMgr.delete(key);
        }
      }
      setResponseHtml("");
      alert("Tutti i dati dell'applicazione (esclusi i documenti) sono stati cancellati.");
      wnds.winfo.close();
      updateActiveKbDisplay(); // Update display after deletion
    }
  });
};

const showEsempiDocs = async () => {
  const text = await requestGet("./data/help_test.html");
  wnds.winfo.show(text);
  const element = wnds.winfo.w.getElement();
  element.querySelectorAll(".doc-esempio").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const exampleName = event.currentTarget.dataset.exampleName;
      if (exampleName) {
        const link = `data/${exampleName}`;
        const text = await requestGet(link);
        const doc = cleanDoc(text);
        const parts = link.split("/");
        const name = parts[parts.length - 1];
        if (DocsMgr.exists(name)) {
          alert(`Il documento ${name} è già caricato`);
          return;
        }
        DocsMgr.add(name, doc);
        wnds.winfo.close();
      }
    });
  });
};


export function bindEventListener() {
  // Header buttons
  document.getElementById("btn-help").addEventListener("click", Commands.help);
  document.getElementById("btn-upload").addEventListener("click", Commands.upload);
  document.getElementById("id_log").addEventListener("click", Commands.log);
  document.getElementById("btn-provider-settings").addEventListener("click", Commands.providerSettings);
  document.getElementById("btn-dark-theme").addEventListener("click", () => setTheme("dark"));
  document.getElementById("btn-light-theme").addEventListener("click", () => setTheme("light"));
  
  // Menu Items
  document.getElementById("menu-readme").addEventListener("click", showReadme);
  document.getElementById("menu-quickstart").addEventListener("click", showQuickstart);
  document.getElementById("menu-show-config").addEventListener("click", LlmProvider.showConfig);
  
  // --- Nuova Gestione Dati ---
  document.getElementById("menu-save-kb").addEventListener("click", saveKnowledgeBase);
  document.getElementById("menu-elenco-kb").addEventListener("click", elencoKnowledgeBases);
  
  document.getElementById("menu-view-convo").addEventListener("click", viewConversation);
  document.getElementById("menu-save-convo").addEventListener("click", saveConversation);
  document.getElementById("menu-elenco-convo").addEventListener("click", elencoConversations);

  document.getElementById("menu-elenco-docs").addEventListener("click", elencoDocs);
  document.getElementById("menu-elenco-dati").addEventListener("click", elencoDati);
  document.getElementById("menu-delete-all").addEventListener("click", deleteAllData);
  document.getElementById("menu-help-esempi").addEventListener("click", showEsempiDocs);

  // New action buttons
  document.getElementById("btn-action1-knowledge").addEventListener("click", () => TextInput.runAction1_CreateKnowledgeBase());
  document.getElementById("btn-action2-start-convo").addEventListener("click", () => TextInput.runAction2_StartConversation());
  document.getElementById("btn-action3-continue-convo").addEventListener("click", () => TextInput.runAction3_ContinueConversation());
  document.querySelector(".clear-input").addEventListener("click", () => TextInput.clear());

  // TextOutput
  document.querySelector(".copy-output").addEventListener("click", () => TextOutput.copy());
  document.querySelector(".wnd-output").addEventListener("click", () => TextOutput.openWnd());
  document.querySelector("#clear-history1").addEventListener("click", () => TextOutput.clearHistory());
  document.querySelector("#clear-history2").addEventListener("click", () => TextOutput.clearHistoryContext());

  // commands
  const btn = document.querySelector("#id-menu-btn");
  btn.addEventListener("change", () => {
    document.querySelector("body").classList.toggle("menu-open", btn.checked);
    //gestione tootip
    const body = document.querySelector("body");
    const icon = document.querySelector("#id-menu-btn");
    if (body.classList.contains("menu-open")) icon.setAttribute("data-tt", "Close");
    else icon.setAttribute("data-tt", "Open");
  });
}