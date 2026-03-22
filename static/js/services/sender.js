"use strict";

const LOCAL_URL = "http://localhost:8788"

/**
 * Stato globale del modulo (Singleton)
 */
let _globalConfig = {
    workerUrl: LOCAL_URL,
    userId: null,   // Impostato tramite init()
    isInitialized: false
};

/**
 * Funzioni di utilità interne
 */
const _getMetadata = function () {
    return {
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer,
        urlParams: Object.fromEntries(new URLSearchParams(window.location.search)),
        timestamp: Math.floor(Date.now() / 1000)
    };
};

/**
 * Il modulo esporta sia la funzione factory che i metodi diretti.
 */
export const UaSender = {

    /**
     * Configura l'URL del worker e l'ID Utente.
     */
    init: function (config = {}) {
        if (config.workerUrl) {
            _globalConfig.workerUrl = config.workerUrl;
        }
        if (config.userId) {
            _globalConfig.userId = config.userId;
        }
        _globalConfig.isInitialized = true;
        console.log(`[RAGINDEX] Inizializzato. URL: ${_globalConfig.workerUrl}, UserID: ${_globalConfig.userId || "auto"}`);
    },

    /**
     * Invia un evento usando la configurazione globale.
     */
    sendEventAsync: async function (appName, actionName) {
        if (!appName || !actionName) {
            console.error("UaSender: parametri mancanti");
            return null;
        }
        // HACK disattuva li sender 
        // console.info(">>>>>>>>>>>>>>> SENDER DISATTIVATO");
        // return null;
        // if (_globalConfig.workerUrl == LOCAL_URL) return null;

        // Se userId non è configurato nell'init, usiamo il fallback <appName>_user_id
        const finalUserId = _globalConfig.userId || `${appName}_user_id`;

        const payload = {
            appName,
            actionName,
            userId: finalUserId,
            ..._getMetadata()
        };

        try {
            const response = await fetch(`${_globalConfig.workerUrl}/api/analytics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errCode = response.status;
                const errMsg = "Invio evento fallito";
                alert(`ERRORE [${errCode}]: ${errMsg}`);
                throw new Error(errMsg);
            }
            return await response.json();
        } catch (error) {
            console.warn("UaSender: invio fallito", error);
            // Se l'errore non è già stato notificato via alert (es. errore di rete)
            if (!error.message.includes("Invio evento fallito")) {
                alert(`ERRORE: ${error.message || "Connessione fallita"}`);
            }
            return null;
        }
    }
};
