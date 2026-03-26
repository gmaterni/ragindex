/**
 * @fileoverview app_ui.js - Interfaccia utente e gestione comandi
 * @description Gestisce tutta l'interfaccia UI dell'applicazione RagIndex.
 *              Modulo specifico dell'applicazione.
 *
 * CLASSI CSS DI RIFERIMENTO:
 * - .spinner, .show-spinner: Spinner di caricamento
 * - .spinner-bg: Sfondo spinner sull'output
 * - .menu-btn, .menu-icon, .menu-open: Menu hamburger
 * - .theme-light, .theme-dark: Temi UI
 * - .text-input, .text-out: Aree input/output testo
 * - .div-text, .pre-text: Contenitori testo
 * - .btn-copy, .btn-close: Pulsanti finestra
 * - .window-text, .window-info: Finestre modali
 * - .table-data: Tabelle dati
 * - .provider-tree-container, .provider-tree: Albero selezione provider
 *
 * @module app_ui
 */
"use strict";

import { UaWindowAdm } from "./services/uawindow.js";
import { UaJtfh } from "./services/uajtfh.js";
import { UaLog } from "./services/ualog3.js";
import { help0_html, help1_html, help2_html } from "./services/help.js";
import { documentUploader } from "./uploader.js";
import { AppMgr } from "./app_mgr.js";
import { UaDb } from "./services/uadb.js";
import { DocsMgr } from "./docs_mgr.js";
import { LlmProvider } from "./llm_provider.js";
import { textFormatter, messages2html, messages2text } from "./services/history_utils.js";
import { ragEngine } from "./rag_engine.js";
import { DATA_KEYS, getDescriptionForKey } from "./services/data_keys.js";
import { idbMgr } from "./services/idb_mgr.js";
import { requestGet } from "./services/http_request.js";
import { cleanDoc } from "./services/text_cleaner.js";
import { addApiKey } from "./services/key_retriever.js";
import { UaSender } from "./services/sender.js";
import { WebId } from "./services/webuser_id.js";

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Stato della knowledge base attiva.
 * @type {string}
 */
export let activeKbState = "Nessuna KB attiva";

// ============================================================================
// FUNZIONI PRIVATE - Spinner
// ============================================================================

const _Spinner = {
    show: () => {
        const p = document.querySelector("#id-text-out .div-text");
        p.classList.add("spinner-bg");

        const spinner = document.getElementById("spinner");
        spinner.classList.add("show-spinner");
        spinner.addEventListener("click", _Spinner.stop);
    },

    hide: () => {
        const p = document.querySelector("#id-text-out .div-text");
        p.classList.remove("spinner-bg");

        const spinner = document.getElementById("spinner");
        spinner.classList.remove("show-spinner");
        spinner.removeEventListener("click", _Spinner.stop);
    },

    stop: async () => {
        const confirmed = await confirm("Confermi Cancellazione Richiesta?");

        if (confirmed) {
            AppMgr.getClientLLM().cancelRequest();
            ragEngine.stop();
            _Spinner.hide();
        }
    }
};

// ============================================================================
// FUNZIONI PRIVATE - Window Factories
// ============================================================================

const _WndPre = (id) => {
    const win = {
        w: UaWindowAdm.create(id)
    };

    win.show = function (s, delAll = true) {
        if (delAll) {
            wnds.closeAll();
        }

        win.w.drag().setZ(12);

        const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
        win.w.vw_vh().setXY(xPos, 5, 1);

        const html = `
        <div class="window-text">
          <div class="btn-wrapper">
            <button class="btn-copy wcp tt-left" data-tt="Copia" onclick="wnds.wpre.copy()">
              <svg class="copy-icon" viewBox="0 0 20 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
              </svg>
            </button>
            <button class="btn-close wcl tt-left" data-tt="chiudi" onclick="wnds.wpre.close()">X</button>
          </div>
          <pre class="pre-text">${s}</pre>
        </div>
      `;

        win.w.setHtml(html);
        win.w.show();
    };

    win.close = function () {
        win.w.close();
    };

    win.copy = async function () {
        const t = win.w.getElement().querySelector(".pre-text").textContent;

        try {
            await navigator.clipboard.writeText(t);
        } catch (err) {
            console.error(err);
        }
    };

    return win;
};

const _WndDiv = (id) => {
    const win = {
        w: UaWindowAdm.create(id)
    };

    win.show = function (s, delAll = true) {
        if (delAll) {
            wnds.closeAll();
        }

        win.w.drag().setZ(12);

        const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
        win.w.vw_vh().setXY(xPos, 5, 1);

        const html = `
        <div class="window-text">
          <div class="btn-wrapper">
            <button class="btn-copy wcp tt-left" data-tt="Copia" onclick="wnds.wdiv.copy()">
              <svg class="copy-icon" viewBox="0 0 20 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
              </svg>
            </button>
            <button class="btn-close wcl tt-left" data-tt="chiudi" onclick="wnds.wdiv.close()">X</button>
          </div>
          <div class="div-text">${s}</div>
        </div>
      `;

        win.w.setHtml(html);
        win.w.show();
    };

    win.close = function () {
        win.w.close();
    };

    win.copy = async function () {
        const t = win.w.getElement().querySelector(".div-text").textContent;

        try {
            await navigator.clipboard.writeText(t);
        } catch (err) {
            console.error(err);
        }
    };

    return win;
};

const _WndInfo = (id) => {
    const win = {
        w: UaWindowAdm.create(id)
    };

    win.showe = function (s) {
        win.show(`<pre class="pre-text">${s}</pre>`);
    };

    win.show = function (s, delAll = true) {
        if (delAll) {
            wnds.closeAll();
        }

        win.w.drag().setZ(11);

        const xPos = document.body.classList.contains("menu-open") ? 21 : 1;
        win.w.vw_vh().setXY(xPos, 5, -1);

        const content = typeof s === "string" ? `<div>${s}</div>` : s.innerHTML || s;

        const html = `
        <div class="window-info">
          <div class="btn-wrapper">
            <button class="btn-close tt-left" onclick="wnds.winfo.close()">X</button>
          </div>
          <div class="div-info">${content}</div>
        </div>
      `;

        win.w.setHtml(html);
        win.w.show();
    };

    win.close = function () {
        win.w.close();
    };

    return win;
};

// ============================================================================
// FUNZIONI PRIVATE - UI Helpers
// ============================================================================

const _setResponseHtml = (html) => {
    const p = document.querySelector("#id-text-out .div-text");
    p.innerHTML = html;
    p.scrollTop = p.scrollHeight;
};

const _setTheme = async (theme) => {
    document.body.classList.toggle("theme-light", theme === "light");
    document.body.classList.toggle("theme-dark", theme !== "light");
    await UaDb.save(DATA_KEYS.KEY_THEME, theme);
};

const _showReadme = () => {
    wnds.wdiv.show(help1_html);
};

const _showQuickstart = () => {
    wnds.wdiv.show(help2_html);
};

const _viewConversation = async () => {
    const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD);

    if (lst) {
        wnds.wpre.show(messages2text(lst));
    } else {
        alert("Nessuna conversazione attiva.");
    }
};

const _viewContext = async () => {
    const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);

    if (context) {
        wnds.wpre.show(context);
    } else {
        alert("Nessun contesto.");
    }
};

const _saveKnowledgeBase = async () => {
    const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
    const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);

    if (!chunks || !index) {
        alert("Crea prima una KB.");
        return;
    }

    let name = await prompt("Nome per archiviare la KB:");

    if (name?.trim()) {
        name = name.replace(/\s+/g, "_");
        await idbMgr.create(`${DATA_KEYS.KEY_KB_PRE}${name}`, { chunks, serializedIndex: index });
        await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, name);
        await updateActiveKbDisplay();
        alert(`Knowledge Base archiviata come: ${name}`);
    }
};

const _saveConversation = async () => {
    const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
    const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);

    if (!thread || thread.length === 0) {
        alert("Nessuna conversazione attiva.");
        return;
    }

    let name = await prompt("Nome per archiviare la Conversazione:");

    if (name?.trim()) {
        name = name.replace(/\s+/g, "_");
        await idbMgr.create(`${DATA_KEYS.KEY_CONVO_PRE}${name}`, { context, thread });
        alert(`Conversazione archiviata come: ${name}`);
    }
};

const _loadKnowledgeBase = async (key) => {
    const data = await idbMgr.read(key);

    if (data?.chunks && data.serializedIndex) {
        await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, data.chunks);
        await idbMgr.create(DATA_KEYS.PHASE1_INDEX, data.serializedIndex);
        await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, key.slice(DATA_KEYS.KEY_KB_PRE.length));
        await updateActiveKbDisplay();
        alert("KB caricata.");
    } else {
        alert("Errore KB non valida.");
    }
};

const _loadConversation = async (key) => {
    const data = await idbMgr.read(key);

    if (data?.thread) {
        await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, data.context || "");
        await idbMgr.create(DATA_KEYS.KEY_THREAD, data.thread);
        alert("Conversazione caricata.");
        await showHtmlThread();
    } else {
        alert("Errore Conversazione non valida.");
    }
};

const _logout = () => {
    WebId.clear();
    window.location.replace("login.html");
};

const _showEsempiDocs = async () => {
    const text = await requestGet("./data/help_test.html");
    wnds.winfo.show(text);

    const element = wnds.winfo.w.getElement();

    element.querySelectorAll(".doc-esempio").forEach((link) => {
        link.onclick = async (event) => {
            event.preventDefault();

            const name = event.currentTarget.dataset.exampleName;

            if (name) {
                const textContent = await requestGet(`data/${name}`);

                if (!await DocsMgr.exists(name)) {
                    await DocsMgr.add(name, cleanDoc(textContent));
                    wnds.winfo.close();
                }
            }
        };
    });
};

// ============================================================================
// API PUBBLICA - Windows Manager
// ============================================================================

export const wnds = {
    wdiv: null,
    wpre: null,
    winfo: null,

    init: function () {
        wnds.wdiv = _WndDiv("id-wnd-div");
        wnds.wpre = _WndPre("id-wnd-pre");
        wnds.winfo = _WndInfo("id-wnd-info");
        window.wnds = wnds;
    },

    closeAll: function () {
        wnds.wdiv?.close();
        wnds.wpre?.close();
        wnds.winfo?.close();
    }
};

// ============================================================================
// API PUBBLICA - Commands
// ============================================================================

export const Commands = {
    init: () => { },

    help: () => {
        wnds.wdiv.show(help0_html);
    },

    upload: () => {
        documentUploader.open();
    },

    log: () => {
        UaLog.toggle();
    },

    providerSettings: () => {
        LlmProvider.toggleTreeView();
    }
};

// ============================================================================
// API PUBBLICA - TextInput
// ============================================================================

export const TextInput = {
    inp: null,

    init: () => {
        TextInput.inp = document.querySelector(".text-input");
    },

    handleEnter: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            TextInput.continueConversation();
        }
    },

    clear: () => {
        TextInput.inp.value = "";
        TextInput.inp.focus();
    },

    createKnowledge: async () => {
        UaLog.log("Creazione Knowledge Base...");

        const docNames = await DocsMgr.names();
        const docs = [];

        for (let i = 0; i < docNames.length; i++) {
            const t = await DocsMgr.doc(i);
            docs.push({ name: docNames[i], text: t });
        }

        const validDocuments = docs.filter((doc) => doc.text && doc.text.trim() !== "");

        if (validDocuments.length === 0) {
            alert("Nessun documento valido.");
            return;
        }

        const confirmed = await confirm(`Crea KB da ${validDocuments.length} documenti?`);

        if (!confirmed) {
            return;
        }

        _Spinner.show();
        UaSender.sendEventAsync("ragindex", "createKnowledge");

        setTimeout(async () => {
            try {
                const { chunks, serializedIndex: chunksIndex } = await ragEngine.createKnowledgeBase(validDocuments);

                await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, chunks);
                await idbMgr.create(DATA_KEYS.PHASE1_INDEX, chunksIndex);
                await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                await updateActiveKbDisplay();

                alert(`KB creata: ${chunks.length} frammenti.`);
            } catch (error) {
                if (error && error.code === 499) return; // Ignora interruzione manuale
                const msg = error.message || error;
                const code = error.code ? `[${error.code}] ` : "";
                alert(`ERRORE CRITICO:\n${code}${msg}`);
                console.error("Dettaglio errore:", error);
            } finally {
                _Spinner.hide();
            }
        }, 50);
    },

    startConversation: async () => {
        const query = TextInput.inp.value.trim();

        if (!query) {
            alert("Inserisci una query.");
            return;
        }

        const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
        const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);

        if (!index) {
            alert("Esegui Azione 1.");
            return;
        }

        _Spinner.show();
        UaSender.sendEventAsync("ragindex", "startConversation");

        setTimeout(async () => {
            try {
                await idbMgr.delete(DATA_KEYS.KEY_THREAD);

                const kbData = { index: index, chunks: chunks };
                const thread = [{ role: "user", content: query }];

                await AppMgr.initConfig();

                // 1. Workflow RAG: Ottieni il contesto (con eventuale distillazione)
                const context = await ragEngine.getOptimizedContext(query, kbData, thread);
                await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, context);

                // 2. Generazione finale
                const answer = await ragEngine.generateResponse(context, thread);

                thread.push({ role: "assistant", content: answer });
                await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
                await showHtmlThread();

                TextInput.clear();
            } catch (error) {
                if (error && error.code === 499) return; // Ignora interruzione manuale
                const msg = error.message || error;
                const code = error.code ? `[${error.code}] ` : "";
                alert(`ERRORE CRITICO:\n${code}${msg}`);
                console.error("Dettaglio errore:", error);
            } finally {
                _Spinner.hide();
            }
        }, 50);
    },

    continueConversation: async () => {
        const query = TextInput.inp.value.trim();

        if (!query) {
            alert("Inserisci una query.");
            return;
        }

        _Spinner.show();

        setTimeout(async () => {
            try {
                let thread = await idbMgr.read(DATA_KEYS.KEY_THREAD) || [];
                const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
                const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
                const kbData = { index: index, chunks: chunks };

                thread.push({ role: "user", content: query });
                await AppMgr.initConfig();

                // 1. Ottieni contesto (già salvato o nullo per follow-up)
                const context = await ragEngine.getOptimizedContext(query, kbData, thread);

                // 2. Generazione finale
                const answer = await ragEngine.generateResponse(context, thread);

                thread.push({ role: "assistant", content: answer });
                await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
                await showHtmlThread();

                TextInput.clear();
            } catch (error) {
                if (error && error.code === 499) return; // Ignora interruzione manuale
                const msg = error.message || error;
                const code = error.code ? `[${error.code}] ` : "";
                alert(`ERRORE CRITICO:\n${code}${msg}`);
                console.error("Dettaglio errore:", error);
            } finally {
                _Spinner.hide();
            }
        }, 50);
    }
};

// ============================================================================
// API PUBBLICA - TextOutput
// ============================================================================

export const TextOutput = {
    copyBtn: null,

    init: () => {
        TextOutput.copyBtn = document.querySelector(".copy-output");
    },

    copy: async () => {
        const pre = document.querySelector("#id-text-out .div-text");

        if (pre.textContent.trim().length < 2) {
            return;
        }

        try {
            await navigator.clipboard.writeText(textFormatter(pre.textContent));
            pre.classList.add("copied");

            setTimeout(() => {
                pre.classList.remove("copied");
            }, 2000);
        } catch (err) {
            console.error(err);
        }
    },

    clearHistory: async () => {
        const confirmed = await confirm("Nuova conversazione?");

        if (confirmed) {
            await idbMgr.delete(DATA_KEYS.KEY_THREAD);
            _setResponseHtml("");
        }
    },

    clearHistoryContext: async () => {
        const confirmed = await confirm("Nuovo Contesto & Conversazione?");

        if (confirmed) {
            await idbMgr.delete(DATA_KEYS.PHASE2_CONTEXT);
            await idbMgr.delete(DATA_KEYS.KEY_THREAD);
            // FIXME cacellazione thread e contesto
            // await idbMgr.delete(DATA_KEYS.PHASE0_CHUNKS);
            // await idbMgr.delete(DATA_KEYS.PHASE1_INDEX);
            // await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
            await updateActiveKbDisplay();
            _setResponseHtml("");
        }
    }
};

// ============================================================================
// API PUBBLICA - Theme & Display
// ============================================================================

export const getTheme = async () => {
    const t = await UaDb.read(DATA_KEYS.KEY_THEME);
    document.body.classList.toggle("theme-light", t === "light");
    document.body.classList.toggle("theme-dark", t !== "light");
};

export const updateActiveKbDisplay = async () => {
    const el = document.getElementById("active-kb-display");

    if (!el) {
        return;
    }

    const chunksExist = await idbMgr.exists(DATA_KEYS.PHASE0_CHUNKS);
    const indexExist = await idbMgr.exists(DATA_KEYS.PHASE1_INDEX);

    if (!chunksExist || !indexExist) {
        activeKbState = "Nessuna KB attiva";
        await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
    } else {
        const savedName = await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME);
        activeKbState = savedName || "BASE CORRENTE";
    }

    el.textContent = `KB: ${activeKbState}`;
};

export const showHtmlThread = async () => {
    const lst = await idbMgr.read(DATA_KEYS.KEY_THREAD);

    if (lst) {
        _setResponseHtml(messages2html(lst));
    }
};

// ============================================================================
// API PUBBLICA - Event Binding
// ============================================================================

export const bindEventListener = () => {
    document.getElementById("btn-help").onclick = Commands.help;
    document.getElementById("btn-upload").onclick = Commands.upload;
    document.getElementById("id_log").onclick = Commands.log;
    document.getElementById("btn-provider-settings").onclick = Commands.providerSettings;

    document.getElementById("btn-dark-theme").onclick = () => {
        _setTheme("dark");
    };

    document.getElementById("btn-light-theme").onclick = () => {
        _setTheme("light");
    };

    document.getElementById("menu-readme").onclick = _showReadme;
    document.getElementById("menu-quickstart").onclick = _showQuickstart;
    document.getElementById("menu-show-config").onclick = LlmProvider.showConfig;
    document.getElementById("menu-save-kb").onclick = _saveKnowledgeBase;
    document.getElementById("menu-elenco-kb").onclick = () => {
        const keys = idbMgr.selectKeys(DATA_KEYS.KEY_KB_PRE);
        keys.then(k => {
            const jfh = UaJtfh();
            jfh.append('<div class="data-dialog">');
            jfh.append(`<h4>Gestione Knowledge Base</h4>`);
            if (k.length > 0) {
                jfh.append('<table class="table-data">');
                jfh.append('<thead><tr><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                k.forEach(key => {
                    const dName = key.slice(DATA_KEYS.KEY_KB_PRE.length);
                    jfh.append(`<tr><td>${dName}</td><td>`);
                    jfh.append(`<button class="btn-load-item btn-success" onclick="wnds.loadKB('${key}')">Carica</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger" style="margin-left:5px" onclick="wnds.deleteKB('${key}')">Elimina</button>`);
                    jfh.append('</td></tr>');
                });
                jfh.append('</tbody></table></div>');

                wnds.loadKB = async (key) => {
                    await _loadKnowledgeBase(key);
                    wnds.winfo.close();
                };
                wnds.deleteKB = async (key) => {
                    const dName = key.slice(DATA_KEYS.KEY_KB_PRE.length);
                    if (await confirm(`Confermi l'eliminazione di '${dName}'?`)) {
                        await idbMgr.delete(key);
                        const currentActive = await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME);
                        if (currentActive === dName) await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                        await updateActiveKbDisplay();
                        wnds.winfo.close();
                    }
                };
                wnds.winfo.show(jfh.html());
            } else {
                jfh.append(`<p>Nessuna Knowledge Base archiviata.</p></div>`);
                wnds.winfo.show(jfh.html());
            }
        });
    };
    document.getElementById("menu-view-convo").onclick = _viewConversation;
    document.getElementById("menu-save-convo").onclick = _saveConversation;
    document.getElementById("menu-elenco-convo").onclick = () => {
        const keys = idbMgr.selectKeys(DATA_KEYS.KEY_CONVO_PRE);
        keys.then(k => {
            const jfh = UaJtfh();
            jfh.append('<div class="data-dialog">');
            jfh.append(`<h4>Gestione Conversazioni</h4>`);
            if (k.length > 0) {
                jfh.append('<table class="table-data">');
                jfh.append('<thead><tr><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                k.forEach(key => {
                    const dName = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
                    jfh.append(`<tr><td>${dName}</td><td>`);
                    jfh.append(`<button class="btn-load-item btn-success" onclick="wnds.loadConvo('${key}')">Carica</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger" style="margin-left:5px" onclick="wnds.deleteConvo('${key}')">Elimina</button>`);
                    jfh.append('</td></tr>');
                });
                jfh.append('</tbody></table></div>');

                wnds.loadConvo = async (key) => {
                    await _loadConversation(key);
                    wnds.winfo.close();
                };
                wnds.deleteConvo = async (key) => {
                    const dName = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
                    if (await confirm(`Confermi l'eliminazione di '${dName}'?`)) {
                        await idbMgr.delete(key);
                        wnds.winfo.close();
                    }
                };
                wnds.winfo.show(jfh.html());
            } else {
                jfh.append(`<p>Nessuna conversazione archiviata.</p></div>`);
                wnds.winfo.show(jfh.html());
            }
        });
    };
    document.getElementById("menu-view-context").onclick = _viewContext;
    document.getElementById("menu-elenco-docs").onclick = () => {
        DocsMgr.names().then(arr => {
            const jfh = UaJtfh();
            jfh.append('<div class="docs-dialog">');
            jfh.append('<div class="docs-header">');
            jfh.append('<div class="docs-controls">');
            jfh.append('<label class="select-all-label">');
            jfh.append('<input type="checkbox" id="select-all-docs-checkbox" onclick="document.querySelectorAll(\'.doc-checkbox\').forEach(cb => cb.checked = this.checked)"> Seleziona tutto');
            jfh.append('</label>');
            jfh.append('<div class="docs-btn-group">');
            jfh.append('<button class="btn-warning btn-small" id="delete-selected-docs-btn" onclick="wnds.deleteSelectedDocs()">Cancella Selezionati</button>');
            jfh.append('<button class="btn-danger btn-small" id="clear-all-docs-btn" onclick="wnds.clearAllDocs()">Svuota Tutto</button>');
            jfh.append('</div>');
            jfh.append('</div></div>');

            if (arr.length > 0) {
                jfh.append('<table class="table-data">');
                jfh.append('<thead><tr><th>Selez.</th><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                arr.forEach((name, i) => {
                    jfh.append('<tr>');
                    jfh.append(`<td><input type="checkbox" class="doc-checkbox" data-doc-name="${name}"></td>`);
                    jfh.append(`<td>${name}</td>`);
                    jfh.append(`<td><button class="link-show-doc btn-success" onclick="wnds.showDoc(${i})">Visualizza</button></td>`);
                    jfh.append('</tr>');
                });
                jfh.append('</tbody></table>');
            } else {
                jfh.append('<p>Nessun documento caricato.</p>');
            }
            jfh.append('</div>');

            wnds.showDoc = async (i) => {
                const text = await DocsMgr.doc(i);
                wnds.wpre.show(text, false);
            };
            wnds.deleteSelectedDocs = async () => {
                const sel = document.querySelectorAll(".doc-checkbox:checked");
                if (sel.length && await confirm(`Confermi l'eliminazione di ${sel.length} documenti?`)) {
                    for (const cb of sel) await DocsMgr.delete(cb.dataset.docName);
                    wnds.winfo.close();
                }
            };
            wnds.clearAllDocs = async () => {
                if (await confirm("Confermi lo svuotamento totale della Knowledge Base? Questa operazione NON elimina le configurazioni o le chiavi API.")) {
                    await DocsMgr.deleteAll();
                    wnds.winfo.close();
                }
            };
            wnds.winfo.show(jfh.html());
        });
    };
    document.getElementById("menu-elenco-dati").onclick = async () => {
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

        const staticLsKeys = [DATA_KEYS.KEY_THEME, DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_API_KEYS, DATA_KEYS.ACTIVE_KB_NAME, DATA_KEYS.KEY_BUILD_STATE];
        const lsFound = [];

        for (const k of staticLsKeys) {
            const val = await UaDb.read(k);
            if (val) lsFound.push({ key: k, val });
        }

        // Funzione globale per showData
        wnds.showData = async (key, type) => {
            const data = type === "ls" ? await UaDb.read(key) : await idbMgr.read(key);
            const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
            wnds.wpre.show(content, false);
        };

        const jfh = UaJtfh();
        jfh.append('<div>');
        jfh.append('<h4>Dati in IndexedDB</h4>');

        if (idbKeysToDisplay.length > 0) {
            jfh.append('<table class="table-data">');
            jfh.append('<thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead>');
            jfh.append('<tbody>');

            idbKeysToDisplay.forEach((item) => {
                jfh.append('<tr>');
                jfh.append(`<td><a href="#" class="link-show-data" onclick="event.preventDefault(); wnds.showData('${item.key}', 'idb')">${item.key}</a></td>`);
                jfh.append(`<td>${item.desc}</td>`);
                jfh.append(`<td class="size">${(item.size / 1024).toFixed(2)} KB</td>`);
                jfh.append('</tr>');
            });

            jfh.append('</tbody></table>');
        } else {
            jfh.append('<p>Nessun dato in IndexedDB.</p>');
        }

        jfh.append('<h4>Impostazioni e Configurazioni</h4>');

        if (lsFound.length > 0) {
            jfh.append('<table class="table-data">');
            jfh.append('<thead><tr><th>Chiave</th><th>Descrizione</th><th>Dimensione</th></tr></thead>');
            jfh.append('<tbody>');

            lsFound.forEach((item) => {
                jfh.append('<tr>');
                jfh.append(`<td><a href="#" class="link-show-data" onclick="event.preventDefault(); wnds.showData('${item.key}', 'ls')">${item.key}</a></td>`);
                jfh.append(`<td>${getDescriptionForKey(item.key)}</td>`);
                jfh.append(`<td class="size">${item.val ? item.val.length : 0} bytes</td>`);
                jfh.append('</tr>');
            });

            jfh.append('</tbody></table>');
        } else {
            jfh.append('<p>Nessuna impostazione trovata.</p>');
        }

        jfh.append('</div>');
        wnds.winfo.show(jfh.html());
    };
    document.getElementById("menu-delete-all").onclick = async () => {
        const idbKeys = [];
        const lsKeys = [];

        const staticIdb = [DATA_KEYS.PHASE0_CHUNKS, DATA_KEYS.PHASE1_INDEX, DATA_KEYS.PHASE2_CONTEXT, DATA_KEYS.KEY_THREAD];
        for (const k of staticIdb) {
            if (await idbMgr.exists(k)) idbKeys.push(k);
        }

        const kbKeys = await idbMgr.selectKeys(DATA_KEYS.KEY_KB_PRE);
        idbKeys.push(...kbKeys);

        const convoKeys = await idbMgr.selectKeys(DATA_KEYS.KEY_CONVO_PRE);
        idbKeys.push(...convoKeys);

        const buildChunks = await idbMgr.selectKeys(DATA_KEYS.KEY_CHUNK_RES_PRE);
        idbKeys.push(...buildChunks);

        const buildKbs = await idbMgr.selectKeys(DATA_KEYS.KEY_DOC_KB_PRE);
        idbKeys.push(...buildKbs);

        const staticLs = [DATA_KEYS.KEY_THEME, DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_API_KEYS, DATA_KEYS.ACTIVE_KB_NAME, DATA_KEYS.KEY_BUILD_STATE];
        for (const k of staticLs) {
            if (await UaDb.read(k)) lsKeys.push(k);
        }

        const jfh = UaJtfh();
        jfh.append('<div class="delete-dialog">');
        jfh.append('<h4>Seleziona Dati da Cancellare</h4>');

        if (idbKeys.length > 0) {
            jfh.append('<div style="display:flex; justify-content: space-between; align-items: center;">');
            jfh.append('<h5>Dati Principali (IndexedDB)</h5>');
            jfh.append('<label style="font-size: 0.8em; cursor:pointer">');
            jfh.append('<input type="checkbox" onclick="document.querySelectorAll(\'.del-idb-cb\').forEach(cb => cb.checked = this.checked)"> Seleziona tutto');
            jfh.append('</label></div>');
            jfh.append('<table class="table-data">');

            idbKeys.forEach((k) => {
                jfh.append('<tr>');
                jfh.append(`<td><input type="checkbox" class="del-idb-cb" data-key="${k}" data-storage="idb"> ${k}</td>`);
                jfh.append(`<td>${getDescriptionForKey(k)}</td>`);
                jfh.append('</tr>');
            });

            jfh.append('</table>');
        }

        if (lsKeys.length > 0) {
            jfh.append('<div style="display:flex; justify-content: space-between; align-items: center; margin-top:10px">');
            jfh.append('<h5>Impostazioni</h5>');
            jfh.append('<label style="font-size: 0.8em; cursor:pointer">');
            jfh.append('<input type="checkbox" onclick="document.querySelectorAll(\'.del-ls-cb\').forEach(cb => cb.checked = this.checked)"> Seleziona tutto');
            jfh.append('</label></div>');
            jfh.append('<table class="table-data">');

            lsKeys.forEach((k) => {
                jfh.append('<tr>');
                jfh.append(`<td><input type="checkbox" class="del-ls-cb" data-key="${k}" data-storage="ls"> ${k}</td>`);
                jfh.append(`<td>${getDescriptionForKey(k)}</td>`);
                jfh.append('</tr>');
            });

            jfh.append('</table>');
        }

        jfh.append('<div class="delete-actions" style="margin-top:20px; display:flex; gap:10px">');
        jfh.append('<button class="btn-delete-selected" onclick="wnds.deleteSelectedData()">Cancella Selezionati</button>');
        jfh.append('<button class="btn-delete-all" id="delete-all-btn" onclick="wnds.deleteAllEverything()">Cancella Tutto</button>');
        jfh.append('</div></div>');

        wnds.deleteSelectedData = async () => {
            const idbSel = Array.from(document.querySelectorAll(".del-idb-cb:checked"));
            const lsSel = Array.from(document.querySelectorAll(".del-ls-cb:checked"));

            if (idbSel.length === 0 && lsSel.length === 0) {
                alert("Nessun elemento selezionato.");
                return;
            }

            const confirmed = await confirm("Confermi la cancellazione dei dati selezionati?");

            if (confirmed) {
                for (const cb of idbSel) {
                    await idbMgr.delete(cb.dataset.key);
                }

                for (const cb of lsSel) {
                    const key = cb.dataset.key;

                    if (key.startsWith(DATA_KEYS.KEY_DOC_PRE)) {
                        await DocsMgr.delete(key.slice(DATA_KEYS.KEY_DOC_PRE.length));
                    } else {
                        await UaDb.delete(key);
                    }
                }

                alert("Dati selezionati cancellati.");
                wnds.winfo.close();
                await updateActiveKbDisplay();
            }
        };

        wnds.deleteAllEverything = async () => {
            const confirmed = await confirm("ATTENZIONE: Questa azione cancellerà OGNI DATO dell'applicazione in modo irreversibile. Confermi?");

            if (confirmed) {
                await idbMgr.clearAll();
                localStorage.clear();
                location.reload();
            }
        };

        wnds.winfo.show(jfh.html());
    };
    document.getElementById("menu-help-esempi").onclick = _showEsempiDocs;
    document.getElementById("menu-add-api-key").onclick = addApiKey;
    document.getElementById("menu-logout").onclick = _logout;

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
    const label = document.querySelector("#id-menu-icon-label");
    btn.onchange = () => {
        document.body.classList.toggle("menu-open", btn.checked);
        label.setAttribute("data-tt", btn.checked ? "Close" : "Open");
    };
};
