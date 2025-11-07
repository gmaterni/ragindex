/** @format */
"use strict";

import { UaWindowAdm } from "./services/uawindow.js";
import { UaLog } from "./services/ualog3.js";
import { help0_html, help1_html, help2_html } from "./services/help.js";
import { docuentUploader } from "./uploader.js";
import { AppMgr } from "./app_mgr.js";
import { UaDb } from "./services/uadb.js";
import { DocsMgr } from "./services/docs_mgr.js";
import { LlmProvider } from "./llm_provider.js";
import { DocType } from "./services/doc_types.js";
import { textFormatter, messages2html, messages2text } from "./history_utils.js";
import { ragEngine } from "./rag_engine.js";
import { DATA_KEYS } from "./services/data_keys.js";
import { idbMgr } from "./services/idb_mgr.js";
import { UaJtfh } from "./services/uajtfh.js";
import { requestGet } from "./services/http_request.js";
import { cleanDoc } from "./text_cleaner.js"
import { FirebaseLogger } from "./services/firbaselogger.js";
import { WebId } from "./services/webuser_id.js";

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
    const ok = await confirm("Confermi Cancellazione Richeista ?");
    if (!ok) return;
    const client = AppMgr.clientLLM;
    client.cancelRequest();
    Spinner.hide();
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
        // console.log("Testo copiato negli appunti");
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
  docTypeSettings() {
    DocType.toggleTreeView();
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
  handleEnter(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.send2();
    }
  },

  async send0() {
    const docNames = DocsMgr.names();
    if (docNames.length == 0) {
      alert("Non vi sono documenti da elaborare.\n  Se vuoi iniziare una conversazione usa il pulsante verde o return  ");
      return;
    }
    const ok = await confirm("Confermi creazioene Base di conoscenza ?");
    if (!ok)
      return;
    setResponseHtml("");
    Spinner.show();
    try {
      const webid = WebId.get();
      FirebaseLogger.sendLog("send0", webid)
      AppMgr.initConfig();
      const ok = await ragEngine.buildKnBase();
      if (ok) {
        alert(" Base di conoscenza creata con successo!");
      }
    } catch (error) {
      console.error("Error send0", error);
      if (error && error.type === "CancellationError" && error.code === 499) {
        alert("Richiesta interrotta");
      } else {
        let errorMessage = errorDumps(error);
        alert(errorMessage);
      }
    } finally {
      Spinner.hide();
    }
  },

  async send1() {
    const query = this.inp.value;
    if (!query) {
      alert("Ricorda di scrivere la Query  ");
      return;
    }
    let knBase = await idbMgr.exists(DATA_KEYS.KEY_KNBASE);
    if (!knBase) {
      alert("Base di conoscenza Vuota;");
      return;
    }
    let context = await idbMgr.exists(DATA_KEYS.KEY_CONTEXT);
    if (context) {
      const s = `Vuoi creare un nuovo contesto per la query \n ${query}`;
      const ok = await confirm(s)
      if (!ok) return;
    }
    try {
      Spinner.show();
      const webid = WebId.get();
      FirebaseLogger.sendLog("send1", webid)
      AppMgr.initConfig();
      let history = await ragEngine.buildContext(query);
      if (!history) history = [];
      const html = messages2html(history)
      setResponseHtml(html);
      TextInput.inp.value = "";
    } catch (error) {
      console.error("Error send1", error);
      if (error && error.type === "CancellationError" && error.code === 499) {
        alert("Richiesta interrotta");
      }
      else {
        const s = errorDumps(error);
        alert(s);
      }
    } finally {
      Spinner.hide();
    }
  },

  async send2() {
    const q = this.inp.value;
    if (!q) {
      alert("Ricorda di scrivere la Query  ");
      return;
    }
    Spinner.show();
    const query = this.inp.value.trim();
    try {
      const webid = WebId.get();
      FirebaseLogger.sendLog("send2", webid)
      AppMgr.initConfig();
      const history = await ragEngine.runConversation(query);
      const html = messages2html(history);
      if (html == "") {
        return;
      }
      setResponseHtml(html);
      TextInput.inp.value = "";
    } catch (error) {
      console.error("Error send2", error);
      if (error && error.type === "CancellationError" && error.code === 499) {
        alert("Richiesta interrotta");
      } else {
        const s = errorDumps(error);
        alert(s);
      }
    } finally {
      Spinner.hide();
    }
  },
  clear() {
    this.inp.value = "";
    this.inp.focus();
  }

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
    await idbMgr.delete(DATA_KEYS.KEY_CONTEXT);
    await idbMgr.delete(DATA_KEYS.KEY_THREAD);
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

const showQuery = () => {
  const s = UaDb.read(DATA_KEYS.KEY_QUERY);
  if (s)
    wnds.winfo.show(s);
};

const showContextResponse = () => {
  const s = UaDb.read(DATA_KEYS.KEY_RESPONSE);
  if (s)
    wnds.wpre.show(s);
};

const showThread = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD)
  if (!lst) return;
  const s = messages2text(lst);
  // const s = lst.join("\n");
  wnds.wpre.show(s);
};

export const showHtmlThread = async () => {
  const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD)
  if (!lst) return;
  const html = messages2html(lst);
  setResponseHtml(html);
};

const showKnBase = async () => {
  const s = await idbMgr.read(DATA_KEYS.KEY_KNBASE)
  if (!s) return;
  wnds.wpre.show(s);
};

const saveKnBase = async () => {
  const knbase = await idbMgr.read(DATA_KEYS.KEY_KNBASE);
  if (!knbase) {
    alert("Knowledge Base Vuota");
    return;
  }
  let name = await prompt("Nome Knowledge Base");
  if (name) {
    name = name.replace(" ", "_");
    const key = `${DATA_KEYS.KEY_KNBASE_PRE}${name}`;
    await idbMgr.create(key, knbase)
  }
};

const showContesto = async () => {
  const s = await idbMgr.read(DATA_KEYS.KEY_CONTEXT)
  if (!s) return;
  wnds.wpre.show(s);
};

const saveContesto = async () => {
  const contesto = await idbMgr.read(DATA_KEYS.KEY_CONTEXT);
  if (!contesto) {
    alert("Contesto Vuoto");
    return;
  }
  let name = await prompt("Nome Contesto");
  if (name) {
    name = name.replace(" ", "_");
    const key = `${DATA_KEYS.KEY_CONTEXT_PRE}${name}`;
    await idbMgr.create(key, contesto)
  }
};

const saveThread = async () => {
  const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
  if (!thread || thread.length === 0) {
    alert("Nessuna conversazione da salvare.");
    return;
  }
  let name = await prompt("Nome per archiviare la conversazione:");
  if (name) {
    name = name.replace(/\s+/g, '_'); // Sostituisce spazi con underscore
    const key = `${DATA_KEYS.KEY_THREAD_PRE}${name}`;
    await idbMgr.create(key, thread);
    alert(`Conversazione salvata come: ${name}`);
  }
};

const KEY_DESCRIPTIONS = {
  [DATA_KEYS.KEY_KNBASE]: "Knowledge Base Corrente",
  [DATA_KEYS.KEY_CONTEXT]: "Contesto Corrente",
  [DATA_KEYS.KEY_THREAD]: "Conversazione Corrente",
  [DATA_KEYS.KEY_PROVIDER]: "Configurazione Provider",
  [DATA_KEYS.KEY_DOC_TYPE]: "Tipo Documento",
  [DATA_KEYS.KEY_THEME]: "Tema UI (dark/light)",
  [DATA_KEYS.KEY_RESPONSE]: "Risposta Contestuale",
  [DATA_KEYS.KEY_QUERY]: "Query per Creazione Contesto",
  [DATA_KEYS.KEY_DOCS]: "Elenco Documenti Caricati"
};

const getDescriptionForKey = (key) => {
  if (KEY_DESCRIPTIONS[key]) {
    return KEY_DESCRIPTIONS[key];
  }
  if (key.startsWith(DATA_KEYS.KEY_KNBASE_PRE)) {
    return "Knowledge Base";
  }
  if (key.startsWith(DATA_KEYS.KEY_CONTEXT_PRE)) {
    return "Contesto";
  }
  if (key.startsWith(DATA_KEYS.KEY_THREAD_PRE)) {
    return "Conversazione";
  }
  return "Dato non classificato";
};

const elencoDati = async () => {
  const jfh = UaJtfh();
  const idbKeysToShow = [DATA_KEYS.KEY_KNBASE, DATA_KEYS.KEY_CONTEXT, DATA_KEYS.KEY_THREAD];
  // const lsKeysToShow = [DATA_KEYS.KEY_RESPONSE, DATA_KEYS.KEY_QUERY, DATA_KEYS.KEY_DOCS];
  // --- LocalStorage Section ---
  // jfh.append('<h4>LocalStorage</h4>');
  //   jfh.append(`<table class="table-data"><thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead><tbody>`);
  //   for (const key of lsKeysToShow) {
  //     const description = getDescriptionForKey(key);
  //     const value = UaDb.read(key);
  //     const size = value ? value.length : 0;
  //     jfh.append(
  //       `<tr>
  //   <td><a href="#" class="link-show-data" data-key="${key}" data-storage-type="ls">${key}</a></td>
  //   <td>${description}</td>
  //   <td class="size">${size}</td>
  // </tr>`
  //     );
  //   }
  //   jfh.append('</tbody></table>');

  // --- IndexedDB Section ---
  // jfh.append('<h4>IndexedDB</h4>');
  jfh.append(`<table class="table-data"><thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead><tbody>`);
  // Mostra sempre le chiavi principali
  for (const key of idbKeysToShow) {
    const description = getDescriptionForKey(key);
    const value = await idbMgr.read(key);
    const size = value ? JSON.stringify(value).length : 0;
    jfh.append(
      `<tr>
  <td><a href="#" class="link-show-data" data-key="${key}" data-storage-type="idb">${key}</a></td>
  <td>${description}</td>
  <td class="size">${size}</td>
</tr>`
    );
  }
  // Mostra le chiavi archiviate solo se esistono
  const allIdbKeys = await idbMgr.getAllKeys();
  const archivedKeys = allIdbKeys.filter(k => !idbKeysToShow.includes(k));
  for (const key of archivedKeys) {
    const description = getDescriptionForKey(key);
    const value = await idbMgr.read(key);
    const size = value ? JSON.stringify(value).length : 0;
    jfh.append(
      `<tr>
  <td><a href="#" class="link-show-data" data-key="${key}" data-storage-type="idb">${key}</a></td>
  <td>${description}</td>
  <td class="size">${size}</td>
</tr>`
    );
  }
  jfh.append('</tbody></table>');
  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();
  element.querySelectorAll(".link-show-data").forEach(link => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const key = event.currentTarget.dataset.key;
      if (key === DATA_KEYS.KEY_DOCS) {
        const s = DocsMgr.names().join("\n");
        wnds.wpre.show(s, false);
        return;
      }
      const storageType = event.currentTarget.dataset.storageType;
      let data;
      if (storageType === 'ls') {
        data = UaDb.read(key);
      } else if (storageType === 'idb') {
        data = await idbMgr.read(key);
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

const elencoKnBase = async () => {
  const keys = await idbMgr.selectKeys(DATA_KEYS.KEY_KNBASE_PRE);
  const jfh = UaJtfh();
  jfh.append('<div class="knbase-dialog">');
  jfh.append("<h4>Gestione Base di conoscenza</h4>");
  if (Object.keys(keys).length > 0) {
    jfh.append('<table class="table-data">');
    jfh.append('<thead><tr><th>Nome</th><th>Azioni</th></tr></thead>');
    jfh.append('<tbody>');
    for (const key of keys) {
      jfh.append(`
  <tr> 
  <td>${key}</td>
  <td><button class="btn-load-item btn-success" data-item-name="${key}">Carica</button></td>
  <td><button class="btn-delete-item btn-danger" data-item-name="${key}">Elimina</button></td>
  </tr>
  `);
    }
    jfh.append("</tbody></table>");
  } else {
    jfh.append("<p>Nessuna Base di conoscenza trovata.</p>");
  }
  jfh.append("</div>");
  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();

  const handleLoadClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    const knbase = await idbMgr.read(key);
    await idbMgr.create(DATA_KEYS.KEY_KNBASE, knbase);
    const name = key.slice(DATA_KEYS.KEY_KNBASE_PRE.length);
    alert(`Base di conoscenza ${name} caricata`)
  };

  const handleDeleteClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    if (key) {
      const ok = await confirm(`Confermi Eliminazione : ${key}`);
      if (!ok) return;
      await idbMgr.delete(key);
      wnds.winfo.close();
      elencoKnBase();
    }
  };

  element
    .querySelectorAll(".btn-load-item")
    .forEach((btn) => btn.addEventListener("click", handleLoadClick));

  element
    .querySelectorAll(".btn-delete-item")
    .forEach((btn) => btn.addEventListener("click", handleDeleteClick));
};

const elencoContext = async () => {
  const keys = await idbMgr.selectKeys(DATA_KEYS.KEY_CONTEXT_PRE);
  const jfh = UaJtfh();
  jfh.append('<div class="context-dialog">');
  jfh.append("<h4>Gestione Contesti</h4>");
  if (Object.keys(keys).length > 0) {
    jfh.append('<table class="table-data">');
    jfh.append('<thead><tr><th>Nome</th><th>Azioni</th></tr></thead>');
    jfh.append('<tbody>');
    for (const key of keys) {
      jfh.append(`
<tr>
<td>${key}</td>
<td><button class="btn-load-item btn-success" data-item-name="${key}">Carica</button></td>
<td><button class="btn-delete-item btn-danger" data-item-name="${key}">Elimina</button></td>
</tr>
  `);
    }
    jfh.append("</tbody></table>");
  } else {
    jfh.append("<p>Nessun Contesto trovato.</p>");
  }
  jfh.append("</div>");
  wnds.winfo.show(jfh.html());

  const element = wnds.winfo.w.getElement();

  const handleLoadClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    const context = await idbMgr.read(key);
    await idbMgr.create(DATA_KEYS.KEY_CONTEXT, context);
    const name = key.slice(DATA_KEYS.KEY_CONTEXT_PRE.length);
    alert(`Contesto ${name} caricatao`)
  };

  const handleDeleteClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    if (key) {
      const ok = await confirm(`Confermi Eliminazione del contesto: ${key}`);
      if (!ok) return;
      await idbMgr.delete(key);
      wnds.winfo.close();
      elencoContext();
    }
  };

  element
    .querySelectorAll(".btn-load-item")
    .forEach((btn) => btn.addEventListener("click", handleLoadClick));

  element
    .querySelectorAll(".btn-delete-item")
    .forEach((btn) => btn.addEventListener("click", handleDeleteClick));
};

const elencoThreads = async () => {
  const keys = await idbMgr.selectKeys(DATA_KEYS.KEY_THREAD_PRE);
  const jfh = UaJtfh();
  jfh.append('<div class="thread-dialog">');
  jfh.append("<h4>Gestione Conversazioni Archiviate</h4>");
  if (keys.length > 0) {
    jfh.append('<table class="table-data">');
    jfh.append('<thead><tr><th>Nome</th><th>Azioni</th></tr></thead>');
    jfh.append('<tbody>');
    for (const key of keys) {
      jfh.append(`
<tr>
  <td>${key}</td>
  <td><button class="btn-load-item btn-success" data-item-name="${key}">Carica</button></td>
  <td><button class="btn-delete-item btn-danger" data-item-name="${key}">Elimina</button></td>
</tr>
      `);
    }
    jfh.append("</tbody></table>");
  } else {
    jfh.append("<p>Nessuna conversazione archiviata trovata.</p>");
  }
  jfh.append("</div>");
  wnds.winfo.show(jfh.html());

  const element = wnds.winfo.w.getElement();

  const handleLoadClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    const thread = await idbMgr.read(key);
    await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
    const name = key.slice(DATA_KEYS.KEY_THREAD_PRE.length);
    alert(`Conversazione '${name}' caricata come corrente.`);
    showHtmlThread();
    wnds.winfo.close();
  };

  const handleDeleteClick = async (event) => {
    const key = event.currentTarget.dataset.itemName;
    if (key) {
      const ok = await confirm(`Confermi l'eliminazione della conversazione: ${key}?`);
      if (!ok) return;
      await idbMgr.delete(key);
      wnds.winfo.close();
      elencoThreads(); // Ricarica la lista
    }
  };

  element.querySelectorAll(".btn-load-item").forEach(btn => btn.addEventListener("click", handleLoadClick));
  element.querySelectorAll(".btn-delete-item").forEach(btn => btn.addEventListener("click", handleDeleteClick));
};

const calcQuery = () => {
  const calc = () => {
    const arr = [];
    let nptot = 0;
    arr.push("Documento Num.Parti");
    arr.push("==================");
    const docNames = DocsMgr.names();
    for (let i = 0; i < docNames.length; i++) {
      const name = docNames[i];
      const doc = DocsMgr.doc(i);
      const dl = doc.length;
      const mpl = AppMgr.promptSize;
      const np = Math.ceil(dl / mpl);
      nptot += np;
      arr.push(`${name}&nbsp;&nbsp;&nbsp;[${np}]`);
    }
    arr.push("==================");
    arr.push(`Totale num. Parti: ${nptot}`);
    const s = arr.join("\n");
    return s;
  };
  const s = calc();
  wnds.wpre.show(s);
};

const deleteAllData = async () => {
  const jfh = UaJtfh();
  const idbMainKeys = [DATA_KEYS.KEY_KNBASE, DATA_KEYS.KEY_CONTEXT, DATA_KEYS.KEY_THREAD];
  // const lsKeys = [DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_DOC_TYPE, DATA_KEYS.KEY_THEME, DATA_KEYS.KEY_RESPONSE, DATA_KEYS.KEY_QUERY, DATA_KEYS.KEY_DOCS];
  const lsKeys = [DATA_KEYS.KEY_RESPONSE, DATA_KEYS.KEY_QUERY, DATA_KEYS.KEY_DOCS];
  jfh.append('<div class="delete-dialog">');
  jfh.append('<h4>Seleziona Dati da Cancellare</h4>');
  jfh.append('<table class="table-data">');
  // --- LocalStorage Items ---
  jfh.append('<tr><td colspan=2><b>Dati Correnti:</b></td></tr>');
  lsKeys.forEach(key => {
    jfh.append(`
<tr>
  <td><input type="checkbox" data-key="${key}" data-storage="ls"> ${key}</td>
  <td>${getDescriptionForKey(key)}</td>
</tr>`);
  });
  // --- IndexedDB Items ---
  // jfh.append('<tr><td colspan=2><b>Dati Correnti:</b></td></tr>');
  idbMainKeys.forEach(key => {
    jfh.append(`
<tr>
<td><input type="checkbox" data-key="${key}" data-storage="idb"> ${key} </td>
<td>${getDescriptionForKey(key)}</td>
</tr>`);
  });
  // Archived keys (only show if they exist)
  const allIdbPhysicalKeys = await idbMgr.getAllKeys();
  const archivedKeys = allIdbPhysicalKeys.filter(k => !idbMainKeys.includes(k));
  if (archivedKeys.length > 0) {
    jfh.append('<tr><td colspan=2><b>Dati Archiviati:</b></td></tr>');
    archivedKeys.forEach(key => {
      jfh.append(`
<tr>
<td><input type="checkbox" data-key="${key}" data-storage="idb"> ${key}</td>
<td>${getDescriptionForKey(key)}</td>
</tr>`);
    });
  }
  jfh.append('</table>');
  jfh.append('<div class="delete-actions">');
  jfh.append('<button id="delete-selected-btn" class="btn-delete-selected">Cancella Selezionati</button>');
  jfh.append('<button id="delete-all-btn" class="btn-delete-all">Cancella Tutto</button>');
  jfh.append('</div>');
  jfh.append('</div>');
  // console.info(jfh.html())
  wnds.winfo.show(jfh.html());
  const element = wnds.winfo.w.getElement();

  element.querySelector("#delete-selected-btn").addEventListener("click", async () => {
    const keysToDelete = { ls: [], idb: [] };

    element.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const storage = cb.dataset.storage;
      const key = cb.dataset.key;
      if (storage === 'ls') {
        keysToDelete.ls.push(key);
      } else if (storage === 'idb') {
        keysToDelete.idb.push(key);
      }
    });

    if (keysToDelete.ls.length === 0 && keysToDelete.idb.length === 0) {
      alert("Nessun elemento selezionato.");
      return;
    }

    const ok = await confirm("Confermi la cancellazione degli elementi selezionati?");
    if (ok) {
      for (const key of keysToDelete.ls) {
        if (key == DATA_KEYS.KEY_DOCS)
          DocsMgr.deleteAll();
        else
          UaDb.delete(key);
      }

      for (const key of keysToDelete.idb) {
        await idbMgr.delete(key);
        // AAA cancellazione selezionati
        if ([DATA_KEYS.KEY_THREAD, DATA_KEYS.KEY_THREAD_PRE].includes(key)) {
          setResponseHtml("");
        }
      }
      await alert("Dati selezionati cancellati con successo.");
      wnds.winfo.close();
    }
  });

  element.querySelector("#delete-all-btn").addEventListener("click", async () => {
    const ok = await confirm("ATTENZIONE: Stai per cancellare TUTTI i dati gestiti dall'applicazione (LocalStorage e IndexedDB). Confermi?");
    if (ok) {
      UaDb.clear();
      // Clear entire IDB
      await idbMgr.clearAll();
      setResponseHtml(""); //AAA cacellazione risposte
      alert("Tutti i dati dell'applicazione sono stati cancellati.");
      wnds.winfo.close();
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
  document.getElementById("btn-doctype-settings").addEventListener("click", Commands.docTypeSettings);
  document.getElementById("btn-dark-theme").addEventListener("click", () => setTheme("dark"));
  document.getElementById("btn-light-theme").addEventListener("click", () => setTheme("light"));
  // commands links
  document.getElementById("menu-readme").addEventListener("click", showReadme);
  document.getElementById("menu-quickstart").addEventListener("click", showQuickstart);
  document.getElementById("menu-show-config").addEventListener("click", LlmProvider.showConfig);
  document.getElementById("menu-show-knbase").addEventListener("click", showKnBase);
  document.getElementById("menu-save-knbase").addEventListener("click", saveKnBase);

  document.getElementById("menu-show-query").addEventListener("click", showQuery);
  document.getElementById("show-menu-contextresponse").addEventListener("click", showContextResponse);
  document.getElementById("menu-show-thread").addEventListener("click", showThread);
  document.getElementById("menu-show-contesto").addEventListener("click", showContesto);
  document.getElementById("menu-save-contesto").addEventListener("click", saveContesto);

  document.getElementById("menu-elenco-dati").addEventListener("click", elencoDati);
  document.getElementById("menu-elenco-docs").addEventListener("click", elencoDocs);
  document.getElementById("menu-elenco-context").addEventListener("click", elencoContext);
  document.getElementById("menu-elenco-knbase").addEventListener("click", elencoKnBase);
  document.getElementById("menu-save-thread").addEventListener("click", saveThread);
  document.getElementById("menu-elenco-threads").addEventListener("click", elencoThreads);

  document.getElementById("menu-calc-query").addEventListener("click", calcQuery);

  document.getElementById("menu-delete-all").addEventListener("click", deleteAllData);
  document.getElementById("menu-help-esempi").addEventListener("click", showEsempiDocs);

  // TextInput
  const textInput = document.querySelector(".text-input");
  textInput.addEventListener("keydown", (e) => TextInput.handleEnter(e));
  document.querySelector(".send0-input").addEventListener("click", () => TextInput.send0());
  document.querySelector(".send1-input").addEventListener("click", () => TextInput.send1());
  document.querySelector(".send2-input").addEventListener("click", () => TextInput.send2());
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