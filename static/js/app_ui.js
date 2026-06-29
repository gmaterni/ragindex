/**
 * app_ui.js - Interfaccia utente e gestione comandi.
 *
 * Gestisce l'interazione con il DOM, la creazione di finestre modali,
 * il sistema di comandi e l'aggiornamento dinamico della UI.
 *
 * @module  app_ui
 * @version 1.1.3
 * @date    2026-05-01
 * @author  Gemini CLI
 */

"use strict";

import { UaWindowAdm } from "./services/uawindow.js";
import { UaJtfh } from "./services/uajtfh.js";
import { UaLog } from "./services/ualog3.js";
import { help0_html, help2_html } from "./services/help.js";
import { documentUploader } from "./uploader.js";
import { AppMgr } from "./app_mgr.js";
import { UaDb } from "./services/uadb.js";
import { DocsMgr } from "./docs_mgr.js";
import { LlmProvider } from "./llm_provider.js";
import { textFormatter, messages2html, messages2text } from "./services/history_utils.js";
import { ragEngine } from "./rag_engine.js";
import { DATA_KEYS, getDescriptionForKey, REGEX_NAME_CLEANER } from "./services/data_keys.js";
import { idbMgr } from "./services/idb_mgr.js";
import { BackupMgr } from "./services/backup_mgr.js";
import { addApiKey, restoreDefaultApiKeys } from "./services/key_retriever.js";
import { UaSender } from "./services/sender.js";
import { WebId } from "./services/webuser_id.js";

// ============================================================================
// COSTANTI DI MODULO
// ============================================================================

const CSS_SPINNER_BG = "spinner-bg";
const CSS_SHOW_SPINNER = "show-spinner";
const CSS_MENU_OPEN = "menu-open";


// ============================================================================
// STATO DEL MODULO
// ============================================================================

/** @type {string} Stato della knowledge base attiva. */
export let activeKbState = "Nessuna KB attiva";


// ============================================================================
// COMPONENTE SPINNER
// ============================================================================

/**
 * Gestore dell'indicatore di caricamento (Spinner).
 * Utilizza una closure per incapsulare la logica.
 */
const _Spinner = (function () {
  /**
   * Recupera gli elementi DOM necessari.
   * @returns {Object} Elementi outputArea, spinner e content.
   */
  const _getElements = function () {
    const els = {
      outputArea: document.querySelector("#id-text-out .div-text"),
      spinner: document.getElementById("spinner"),
      spinnerContent: document.querySelector("#spinner .spinner-content"),
    };
    return els;
  };

  /**
   * Interrompe le operazioni in corso dopo conferma.
   * @param {Event} event - L'evento click.
   */
  const stopAsync = async function (event) {
    if (event) {
      event.stopPropagation();
    }
    const confirmed = await confirm("Confermi lo STOP?");
    if (confirmed) {
      const client = AppMgr.getClientLLM();
      if (client && typeof client.cancelRequest === "function") {
        client.cancelRequest();
      }
      ragEngine.stop();
      hide();
    }
  };

  /**
   * Mostra lo spinner.
   */
  const show = function () {
    const { spinner, spinnerContent } = _getElements();

    if (spinner) {
      spinner.classList.add(CSS_SHOW_SPINNER);
    }

    if (spinnerContent) {
      spinnerContent.addEventListener("click", stopAsync);
    }
  };

  /**
   * Nasconde lo spinner.
   */
  const hide = function () {
    const { outputArea, spinner, spinnerContent } = _getElements();

    if (outputArea) {
      outputArea.classList.remove(CSS_SPINNER_BG);
    }

    if (spinner) {
      spinner.classList.remove(CSS_SHOW_SPINNER);
    }

    if (spinnerContent) {
      spinnerContent.removeEventListener("click", stopAsync);
    }
  };

  return {
    show: show,
    hide: hide,
  };
})();


// ============================================================================
// FACTORY FINESTRE
// ============================================================================

/**
 * Factory base per finestre con pulsante copia e chiusura.
 */
const _UaWindowFactory = function(id, contentClass, copyMethodName, showCopy = true) {
    const _win = UaWindowAdm.create(id);

    const close = function() {
        _win.close();
    };

    const copyAsync = async function() {
        const selector = `.${contentClass}`;
        const element = _win.getElement().querySelector(selector);
        
        if (!element) return;
        
        const text = element.textContent;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error(`_UaWindowFactory.copyAsync (${id}):`, err);
        }
    };

    const show = function(content, delAll = true) {
        if (delAll) wnds.closeAll();

        _win.drag().setZ(12);

        const isMenuOpen = document.body.classList.contains(CSS_MENU_OPEN);
        const xPos = isMenuOpen ? 22 : 2;
        _win.vw_vh().setXY(xPos, 6, 1);

        const copyBtnHtml = showCopy ? `
                    <button class="btn-copy wcp tt-left" data-tt="Copia" onclick="wnds.${copyMethodName}.copy()">
                        <svg class="icon copy-icon" viewBox="0 0 24 24">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
                        </svg>
                    </button>
                    <button class="btn-close wcl tt-left" data-tt="Chiudi" onclick="wnds.${copyMethodName}.close()">X</button>
                    ` : `
                    <button class="btn-copy wcl tt-left" data-tt="Chiudi" onclick="wnds.${copyMethodName}.close()">
                        <svg class="icon close-icon-yellow" viewBox="0 0 24 24">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                    </button>
                    `;
        const contentTag = contentClass === "pre-text" ? "pre" : "div";

        const html = `
            <div class="window-text">
                <div class="btn-wrapper">
                    ${copyBtnHtml}
                </div>
                <${contentTag} class="${contentClass}">${content}</${contentTag}>
            </div>
        `;

        _win.setHtml(html);
        _win.show();
    };

    const api = { show, close, copy: copyAsync };
    return api;
};

/**
 * Factory specifica per finestre informative (Info).
 */
const _UaWindowInfoFactory = function(id) {
    const _win = UaWindowAdm.create(id);

    const close = function() {
        _win.close();
    };

    const show = function(content, delAll = true) {
        if (delAll) wnds.closeAll();

        _win.drag().setZ(11);

        const isMenuOpen = document.body.classList.contains(CSS_MENU_OPEN);
        const xPos = isMenuOpen ? 22 : 2;
        _win.vw_vh().setXY(xPos, 6, -1);

        const innerContent = typeof content === "string" ? `<div>${content}</div>` : (content.innerHTML || content);

        const html = `
            <div class="window-info">
                <div class="btn-wrapper">
                    <button class="btn-close tt-left" data-tt="Chiudi" onclick="wnds.winfo.close()">X</button>
                </div>
                <div class="div-info">${innerContent}</div>
            </div>
        `;

        _win.setHtml(html);
        _win.show();
    };

    const showPre = function(text) {
        const content = `<pre class="pre-text">${text}</pre>`;
        show(content);
    };

    const getElement = function() {
        const el = _win.getElement();
        return el;
    };

    const api = { show, showe: showPre, close, getElement };
    return api;
};


// ============================================================================
// COMPONENTE HELP POPUP (Tooltip Personalizzati)
// ============================================================================

const HelpPopup = (function() {
    let _popupEl = null;
    let _hideTimer = null;

    const _createPopup = function() {
        if (_popupEl) return;
        _popupEl = document.createElement("div");
        _popupEl.className = "help-popup-window";
        _popupEl.style.display = "none";
        document.body.appendChild(_popupEl);
    };

    const show = function(event, text) {
        _createPopup();
        if (_hideTimer) {
            clearTimeout(_hideTimer);
            _hideTimer = null;
        }
        _popupEl.innerHTML = text;
        _popupEl.classList.remove("visible");
        _popupEl.style.display = "block";

        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        const pWidth = _popupEl.offsetWidth;
        const pHeight = _popupEl.offsetHeight;
        
        let top, left;
        const isMenu = el.closest(".menu-box");

        if (isMenu) {
            const menuBox = document.querySelector(".menu-box");
            const menuRect = menuBox.getBoundingClientRect();
            left = menuRect.right + 8;
            top = rect.top + (rect.height / 2) - (pHeight / 2);
        } else {
            top = rect.top - pHeight - 12;
            left = rect.left + (rect.width / 2) - (pWidth / 2);

            if (top < 10 || el.closest(".head-wrapper")) {
                top = rect.bottom + 12;
            }
        }
        
        if (left < 10) left = 10;
        if (left + pWidth > window.innerWidth - 10) {
            left = window.innerWidth - pWidth - 10;
        }

        if (top + pHeight > window.innerHeight - 10) {
            top = rect.top - pHeight - 12;
        }
        if (top < 10) top = 10;

        _popupEl.style.top = `${top}px`;
        _popupEl.style.left = `${left}px`;

        void _popupEl.offsetWidth;
        _popupEl.classList.add("visible");
    };

    const hide = function() {
        if (_hideTimer) return;
        _hideTimer = setTimeout(function() {
            if (_popupEl) {
                _popupEl.classList.remove("visible");
                setTimeout(function() {
                    _popupEl.style.display = "none";
                }, 200);
            }
            _hideTimer = null;
        }, 300);
    };

    const bind = function(id, text) {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeAttribute("data-tt");
        el.removeAttribute("title");
        const classesToRemove = Array.from(el.classList).filter(c => c.startsWith("tt-"));
        classesToRemove.forEach(c => el.classList.remove(c));
        const trigger = el.closest("li") || el;
        trigger.addEventListener("mouseenter", (e) => show(e, text));
        trigger.addEventListener("mouseleave", hide);
        trigger.addEventListener("click", hide);
    };

    const api = { bind };
    return api;
})();


// ============================================================================
// HELPER PRIVATI
// ============================================================================

const _setResponseHtml = function(html) {
    const outputContainer = document.querySelector("#id-text-out .div-text");
    if (!outputContainer) return;
    outputContainer.innerHTML = html;
    outputContainer.scrollTo({ top: outputContainer.scrollHeight, behavior: "smooth" });
};

const _updateThemeAsync = async function(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("theme-light", isLight);
    document.body.classList.toggle("theme-dark", !isLight);
    
    const btn = document.getElementById("btn-theme-toggle");
    if (btn) {
        const sunIcon = btn.querySelector(".icon-sun");
        const moonIcon = btn.querySelector(".icon-moon");
        if (sunIcon && moonIcon) {
            sunIcon.style.display = isLight ? "none" : "block";
            moonIcon.style.display = isLight ? "block" : "none";
        }
        btn.setAttribute("data-tt", isLight ? "Tema Scuro" : "Tema Chiaro");
    }
    
    await UaDb.save(DATA_KEYS.KEY_THEME, theme);
};

const toggleThemeAsync = async function() {
    const currentTheme = document.body.classList.contains("theme-light") ? "light" : "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    await _updateThemeAsync(newTheme);
};


// ============================================================================
/**
 * Ricostruisce l'indice Lunr nel main thread da child chunk già pronti.
 * Usato per rebuild indice senza rieseguire NLP (chunking) sui documenti.
 *
 * @param {Array<Object>} indexEntries - Array di {id, body, keywords, entities}.
 * @returns {Promise<string>} Indice Lunr serializzato in JSON.
 */
const _rebuildLunrIndex = async function(indexEntries) {
    const idx = window.lunr(function() {
        this.use(window.lunr.it);
        this.ref("id");
        this.field("body");
        indexEntries.forEach((entry) => {
            const keywordsStr = (entry.keywords || []).join(" ");
            const entitiesStr = (entry.entities || []).join(" ");
            const fullText = entry.body + " " + keywordsStr + " " + entitiesStr;
            this.add({ id: entry.id, body: fullText });
        });
    });
    const serialized = JSON.stringify(idx);
    return serialized;
};

// ============================================================================
// GESTORI AZIONI MENU (Privati)
// ============================================================================

const _actionShowReadme = function() { window.open("readme.html", "_blank"); };
const _actionShowQuickstart = function() { wnds.wdiv.show(help2_html); };

const _actionViewConversationAsync = async function() {
    const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
    if (!thread) { await alert("Nessuna conversazione attiva."); return; }
    wnds.wpre.show(messages2text(thread));
};

const _actionViewContextAsync = async function() {
    const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
    if (!context) { await alert("Nessun contesto disponibile."); return; }
    wnds.wpre.show(context);
};

const _actionSaveKnowledgeBaseAsync = async function() {
    const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
    const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
    if (!chunks || !index) { await alert("Creare prima una KB valida."); return; }

    const nameRaw = await prompt("Nome per archiviare la Knowledge Base:");
    if (nameRaw === null) return;
    const nameTrimmed = nameRaw.trim();
    if (nameTrimmed.length === 0) return;

    const sanitizedName = nameTrimmed.replace(REGEX_NAME_CLEANER, "_").replace(/_+/g, "_");
    const storageKey = `${DATA_KEYS.KEY_KB_PRE}${sanitizedName}`;
    const doclist = await idbMgr.read(DATA_KEYS.KB_DOCLIST) || [];
    const childchunks = await idbMgr.read(DATA_KEYS.KB_CHILDCHUNKS) || {};
    await idbMgr.create(storageKey, { chunks, serializedIndex: index, doclist, childchunks });
    await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, sanitizedName);
    await updateActiveKbDisplay();
    await alert(`Knowledge Base archiviata con successo: ${sanitizedName}`);
};

const _actionDeleteKnowledgeBaseAsync = async function() {
    const hasChunks = await idbMgr.exists(DATA_KEYS.PHASE0_CHUNKS);
    if (!hasChunks) { await alert("Nessuna Knowledge Base attiva da cancellare."); return; }
    if (!await confirm("Cancellare completamente la Knowledge Base attiva?")) return;
    await idbMgr.delete(DATA_KEYS.PHASE0_CHUNKS);
    await idbMgr.delete(DATA_KEYS.PHASE1_INDEX);
    await idbMgr.delete(DATA_KEYS.KB_DOCLIST);
    await idbMgr.delete(DATA_KEYS.KB_CHILDCHUNKS);
    await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
    await updateActiveKbDisplay();
    UaLog.log(">>> Knowledge Base cancellata. <<<");
};

const _actionClearContextAsync = async function() {
    const hasContext = await idbMgr.exists(DATA_KEYS.PHASE2_CONTEXT);
    const hasThread = await idbMgr.exists(DATA_KEYS.KEY_THREAD);
    if (!hasContext && !hasThread) { await alert("Nessun contesto e nessuna conversazione da cancellare."); return; }
    if (!await confirm("Cancellare contesto e l'intera conversazione (prima domanda inclusa)?")) return;
    await idbMgr.delete(DATA_KEYS.PHASE2_CONTEXT);
    await idbMgr.delete(DATA_KEYS.KEY_THREAD);
    _setResponseHtml("");
    UaLog.log(">>> Contesto e conversazione cancellati. <<<");
};

const _actionClearConversazioneAsync = async function() {
    const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
    if (!thread || thread.length === 0) { await alert("Nessuna conversazione da cancellare."); return; }
    const hasContext = await idbMgr.exists(DATA_KEYS.PHASE2_CONTEXT);
    if (!hasContext) {
        if (!await confirm("Cancellare l'intera conversazione? (nessun contesto presente)")) return;
        await idbMgr.delete(DATA_KEYS.KEY_THREAD);
        _setResponseHtml("");
        UaLog.log(">>> Conversazione cancellata. <<<");
        return;
    }
    if (thread.length < 2) { await alert("Nessuna conversazione successiva da cancellare."); return; }
    if (!await confirm("Cancellare solo i messaggi successivi alla prima domanda? (contesto e prima domanda restano)")) return;
    const firstMessage = thread[0];
    await idbMgr.create(DATA_KEYS.KEY_THREAD, [firstMessage]);
    await showHtmlThread();
    UaLog.log(">>> Messaggi successivi alla prima domanda cancellati. <<<");
};

const _actionSaveConversationAsync = async function() {
    const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT);
    const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
    if (!thread || thread.length === 0) { await alert("Nessuna conversazione attiva."); return; }

    const nameRaw = await prompt("Nome per archiviare la Conversazione:");
    if (nameRaw === null) return;
    const nameTrimmed = nameRaw.trim();
    if (nameTrimmed.length === 0) return;

    const sanitizedName = nameTrimmed.replace(REGEX_NAME_CLEANER, "_").replace(/_+/g, "_");
    const storageKey = `${DATA_KEYS.KEY_CONVO_PRE}${sanitizedName}`;
    await idbMgr.create(storageKey, { context, thread });
    await alert(`Conversazione archiviata con successo: ${sanitizedName}`);
};

const _actionLoadKnowledgeBaseAsync = async function(key) {
    if (!key) return;
    const data = await idbMgr.read(key);
    if (data && data.chunks && data.serializedIndex) {
        await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, data.chunks);
        await idbMgr.create(DATA_KEYS.PHASE1_INDEX, data.serializedIndex);
        if (data.doclist) {
            await idbMgr.create(DATA_KEYS.KB_DOCLIST, data.doclist);
        }
        if (data.childchunks) {
            await idbMgr.create(DATA_KEYS.KB_CHILDCHUNKS, data.childchunks);
        }
        const name = key.slice(DATA_KEYS.KEY_KB_PRE.length);
        await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, name);
        await updateActiveKbDisplay();
        await alert("Knowledge Base caricata correttamente.");
    } else {
        await alert("ERRORE: I dati della KB non sono validi.");
    }
};

const _actionLoadConversationAsync = async function(key) {
    if (!key) return;
    const data = await idbMgr.read(key);
    if (data && data.thread) {
        await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, data.context || "");
        await idbMgr.create(DATA_KEYS.KEY_THREAD, data.thread);
        await alert("Conversazione caricata correttamente.");
        await showHtmlThread();
    } else {
        await alert("ERRORE: I dati della conversazione non sono validi.");
    }
};

const _actionLogout = function() { WebId.clear(); window.location.replace("login.html"); };

const _actionShowProcessedDocs = async function() {
    const kbDoclist = await idbMgr.read(DATA_KEYS.KB_DOCLIST) || [];
    const allDocNames = await DocsMgr.names() || [];
    const jfh = UaJtfh();
    jfh.append('<div><h4>Documenti Processati nella KB</h4>');
    if (kbDoclist.length === 0) {
        jfh.append('<p>Nessuna Knowledge Base ancora costruita.</p>');
    } else {
        jfh.append('<table class="table-data"><tbody>');
        kbDoclist.forEach(function(name) {
            const stillPresent = allDocNames.includes(name);
            const status = stillPresent
                ? '<span class="status-presente">presente</span>'
                : '<span class="status-assente">rimosso</span>';
            jfh.append('<tr><td>' + name + '</td><td>' + status + '</td></tr>');
        });
        jfh.append('</tbody></table>');
    }
    jfh.append('</div>');
    wnds.winfo.show(jfh.html());
};


// ============================================================================
// API PUBBLICA - Windows (wnds)
// ============================================================================

export const wnds = {
    wdiv: null, wpre: null, winfo: null,
    init: function() {
        wnds.wdiv = _UaWindowFactory("id-wnd-div", "div-text", "wdiv", false);
        wnds.wpre = _UaWindowFactory("id-wnd-pre", "pre-text", "wpre");
        wnds.winfo = _UaWindowInfoFactory("id-wnd-info");
        window.wnds = wnds;
    },
    closeAll: function() {
        if (wnds.wdiv) wnds.wdiv.close();
        if (wnds.wpre) wnds.wpre.close();
        if (wnds.winfo) wnds.winfo.close();
    },
    editLastQuestion: async function() {
        const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
        if (!thread || thread.length === 0) return;
        let lastUserIndex = -1;
        for (let i = thread.length - 1; i >= 0; i--) {
            if (thread[i].role === "user") { lastUserIndex = i; break; }
        }
        if (lastUserIndex === -1) return;
        const lastQuestion = thread[lastUserIndex].content;
        const newThread = thread.slice(0, lastUserIndex);
        await idbMgr.create(DATA_KEYS.KEY_THREAD, newThread);
        if (TextInput._inputEl) {
            TextInput._inputEl.value = lastQuestion;
            TextInput._inputEl.focus();
            TextInput._inputEl.setSelectionRange(lastQuestion.length, lastQuestion.length);
        }
        await showHtmlThread();
    }
};


// ============================================================================
// API PUBBLICA - Comandi Generali (Commands)
// ============================================================================

export const Commands = {
    init: function() {},
    help: function() { wnds.wdiv.show(help0_html); },
    upload: function() { documentUploader.open(); },
    log: function() {
        UaLog.toggle();
        const btn = document.getElementById("id_log");
        if (btn) {
            btn.setAttribute("data-tt", UaLog.active ? "Close" : "Open");
        }
    },
    providerSettings: function() { LlmProvider.toggleTreeView(); },
    resetAll: async function() {
        const msg1 = "Primo avviso: sta per eseguire un RESET TOTALE dell'applicazione.\n\nVerranno cancellati TUTTI i dati: Knowledge Base, contesto, conversazioni, documenti, chiavi API e configurazione provider.\n\nConfermi?";
        if (!await confirm(msg1)) return;
        const msg2 = "SECONDO AVVISO: conferma definitiva.\n\nTutti i dati verranno persi. L'applicazione tornerà allo stato iniziale.\n\nProcedere?";
        if (!await confirm(msg2)) return;
        localStorage.clear();
        await idbMgr.clearAll();
        location.reload();
    }
};


// ============================================================================
// API PUBBLICA - Input Utente (TextInput)
// ============================================================================

export const TextInput = {
    _inputEl: null,
    init: function() { TextInput._inputEl = document.querySelector(".text-input"); },
    handleEnter: function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            TextInput.continueConversationAsync();
        }
    },
    clear: function() {
        if (TextInput._inputEl) { TextInput._inputEl.value = ""; TextInput._inputEl.focus(); }
    },
    createKnowledgeAsync: async function() {
        UaLog.log("Inizio creazione Knowledge Base...");
        const docNames = await DocsMgr.names();
        const documents = [];
        for (let i = 0; i < docNames.length; i++) {
            const content = await DocsMgr.doc(i);
            documents.push({ name: docNames[i], text: content });
        }
        const validDocs = documents.filter(doc => doc.text && doc.text.trim().length > 0);
        if (validDocs.length === 0) { await alert("Nessun documento valido trovato."); return; }

        // Leggi KB esistente
        const existingDoclist = await idbMgr.read(DATA_KEYS.KB_DOCLIST) || [];
        const existingChildChunks = await idbMgr.read(DATA_KEYS.KB_CHILDCHUNKS) || {};

        const existingSet = new Set(existingDoclist);
        const newDocs = validDocs.filter(function(d) { return !existingSet.has(d.name); });
        const newDocNames = newDocs.map(function(d) { return d.name; });

        if (existingDoclist.length === 0) {
            // --- FULL REBUILD (nessuna KB preesistente) ---
            if (!await confirm(`Creare KB da ${validDocs.length} documenti?`)) return;
            _Spinner.show();
            await UaSender.sendEventAsync("ragindex", "createKnowledge");
            setTimeout(async function() {
                try {
                    const kbData = await ragEngine.createKnowledgeBase(validDocs);
                    const { chunks, serializedIndex, childEntries } = kbData;
                    await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, chunks);
                    await idbMgr.create(DATA_KEYS.PHASE1_INDEX, serializedIndex);

                    const childChunksByDoc = {};
                    if (childEntries) {
                        for (const entry of childEntries) {
                            childChunksByDoc[entry.docName] = entry.children;
                        }
                    }
                    await idbMgr.create(DATA_KEYS.KB_CHILDCHUNKS, childChunksByDoc);

                    // KB_DOCLIST include tutti i doc processati
                    const allDocNames = validDocs.map(function(d) { return d.name; });
                    await idbMgr.create(DATA_KEYS.KB_DOCLIST, allDocNames);

                    await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                    await updateActiveKbDisplay();
                    await alert(`Knowledge Base creata: ${chunks.length} frammenti.`);
                } catch (error) {
                    if (error && error.code === 499) return;
                    await alert(`ERRORE CRITICO:\n${error.message || error}`);
                } finally { _Spinner.hide(); }
            }, 50);
        } else if (newDocs.length === 0) {
            await alert("Tutti i documenti sono già stati elaborati nella KB esistente. Nessun nuovo documento da aggiungere.");
            return;
        } else {
            // --- INCREMENTALE ---
            if (!await confirm(`Aggiungere ${newDocs.length} nuovo/i documento/i alla KB esistente (${existingDoclist.length} doc processati)?`)) return;
            _Spinner.show();
            await UaSender.sendEventAsync("ragindex", "createKnowledge");
            setTimeout(async function() {
                try {
                    // 1. Carica chunk esistenti
                    const existingParents = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS) || [];

                    // 2. Calcola startDocIndex oltre tutti gli indici esistenti
                    let maxDocIdx = -1;
                    for (const chunk of existingParents) {
                        const match = chunk.id.match(/^d(\d+)p/);
                        if (match) {
                            const idx = parseInt(match[1], 10);
                            if (idx > maxDocIdx) maxDocIdx = idx;
                        }
                    }
                    const nextDocIndex = maxDocIdx + 1;

                    // 3. Chunka solo i nuovi documenti
                    const chunkResult = await ragEngine.chunkDocumentsAsync(newDocs, nextDocIndex);

                    // 4. Unisci parent chunk
                    const allParents = existingParents.concat(chunkResult.parents);

                    // 5. Unisci child chunk (mantieni esistenti, aggiungi nuovi)
                    const allChildChunks = Object.assign({}, existingChildChunks);
                    for (const entry of chunkResult.childEntries) {
                        allChildChunks[entry.docName] = entry.children;
                    }

                    // 6. Ricostruisci indice da TUTTI i child chunk
                    const allIndexEntries = [];
                    for (const docName of Object.keys(allChildChunks)) {
                        const children = allChildChunks[docName];
                        for (const child of children) {
                            allIndexEntries.push(child);
                        }
                    }
                    const serializedIndex = await _rebuildLunrIndex(allIndexEntries);

                    // 7. Salva tutto
                    await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, allParents);
                    await idbMgr.create(DATA_KEYS.PHASE1_INDEX, serializedIndex);
                    await idbMgr.create(DATA_KEYS.KB_CHILDCHUNKS, allChildChunks);

                    // KB_DOCLIST: mantieni doc esistenti + aggiungi nuovi
                    const allDocNames = existingDoclist.concat(newDocNames);
                    await idbMgr.create(DATA_KEYS.KB_DOCLIST, allDocNames);

                    await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                    await updateActiveKbDisplay();
                    await alert(`Knowledge Base aggiornata: +${newDocs.length} documento/i, ${allParents.length} frammenti totali.`);
                } catch (error) {
                    if (error && error.code === 499) return;
                    await alert(`ERRORE CRITICO:\n${error.message || error}`);
                } finally { _Spinner.hide(); }
            }, 50);
        }
    },
    startConversationAsync: async function() {
        if (!TextInput._inputEl) return;
        const query = TextInput._inputEl.value.trim();
        if (query.length === 0) { await alert("Inserisci una domanda."); return; }
        const index = await idbMgr.read(DATA_KEYS.PHASE1_INDEX);
        const chunks = await idbMgr.read(DATA_KEYS.PHASE0_CHUNKS);
        
        // TODO: Stato indice
        console.debug("startConversationAsync - index exists:", !!index);
        UaLog.log(`Indice presente: ${!!index}`);

        if (!index) { await alert("Eseguire l'Azione 1 prima."); return; }

        _Spinner.show();
        await UaSender.sendEventAsync("ragindex", "startConversation");
        setTimeout(async function() {
            try {
                await idbMgr.delete(DATA_KEYS.KEY_THREAD);
                const kbData = { index, chunks };
                const thread = [{ role: "user", content: query }];
                await AppMgr.initConfig();
                const context = await ragEngine.getOptimizedContext(query, kbData, thread);
                await idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, context);
                const answer = await ragEngine.generateResponse(context, thread);
                thread.push({ role: "assistant", content: answer });
                await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
                await showHtmlThread();
                TextInput.clear();
            } catch (error) {
                if (error && error.code === 499) return;
                await alert(`ERRORE CRITICO:\n${error.message || error}`);
            } finally { _Spinner.hide(); }
        }, 50);
    },
    continueConversationAsync: async function() {
        if (!TextInput._inputEl) return;
        const query = TextInput._inputEl.value.trim();
        if (query.length === 0) { await alert("Inserisci una domanda."); return; }

        _Spinner.show();
        setTimeout(async function() {
            try {
                const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD) || [];
                const context = await idbMgr.read(DATA_KEYS.PHASE2_CONTEXT) || "";

                thread.push({ role: "user", content: query });
                await AppMgr.initConfig();
                
                const answer = await ragEngine.generateResponse(context, thread);
                thread.push({ role: "assistant", content: answer });
                await idbMgr.create(DATA_KEYS.KEY_THREAD, thread);
                await showHtmlThread();
                TextInput.clear();
            } catch (error) {
                if (error && error.code === 499) return;
                await alert(`ERRORE CRITICO:\n${error.message || error}`);
            } finally { _Spinner.hide(); }
        }, 50);
    }
};


// ============================================================================
// API PUBBLICA - Output e Cronologia (TextOutput)
// ============================================================================

export const TextOutput = {
    init: function() {},
    copyAsync: async function() {
        const outputEl = document.querySelector("#id-text-out .div-text");
        const rawText = outputEl ? outputEl.textContent.trim() : "";
        if (rawText.length < 2) return;
        try {
            await navigator.clipboard.writeText(textFormatter(rawText));
            const btn = document.getElementById("btn-copy-output");
            if (btn) { btn.classList.add("copied"); setTimeout(() => btn.classList.remove("copied"), 2000); }
        } catch (err) { console.error("TextOutput.copyAsync:", err); }
    },
    clearHistoryAsync: async function() {
        if (await confirm("Vuoi iniziare una nuova conversazione?")) {
            await idbMgr.delete(DATA_KEYS.KEY_THREAD);
            _setResponseHtml("");
        }
    },
    clearHistoryAndContextAsync: async function() {
        if (await confirm("Vuoi resettare COMPLETAMENTE l'applicazione? (Verranno cancellati: Chat, Contesto e Knowledge Base attiva)")) {
            // Cancella Contesto e Conversazione
            await idbMgr.delete(DATA_KEYS.PHASE2_CONTEXT);
            await idbMgr.delete(DATA_KEYS.KEY_THREAD);
            
            // Cancella la Knowledge Base attiva (Indice e Chunks)
            await idbMgr.delete(DATA_KEYS.PHASE0_CHUNKS);
            await idbMgr.delete(DATA_KEYS.PHASE1_INDEX);
            await idbMgr.delete(DATA_KEYS.KB_DOCLIST);
            await idbMgr.delete(DATA_KEYS.KB_CHILDCHUNKS);
            await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);

            await updateActiveKbDisplay();
            _setResponseHtml("");
            UaLog.log(">>> Reset Totale completato: sistema riportato allo stato iniziale. <<<");
        }
    }
};


// ============================================================================
// API PUBBLICA - Utility UI
// ============================================================================

export const getTheme = async function() {
    const theme = await UaDb.read(DATA_KEYS.KEY_THEME) || "dark";
    await _updateThemeAsync(theme);
};

export const updateActiveKbDisplay = async function() {
    const displayEl = document.getElementById("active-kb-display");
    if (!displayEl) return;
    const hasChunks = await idbMgr.exists(DATA_KEYS.PHASE0_CHUNKS);
    const hasIndex = await idbMgr.exists(DATA_KEYS.PHASE1_INDEX);
    if (!hasChunks || !hasIndex) {
        activeKbState = "Nessuna KB attiva";
        await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
    } else {
        const savedName = await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME);
        activeKbState = savedName || "BASE CORRENTE";
    }
    displayEl.textContent = `KB: ${activeKbState}`;
};

export const showHtmlThread = async function() {
    const thread = await idbMgr.read(DATA_KEYS.KEY_THREAD);
    if (thread) _setResponseHtml(messages2html(thread));
};


// ============================================================================
// ASSOCIAZIONE EVENTI (Event Binding)
// ============================================================================

export const bindEventListener = function() {
    
    // Pulsanti Header
    const ids = {
        "btn-help": Commands.help,
        "btn-upload": Commands.upload,
        "id_log": Commands.log,
        "btn-provider-settings": Commands.providerSettings,
        "btn-theme-toggle": toggleThemeAsync,
        "menu-readme": _actionShowReadme,
        "menu-quickstart": _actionShowQuickstart,
        "menu-save-kb": _actionSaveKnowledgeBaseAsync,
        "menu-restore-kb": async () => { 
            const n = await BackupMgr.importKbAsync(); 
            if (n) {
                const key = `${DATA_KEYS.KEY_KB_PRE}${n}`;
                await _actionLoadKnowledgeBaseAsync(key);
                UaLog.log(`Knowledge Base "${n}" ripristinata e attivata.`);
            }
        },
        "menu-processed-docs": _actionShowProcessedDocs,
        "menu-view-convo": _actionViewConversationAsync,
        "menu-view-context": _actionViewContextAsync,
        "menu-clear-context": _actionClearContextAsync,
        "menu-clear-conversazione": _actionClearConversazioneAsync,
        "menu-save-convo": _actionSaveConversationAsync,
        "menu-restore-convo": async () => { 
            const n = await BackupMgr.importConvoAsync(); 
            if (n) {
                const key = `${DATA_KEYS.KEY_CONVO_PRE}${n}`;
                await _actionLoadConversationAsync(key);
                UaLog.log(`Conversazione "${n}" ripristinata e attivata.`);
            }
        },
        "menu-default-api-keys": restoreDefaultApiKeys,
        "menu-add-api-key": addApiKey,
        "menu-reset": Commands.resetAll,
        "menu-logout": _actionLogout,
        "menu-create-kb": TextInput.createKnowledgeAsync,
        "menu-delete-kb": _actionDeleteKnowledgeBaseAsync,
        "btn-action2-start-convo": TextInput.startConversationAsync,
        "btn-action3-continue-convo": TextInput.continueConversationAsync,
        "btn-copy-output": TextOutput.copyAsync
    };

    Object.entries(ids).forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    });

    // Eventi specifici per elementi con classi
    const elClearInput = document.querySelector(".clear-input");
    if (elClearInput) elClearInput.onclick = TextInput.clear;

    const elTextInput = document.querySelector(".text-input");
    if (elTextInput) elTextInput.onkeydown = TextInput.handleEnter;

    const menuElencoKb = document.getElementById("menu-elenco-kb");
    if (menuElencoKb) {
        menuElencoKb.onclick = async function() {
            const keys = await idbMgr.selectKeys(DATA_KEYS.KEY_KB_PRE);
            const jfh = UaJtfh();
            jfh.append('<div class="data-dialog"><h4>Gestione Knowledge Base</h4>');
            
            if (keys.length > 0) {
                jfh.append('<div class="docs-header">');
                jfh.append('<label><input type="checkbox" onclick="document.querySelectorAll(\'.kb-checkbox\').forEach(cb => cb.checked = this.checked)"> Seleziona Tutto</label>');
                jfh.append('<button class="btn-warning btn-small btn-ml15" onclick="wnds.deleteSelectedKB()">Elimina Selezionati</button>');
                jfh.append('</div>');

                jfh.append('<table class="table-data"><thead><tr><th>Sel.</th><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                keys.forEach(key => {
                    const name = key.slice(DATA_KEYS.KEY_KB_PRE.length);
                    const displayName = name.replace(/_/g, " ");
                    jfh.append('<tr>');
                    jfh.append(`<td><input type="checkbox" class="kb-checkbox" data-key="${key}"></td>`);
                    jfh.append(`<td>${displayName}</td><td><button class="btn-load-item btn-success" onclick="wnds.loadKB('${key}')">Attiva</button>`);
                    jfh.append(`<button class="btn-warning btn-small btn-ml5" onclick="wnds.exportKB('${key}')">Backup</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger btn-ml5" onclick="wnds.deleteKB('${key}')">Elimina</button></td></tr>`);
                });
                jfh.append('</tbody></table></div>');

                wnds.loadKB = async (k) => { await _actionLoadKnowledgeBaseAsync(k); wnds.winfo.close(); };
                wnds.exportKB = async (k) => { await BackupMgr.exportItemAsync(k, "KB"); };
                
                wnds.deleteSelectedKB = async () => {
                    const sel = document.querySelectorAll(".kb-checkbox:checked");
                    if (sel.length && await confirm(`Eliminare le ${sel.length} KB selezionate?`)) {
                        for (const cb of sel) {
                            const k = cb.dataset.key;
                            const name = k.slice(DATA_KEYS.KEY_KB_PRE.length);
                            await idbMgr.delete(k);
                            if (await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME) === name) await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                        }
                        await updateActiveKbDisplay();
                        wnds.winfo.close();
                    }
                };

                wnds.deleteKB = async (k) => { 
                    const name = k.slice(DATA_KEYS.KEY_KB_PRE.length);
                    if (await confirm(`Eliminare "${name}"?`)) { 
                        await idbMgr.delete(k); 
                        if (await UaDb.read(DATA_KEYS.ACTIVE_KB_NAME) === name) await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                        await updateActiveKbDisplay(); wnds.winfo.close();
                    }
                };
            } else jfh.append('<p>Nessuna KB archiviata.</p></div>');
            wnds.winfo.show(jfh.html());
        };
    }

    const menuElencoConvo = document.getElementById("menu-elenco-convo");
    if (menuElencoConvo) {
        menuElencoConvo.onclick = async function() {
            const keys = await idbMgr.selectKeys(DATA_KEYS.KEY_CONVO_PRE);
            const jfh = UaJtfh();
            jfh.append('<div class="data-dialog"><h4>Gestione Conversazioni</h4>');

            if (keys.length > 0) {
                jfh.append('<div class="docs-header">');
                jfh.append('<label><input type="checkbox" onclick="document.querySelectorAll(\'.convo-checkbox\').forEach(cb => cb.checked = this.checked)"> Seleziona Tutto</label>');
                jfh.append('<button class="btn-warning btn-small btn-ml15" onclick="wnds.deleteSelectedConvo()">Elimina Selezionate</button>');
                jfh.append('</div>');

                jfh.append('<table class="table-data"><thead><tr><th>Sel.</th><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                keys.forEach(key => {
                    const name = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
                    const displayName = name.replace(/_/g, " ");
                    jfh.append('<tr>');
                    jfh.append(`<td><input type="checkbox" class="convo-checkbox" data-key="${key}"></td>`);
                    jfh.append(`<td>${displayName}</td><td><button class="btn-load-item btn-success" onclick="wnds.loadConvo('${key}')">Attiva</button>`);
                    jfh.append(`<button class="btn-warning btn-small btn-ml5" onclick="wnds.exportConvo('${key}')">Backup</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger btn-ml5" onclick="wnds.deleteConvo('${key}')">Elimina</button></td></tr>`);
                });
                jfh.append('</tbody></table></div>');

                wnds.loadConvo = async (k) => { await _actionLoadConversationAsync(k); wnds.winfo.close(); };
                wnds.exportConvo = async (k) => { await BackupMgr.exportItemAsync(k, "CHAT"); };

                wnds.deleteSelectedConvo = async () => {
                    const sel = document.querySelectorAll(".convo-checkbox:checked");
                    if (sel.length && await confirm(`Eliminare le ${sel.length} conversazioni selezionate?`)) {
                        for (const cb of sel) {
                            await idbMgr.delete(cb.dataset.key);
                        }
                        wnds.winfo.close();
                    }
                };

                wnds.deleteConvo = async (k) => { if (await confirm('Eliminare conversazione?')) { await idbMgr.delete(k); wnds.winfo.close(); } };
            } else jfh.append('<p>Nessuna conversazione archiviata.</p></div>');
            wnds.winfo.show(jfh.html());
        };
    }

    const menuElencoDocs = document.getElementById("menu-elenco-docs");
    if (menuElencoDocs) {
        menuElencoDocs.onclick = async function() {
            const arr = await DocsMgr.names();
            const jfh = UaJtfh();
            jfh.append('<div class="docs-dialog"><div class="docs-header docs-header-start"><label><input type="checkbox" onclick="document.querySelectorAll(\'.doc-checkbox\').forEach(cb => cb.checked = this.checked)"> Tutto</label>');
            jfh.append('<button class="btn-danger btn-small btn-ml8" onclick="wnds.delDocs()">Elimina</button></div>');
            if (arr.length > 0) {
                jfh.append('<table class="table-data"><tbody>');
                arr.forEach((name, i) => jfh.append(`<tr><td><input type="checkbox" class="doc-checkbox" data-doc-name="${name}"></td><td>${name}</td><td><button class="btn-success" onclick="wnds.viewDoc(${i})">Visualizza</button></td></tr>`));
                jfh.append('</tbody></table>');
            } else jfh.append('<p>Nessun documento.</p>');
            jfh.append('</div>');
            wnds.viewDoc = async (i) => wnds.wpre.show(await DocsMgr.doc(i));
            wnds.delDocs = async () => {
                const sel = document.querySelectorAll(".doc-checkbox:checked");
                if (sel.length && await confirm(`Eliminare ${sel.length} documenti?`)) {
                    for (const cb of sel) await DocsMgr.delete(cb.dataset.docName);
                    wnds.winfo.close();
                }
            };
            wnds.winfo.show(jfh.html());
        };
    }

    const menuElencoDati = document.getElementById("menu-elenco-dati");
    if (menuElencoDati) {
        menuElencoDati.onclick = async function() {
            const jfh = UaJtfh();
            const kvRecords = await idbMgr.getAllRecords();
            const settingIds = await UaDb.getAllIds();

            const _kv = (k) => kvRecords.find(r => r.key === k);

            const _size = (v) => {
                if (v === null || v === undefined) return '-';
                const s = typeof v === 'string' ? v.length : JSON.stringify(v).length;
                return s > 1024 ? `${(s / 1024).toFixed(1)} KB` : `${s} B`;
            };

            const _row = (k, d, v) => {
                jfh.append(`<tr><td>${k}</td><td>${d}</td><td>${_size(v)}</td></tr>`);
            };

            jfh.append('<div class="ed-wrap">');

            // --- Knowledge Base Attiva (kvStore) ---
            const activeChunks = _kv(DATA_KEYS.PHASE0_CHUNKS);
            if (activeChunks) {
                jfh.append('<h4>Knowledge Base Attiva</h4><table class="table-data"><tbody>');
                const docList = _kv(DATA_KEYS.KB_DOCLIST);
                const docCount = docList ? docList.value.length : 0;
                _row(DATA_KEYS.KB_DOCLIST, `Documenti: ${docCount}`, docList ? docList.value : null);
                _row(DATA_KEYS.PHASE0_CHUNKS, `Chunks: ${activeChunks.value.length}`, activeChunks.value);
                _row(DATA_KEYS.PHASE1_INDEX, 'Indice di ricerca', _kv(DATA_KEYS.PHASE1_INDEX)?.value);
                const childMap = _kv(DATA_KEYS.KB_CHILDCHUNKS);
                const childDocCount = childMap ? Object.keys(childMap.value).length : 0;
                _row(DATA_KEYS.KB_CHILDCHUNKS, `Child chunk (${childDocCount} documenti)`, childMap?.value);
                jfh.append('</tbody></table>');
            }

            // --- Conversazione Attiva (kvStore) ---
            const thread = _kv(DATA_KEYS.KEY_THREAD);
            const context = _kv(DATA_KEYS.PHASE2_CONTEXT);
            if (thread || context) {
                jfh.append('<h4>Conversazione Attiva</h4><table class="table-data"><tbody>');
                _row(DATA_KEYS.KEY_THREAD, `Messaggi: ${thread ? thread.value.length : 0}`, thread?.value);
                _row(DATA_KEYS.PHASE2_CONTEXT, 'Contesto estratto', context?.value);
                jfh.append('</tbody></table>');
            }

            // --- Knowledge Base Archiviate (kvStore) ---
            const kbArchived = kvRecords.filter(r => r.key.startsWith(DATA_KEYS.KEY_KB_PRE));
            if (kbArchived.length > 0) {
                jfh.append('<h4>Knowledge Base Archiviate</h4><table class="table-data"><tbody>');
                for (const r of kbArchived) {
                    const name = r.key.slice(DATA_KEYS.KEY_KB_PRE.length);
                    const chunks = r.value?.chunks?.length ?? 0;
                    _row(r.key, `"${name}" (${chunks} chunks)`, r.value);
                }
                jfh.append('</tbody></table>');
            }

            // --- Conversazioni Archiviate (kvStore) ---
            const convoArchived = kvRecords.filter(r => r.key.startsWith(DATA_KEYS.KEY_CONVO_PRE));
            if (convoArchived.length > 0) {
                jfh.append('<h4>Conversazioni Archiviate</h4><table class="table-data"><tbody>');
                for (const r of convoArchived) {
                    const name = r.key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
                    const threadArr = r.value?.thread ?? r.value ?? [];
                    const msgs = Array.isArray(threadArr) ? threadArr.length : 0;
                    _row(r.key, `"${name}" (${msgs} messaggi)`, r.value);
                }
                jfh.append('</tbody></table>');
            }

            // --- Documenti (settings: docs + kvStore: idoc_*) ---
            const docsArr = settingIds.includes(DATA_KEYS.KEY_DOCS) ? await UaDb.readJson(DATA_KEYS.KEY_DOCS) : [];
            const idocKeys = kvRecords.filter(r => r.key.startsWith(DATA_KEYS.KEY_DOC_PRE));
            if (docsArr.length > 0 || idocKeys.length > 0) {
                jfh.append('<h4>Documenti</h4><table class="table-data"><tbody>');
                _row(DATA_KEYS.KEY_DOCS, `Elenco (${docsArr.length} documenti)`, docsArr);
                for (const r of idocKeys) {
                    const name = r.key.slice(DATA_KEYS.KEY_DOC_PRE.length);
                    _row(r.key, `Contenuto: ${name}`, r.value);
                }
                jfh.append('</tbody></table>');
            }

            // --- Configurazione (settings) ---
            const configKeys = [DATA_KEYS.KEY_THEME, DATA_KEYS.ACTIVE_KB_NAME, DATA_KEYS.KEY_PROVIDER, DATA_KEYS.KEY_API_KEYS];
            const configRows = [];
            for (const k of configKeys) {
                if (settingIds.includes(k)) {
                    const raw = await UaDb.read(k);
                    configRows.push({ key: k, raw });
                }
            }
            if (configRows.length > 0) {
                jfh.append('<h4>Configurazione</h4><table class="table-data"><tbody>');
                for (const c of configRows) {
                    let desc = getDescriptionForKey(c.key);
                    if (c.key === DATA_KEYS.KEY_API_KEYS) {
                        const keys = JSON.parse(c.raw || '{}');
                        const list = Object.keys(keys);
                        desc = list.length > 0 ? `Chiavi: ${list.join(', ')}` : 'Nessuna chiave salvata';
                    }
                    _row(c.key, desc, c.raw);
                }
                jfh.append('</tbody></table>');
            }

            // --- Build Temporanei (settings) ---
            const buildKeys = settingIds.filter(id =>
                id === DATA_KEYS.KEY_BUILD_STATE ||
                id.startsWith(DATA_KEYS.KEY_CHUNK_RES_PRE) ||
                id.startsWith(DATA_KEYS.KEY_DOC_KB_PRE)
            );
            if (buildKeys.length > 0) {
                jfh.append('<h4>Build Temporanei</h4><table class="table-data"><tbody>');
                for (const id of buildKeys) {
                    const raw = await UaDb.read(id);
                    if (id === DATA_KEYS.KEY_BUILD_STATE) {
                        const st = JSON.parse(raw || '{}');
                        const prog = st.docNames ? `${st.currentDocIndex}/${st.docNames.length}` : '-';
                        _row(id, `Stato costruzione (${prog})`, raw);
                    } else if (id.startsWith(DATA_KEYS.KEY_CHUNK_RES_PRE)) {
                        const name = id.slice(DATA_KEYS.KEY_CHUNK_RES_PRE.length);
                        const arr = JSON.parse(raw || '[]');
                        _row(id, `Chunk intermedi: ${name} (${arr.length})`, raw);
                    } else if (id.startsWith(DATA_KEYS.KEY_DOC_KB_PRE)) {
                        const name = id.slice(DATA_KEYS.KEY_DOC_KB_PRE.length);
                        _row(id, `KB parziale: ${name}`, raw);
                    }
                }
                jfh.append('</tbody></table>');
            }

            // --- Altri dati non categorizzati ---
            const knownKv = new Set([
                DATA_KEYS.PHASE0_CHUNKS, DATA_KEYS.PHASE1_INDEX, DATA_KEYS.PHASE2_CONTEXT,
                DATA_KEYS.KEY_THREAD, DATA_KEYS.KB_DOCLIST, DATA_KEYS.KB_CHILDCHUNKS
            ]);
            const extraKv = kvRecords.filter(r =>
                !knownKv.has(r.key) &&
                !r.key.startsWith(DATA_KEYS.KEY_KB_PRE) &&
                !r.key.startsWith(DATA_KEYS.KEY_CONVO_PRE) &&
                !r.key.startsWith(DATA_KEYS.KEY_DOC_PRE)
            );
            const knownSettings = new Set([...configKeys, DATA_KEYS.KEY_DOCS, DATA_KEYS.KEY_BUILD_STATE]);
            const extraSettings = settingIds.filter(id =>
                !knownSettings.has(id) &&
                !id.startsWith(DATA_KEYS.KEY_CHUNK_RES_PRE) &&
                !id.startsWith(DATA_KEYS.KEY_DOC_KB_PRE)
            );
            if (extraKv.length > 0 || extraSettings.length > 0) {
                jfh.append('<h4>Altri dati</h4><table class="table-data"><tbody>');
                for (const r of extraKv) _row(r.key, getDescriptionForKey(r.key), r.value);
                for (const id of extraSettings) {
                    const val = await UaDb.read(id);
                    _row(id, getDescriptionForKey(id), val);
                }
                jfh.append('</tbody></table>');
            }

            if (kvRecords.length === 0 && settingIds.length === 0) {
                jfh.append('<p class="empty-data">Nessun dato presente.</p>');
            }

            jfh.append('</div>');
            wnds.winfo.show(jfh.html());
        };
    }

    const menuBtn = document.querySelector("#id-menu-btn");
    const menuLabel = document.querySelector("#id-menu-icon-label");
    if (menuBtn && menuLabel) {
        menuBtn.onchange = function() {
            const isOpen = menuBtn.checked;
            document.body.classList.toggle(CSS_MENU_OPEN, isOpen);
            menuLabel.setAttribute("data-tt", isOpen ? "Close" : "Open");
        };
    }

    // --- INIZIALIZZAZIONE POPUP INFORMATIVI ---
    // Header
    HelpPopup.bind("btn-help", "<strong>Istruzioni</strong><br>Apre il manuale utente con architettura, guida operativa e specifiche dell'app.");
    HelpPopup.bind("btn-upload", "<strong>Caricamento Documenti</strong><br>Carica file PDF, TXT o DOCX dal tuo computer per la Knowledge Base.");
    HelpPopup.bind("id_log", "<strong>Registro Eventi</strong><br>Mostra i messaggi di log dell'applicazione in tempo reale.");
    HelpPopup.bind("btn-provider-settings", "<strong>Configurazione LLM</strong><br>Seleziona il provider AI e il modello specifico.");
    // btn-theme-toggle usa tooltip CSS (data-tt) — dinamico in _updateThemeAsync

    // Azioni
    HelpPopup.bind("btn-action2-start-convo", "<strong>Avvia Conversazione</strong><br>Cerca il contesto nei documenti e interroga l'AI per la prima risposta.");
    HelpPopup.bind("btn-action3-continue-convo", "<strong>Continua Dialogo</strong><br>Invia la nuova domanda mantenendo la memoria della chat e del contesto.");
    HelpPopup.bind("btn-copy-output", "<strong>Copia Output</strong><br>Copia il testo dell'output della chat negli appunti.");

    // Menu — Knowledge Base
    HelpPopup.bind("menu-create-kb", "<strong>Crea Knowledge Base</strong><br>Genera l'indice di ricerca dai documenti caricati. Necessario prima di avviare una conversazione.");
    HelpPopup.bind("menu-delete-kb", "<strong>Cancella KB</strong><br>Elimina la Knowledge Base attiva e i relativi indici di ricerca.");
    HelpPopup.bind("menu-save-kb", "<strong>Archivia KB</strong><br>Salva la Knowledge Base corrente con un nome personalizzato per usi futuri.");
    HelpPopup.bind("menu-elenco-kb", "<strong>Gestisci KB</strong><br>Elenca, attiva, esporta o elimina le Knowledge Base archiviate.");
    HelpPopup.bind("menu-restore-kb", "<strong>Carica KB</strong><br>Carica una Knowledge Base da un file di backup salvato in precedenza.");
    HelpPopup.bind("menu-processed-docs", "<strong>Documenti Processati</strong><br>Mostra l'elenco dei documenti usati nell'ultima costruzione della Knowledge Base, con indicazione di quali sono ancora presenti tra i caricati.");

    // Menu — Conversazione
    HelpPopup.bind("menu-view-context", "<strong>Visualizza Contesto</strong><br>Mostra il contenuto estratto usato dall'AI per rispondere.");
    HelpPopup.bind("menu-view-convo", "<strong>Visualizza Conversazione</strong><br>Mostra l'intero storico della chat in formato testo.");
    HelpPopup.bind("menu-clear-context", "<strong>Cancella Contesto</strong><br>Azzeramento totale: cancella il contesto, la prima domanda e l'intera conversazione. La chat torna come appena avviata.");
    HelpPopup.bind("menu-clear-conversazione", "<strong>Cancella Conversazione</strong><br>Elimina solo i messaggi successivi alla prima domanda, mantenendo intatti il contesto e la domanda iniziale.");
    HelpPopup.bind("menu-save-convo", "<strong>Archivia Conversazione</strong><br>Salva la cronologia della chat corrente con un nome personalizzato.");
    HelpPopup.bind("menu-elenco-convo", "<strong>Gestisci Conversazioni</strong><br>Elenca, attiva, esporta o elimina le conversazioni archiviate.");
    HelpPopup.bind("menu-restore-convo", "<strong>Carica Conversazione</strong><br>Carica una conversazione da un file di backup salvato in precedenza.");

    // Menu — Dati e Sistema
    HelpPopup.bind("menu-elenco-docs", "<strong>Elenco Documenti</strong><br>Mostra l'elenco dei documenti caricati nel sistema con opzioni di visualizzazione ed eliminazione.");
    HelpPopup.bind("menu-elenco-dati", "<strong>Dati Archiviati</strong><br>Mostra tutti i dati in IndexedDB raggruppati per tipologia: KB attiva/archiviata, conversazioni, documenti, configurazione e build temporanei.");
    HelpPopup.bind("menu-default-api-keys", "<strong>API Keys Default</strong><br>Ripristina le chiavi API predefinite dal file locale <code>api_x.json</code>, sovrascrivendo quelle attuali.");
    HelpPopup.bind("menu-add-api-key", "<strong>Gestione API Key</strong><br>Aggiungi, attiva o elimina le tue chiavi API personali.");
    HelpPopup.bind("menu-reset", "<strong>Reset</strong><br>Cancella TUTTI i dati: KB, conversazioni, documenti, chiavi API e configurazione. Due conferme richieste.");
    HelpPopup.bind("menu-logout", "<strong>Logout</strong><br>Esci dall'applicazione e torna alla schermata di login.");

    // Menu — Info
    HelpPopup.bind("menu-readme", "<strong>README</strong><br>Apre il README tecnico del progetto in una nuova finestra.");
    HelpPopup.bind("menu-quickstart", "<strong>Guida Rapida</strong><br>Mostra le istruzioni essenziali per iniziare subito con l'app.");
};
