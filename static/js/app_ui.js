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
        const xPos = isMenuOpen ? 21 : 1;
        _win.vw_vh().setXY(xPos, 5, 1);

        const copyBtnHtml = showCopy ? `
                    <button class="btn-copy wcp tt-left" data-tt="Copia" onclick="wnds.${copyMethodName}.copy()">
                        <svg class="icon" viewBox="0 0 24 24">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
                        </svg>
                    </button>
                    <button class="btn-close wcl" onclick="wnds.${copyMethodName}.close()">X</button>
                    ` : `
                    <button class="btn-copy wcl" onclick="wnds.${copyMethodName}.close()">
                        <svg class="icon" viewBox="0 0 24 24" style="fill: #f6e602;">
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
        const xPos = isMenuOpen ? 21 : 1;
        _win.vw_vh().setXY(xPos, 5, -1);

        const innerContent = typeof content === "string" ? `<div>${content}</div>` : (content.innerHTML || content);

        const html = `
            <div class="window-info">
                <div class="btn-wrapper">
                    <button class="btn-close" onclick="wnds.winfo.close()">X</button>
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

    const _createPopup = function() {
        if (_popupEl) return;
        _popupEl = document.createElement("div");
        _popupEl.className = "help-popup-window";
        _popupEl.style.position = "fixed";
        _popupEl.style.backgroundColor = "#2d2d2d";
        _popupEl.style.color = "#ffffff";
        _popupEl.style.padding = "8px 12px";
        _popupEl.style.borderRadius = "8px";
        _popupEl.style.border = "1px solid #ffffff";
        _popupEl.style.fontSize = "13px";
        _popupEl.style.zIndex = "30000";
        _popupEl.style.pointerEvents = "none";
        _popupEl.style.display = "none";
        _popupEl.style.maxWidth = "280px";
        _popupEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
        _popupEl.style.lineHeight = "1.4";
        document.body.appendChild(_popupEl);
    };

    const show = function(event, text) {
        _createPopup();
        _popupEl.innerHTML = text;
        _popupEl.style.display = "block";
        _popupEl.style.visibility = "hidden";

        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        const pWidth = _popupEl.offsetWidth;
        const pHeight = _popupEl.offsetHeight;
        
        let top = rect.top - pHeight - 12;
        let left = rect.left + (rect.width / 2) - (pWidth / 2);
        
        if (top < 10 || el.closest(".head-wrapper")) {
            top = rect.bottom + 12;
        }
        
        if (left < 10) left = 10;
        if (left + pWidth > window.innerWidth - 10) {
            left = window.innerWidth - pWidth - 10;
        }

        if (top + pHeight > window.innerHeight - 10) {
            top = rect.top - pHeight - 12;
        }

        _popupEl.style.top = `${top}px`;
        _popupEl.style.left = `${left}px`;
        _popupEl.style.visibility = "visible";
    };

    const hide = function() {
        if (_popupEl) {
            _popupEl.style.display = "none";
            _popupEl.style.visibility = "hidden";
        }
    };

    const bind = function(id, text) {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeAttribute("data-tt");
        el.removeAttribute("title");
        const classesToRemove = Array.from(el.classList).filter(c => c.startsWith("tt-"));
        classesToRemove.forEach(c => el.classList.remove(c));
        el.addEventListener("mouseenter", (e) => show(e, text));
        el.addEventListener("mouseleave", hide);
        el.addEventListener("click", hide);
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
    await idbMgr.create(storageKey, { chunks, serializedIndex: index });
    await UaDb.save(DATA_KEYS.ACTIVE_KB_NAME, sanitizedName);
    await updateActiveKbDisplay();
    await alert(`Knowledge Base archiviata con successo: ${sanitizedName}`);
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
    deleteAll: async function() {
        const msg = "ATTENZIONE: Questa azione cancellerà OGNI DATO in modo irreversibile. Confermi?";
        if (await confirm(msg)) {
            await idbMgr.clearAll();
            localStorage.clear();
            location.reload();
        }
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
        if (!await confirm(`Creare KB da ${validDocs.length} documenti?`)) return;

        _Spinner.show();
        await UaSender.sendEventAsync("ragindex", "createKnowledge");
        setTimeout(async function() {
            try {
                const kbData = await ragEngine.createKnowledgeBase(validDocs);
                const { chunks, serializedIndex } = kbData;
                await idbMgr.create(DATA_KEYS.PHASE0_CHUNKS, chunks);
                await idbMgr.create(DATA_KEYS.PHASE1_INDEX, serializedIndex);
                await UaDb.delete(DATA_KEYS.ACTIVE_KB_NAME);
                await updateActiveKbDisplay();
                await alert(`Knowledge Base creata: ${chunks.length} frammenti.`);
            } catch (error) {
                if (error && error.code === 499) return;
                await alert(`ERRORE CRITICO:\n${error.message || error}`);
            } finally { _Spinner.hide(); }
        }, 50);
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

                // TODO: Stato indice in continuazione
                UaLog.log(`Continuazione - Messaggi: ${thread.length}, Contesto attivo: ${context.length > 0}`);

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
            outputEl.classList.add("copied");
            setTimeout(() => outputEl.classList.remove("copied"), 2000);
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
        "menu-view-convo": _actionViewConversationAsync,
        "menu-save-convo": _actionSaveConversationAsync,
        "menu-restore-convo": async () => { 
            const n = await BackupMgr.importConvoAsync(); 
            if (n) {
                const key = `${DATA_KEYS.KEY_CONVO_PRE}${n}`;
                await _actionLoadConversationAsync(key);
                UaLog.log(`Conversazione "${n}" ripristinata e attivata.`);
            }
        },
        "menu-view-context": _actionViewContextAsync,
        "menu-delete-all": Commands.deleteAll,
        "menu-default-api-keys": restoreDefaultApiKeys,
        "menu-add-api-key": addApiKey,
        "menu-logout": _actionLogout,
        "menu-create-kb": TextInput.createKnowledgeAsync,
        "btn-action2-start-convo": TextInput.startConversationAsync,
        "btn-action3-continue-convo": TextInput.continueConversationAsync,
        "btn-edit-last-fixed": () => wnds.editLastQuestion(),
        "btn-copy-output": TextOutput.copyAsync,
        "clear-history1": TextOutput.clearHistoryAsync,
        "clear-history2": TextOutput.clearHistoryAndContextAsync
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
                jfh.append('<div class="docs-header" style="margin-bottom:10px">');
                jfh.append('<label><input type="checkbox" onclick="document.querySelectorAll(\'.kb-checkbox\').forEach(cb => cb.checked = this.checked)"> Seleziona Tutto</label>');
                jfh.append('<button class="btn-warning btn-small" style="margin-left:15px" onclick="wnds.deleteSelectedKB()">Elimina Selezionati</button>');
                jfh.append('</div>');

                jfh.append('<table class="table-data"><thead><tr><th>Sel.</th><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                keys.forEach(key => {
                    const name = key.slice(DATA_KEYS.KEY_KB_PRE.length);
                    const displayName = name.replace(/_/g, " ");
                    jfh.append('<tr>');
                    jfh.append(`<td><input type="checkbox" class="kb-checkbox" data-key="${key}"></td>`);
                    jfh.append(`<td>${displayName}</td><td><button class="btn-load-item btn-success" onclick="wnds.loadKB('${key}')">Attiva</button>`);
                    jfh.append(`<button class="btn-warning btn-small" style="margin-left:5px" onclick="wnds.exportKB('${key}')">Backup</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger" style="margin-left:5px" onclick="wnds.deleteKB('${key}')">Elimina</button></td></tr>`);
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
                jfh.append('<div class="docs-header" style="margin-bottom:10px">');
                jfh.append('<label><input type="checkbox" onclick="document.querySelectorAll(\'.convo-checkbox\').forEach(cb => cb.checked = this.checked)"> Seleziona Tutto</label>');
                jfh.append('<button class="btn-warning btn-small" style="margin-left:15px" onclick="wnds.deleteSelectedConvo()">Elimina Selezionate</button>');
                jfh.append('</div>');

                jfh.append('<table class="table-data"><thead><tr><th>Sel.</th><th>Nome</th><th>Azioni</th></tr></thead><tbody>');
                keys.forEach(key => {
                    const name = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
                    const displayName = name.replace(/_/g, " ");
                    jfh.append('<tr>');
                    jfh.append(`<td><input type="checkbox" class="convo-checkbox" data-key="${key}"></td>`);
                    jfh.append(`<td>${displayName}</td><td><button class="btn-load-item btn-success" onclick="wnds.loadConvo('${key}')">Attiva</button>`);
                    jfh.append(`<button class="btn-warning btn-small" style="margin-left:5px" onclick="wnds.exportConvo('${key}')">Backup</button>`);
                    jfh.append(`<button class="btn-delete-item btn-danger" style="margin-left:5px" onclick="wnds.deleteConvo('${key}')">Elimina</button></td></tr>`);
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
            jfh.append('<div class="docs-dialog"><div class="docs-header"><label><input type="checkbox" onclick="document.querySelectorAll(\'.doc-checkbox\').forEach(cb => cb.checked = this.checked)"> Tutto</label>');
            jfh.append('<button class="btn-warning btn-small" onclick="wnds.delDocs()">Elimina</button></div>');
            if (arr.length > 0) {
                jfh.append('<table class="table-data"><tbody>');
                arr.forEach((name, i) => jfh.append(`<tr><td><input type="checkbox" class="doc-checkbox" data-doc-name="${name}"></td><td>${name}</td><td><button onclick="wnds.viewDoc(${i})">Vedi</button></td></tr>`));
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
            const idbKeys = [];
            const staticIdb = [DATA_KEYS.PHASE0_CHUNKS, DATA_KEYS.PHASE1_INDEX, DATA_KEYS.PHASE2_CONTEXT, DATA_KEYS.KEY_THREAD];
            for (const k of staticIdb) if (await idbMgr.exists(k)) idbKeys.push({ k, d: getDescriptionForKey(k), s: JSON.stringify(await idbMgr.read(k)).length });
            const prefixes = [DATA_KEYS.KEY_KB_PRE, DATA_KEYS.KEY_CONVO_PRE];
            for (const pre of prefixes) {
                const keys = await idbMgr.selectKeys(pre);
                for (const k of keys) idbKeys.push({ k, d: getDescriptionForKey(k), s: JSON.stringify(await idbMgr.read(k)).length });
            }
            const jfh = UaJtfh();
            jfh.append('<div><h4>Dati DB</h4><table class="table-data"><tbody>');
            for (const i of idbKeys) {
                const sizeKb = (i.s / 1024).toFixed(1);
                jfh.append(`<tr><td>${i.k}</td><td>${i.d}</td><td>${sizeKb} KB</td></tr>`);
            }
            jfh.append('</tbody></table></div>');
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
    HelpPopup.bind("btn-upload", "<strong>Caricamento Documenti</strong><br>Carica file PDF, TXT o DOCX dal tuo computer per la Knowledge Base.");
    HelpPopup.bind("btn-provider-settings", "<strong>Configurazione LLM</strong><br>Seleziona il provider AI e il modello specifico.");
    HelpPopup.bind("clear-history1", "<strong>Nuova Conversazione</strong><br>Cancella la cronologia ma mantiene il contesto dei documenti attivo.");
    HelpPopup.bind("clear-history2", "<strong>Reset Totale</strong><br>Pulisce chat, contesto estratto e Knowledge Base attiva per un reset completo.");
    HelpPopup.bind("btn-action2-start-convo", "<strong>(2) Inizia Conversazione</strong><br>Cerca il contesto nei documenti e interroga l'AI per la prima risposta.");
    HelpPopup.bind("btn-action3-continue-convo", "<strong>(3) Continua Dialogo</strong><br>Invia la nuova domanda mantenendo la memoria della chat e del contesto.");
    HelpPopup.bind("btn-theme-toggle", "<strong>Cambia Tema</strong><br>Alterna tra tema chiaro e tema scuro per un miglior comfort visivo.");
    HelpPopup.bind("menu-default-api-keys", "<strong>API Keys Default</strong><br>Ripristina le chiavi API predefinite dal file locale <code>api_x.json</code>.");
    HelpPopup.bind("menu-add-api-key", "<strong>Gestione API Key</strong><br>Aggiungi, attiva o elimina le tue chiavi API personali.");
};
