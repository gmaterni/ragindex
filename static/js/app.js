/**
 * @fileoverview app.js - Entry point dell'applicazione RagIndex
 * @description Inizializza e avvia l'applicazione.
 *              Modulo specifico dell'applicazione RagIndex.
 * @module app
 */
"use strict";

import { UaLog } from "./services/ualog3.js";
import { bindEventListener, showHtmlThread, wnds, Commands, TextInput, TextOutput, getTheme, updateActiveKbDisplay } from "./app_ui.js";
import { AppMgr } from "./app_mgr.js";
import { WebId } from "./services/webuser_id.js";
import { UaSender } from "./services/sender.js";

import "./services/uadialog.js";

// ============================================================================
// COSTANTI
// ============================================================================

// TODO gesione  console.debug
// console.debug = function () { };

/**
 * Versione dell'applicazione.
 * @type {string}
 */
const VERSIONE = "0.3.3";

/**
 * URL del worker per l'invio eventi.
 * @type {string}
 */
const WORKER_URL = "https://ragindex.workerua.workers.dev";

// ============================================================================
// GESTIONE ERRORI GLOBALE
// ============================================================================

window.onerror = function (message, source, lineno, colno, error) {
    alert(`ERRORE GLOBALE:\n${message}\nIn: ${source}:${lineno}`);
    return false;
};

window.onunhandledrejection = function (event) {
    const error = event.reason;
    if (error && error.code === 499) return; // Ignora interruzione manuale
    const msg = error.message || error;
    const code = error.code ? `[${error.code}] ` : "";
    alert(`ERRORE ASINCRONO (Promise):\n${code}${msg}`);
};

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================

/**
 * Apre e inizializza l'applicazione.
 * @returns {void}
 */
const openApp = async () => {
    try {
        console.info("*** VERSIONE:", VERSIONE);
        console.info("*** WORKER_URL:", WORKER_URL);

        // Inizializza UI
        wnds.init();
        Commands.init();

        // Inizializza log
        UaLog.setXY(40, 6).setZ(111).new();

        // Inizializza applicazione
        await AppMgr.initApp();

        // Inizializza input/output
        TextInput.init();
        TextOutput.init();

        // Associa event listener
        bindEventListener();

        // Chiudi menu
        document.querySelector(".menu-btn").checked = false;

        // Carica cronologia precedente
        try {
            await showHtmlThread();
        } catch (e) {
            console.error("Impossibile caricare la cronologia precedente (potrebbe essere corrotta):", e);
            UaLog.log("ERRORE: Impossibile caricare la cronologia precedente.");
            UaLog.log("Si consiglia di cancellarla dal menu.");
        }

        // Carica tema
        await getTheme();

        // Aggiorna display KB
        await updateActiveKbDisplay();

        // Inizializza sender
        const userId = WebId.get();

        UaSender.init({
            workerUrl: WORKER_URL,
            userId: userId
        });

        // Invia evento open
        UaSender.sendEventAsync("ragindex", "open");

    } catch (error) {
        console.error("Errore openApp:", error);
    }
};

// Avvia l'applicazione al caricamento della pagina
window.addEventListener("load", openApp);
