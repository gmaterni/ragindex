/**
 * @fileoverview docs_mgr.js - Gestore documenti dell'applicazione
 * @description Fornisce funzioni per gestire documenti caricati dall'utente.
 *              Modulo specifico dell'applicazione RagIndex.
 * @module docs_mgr
 */
"use strict";

import { UaDb } from "./services/uadb.js";
import { DATA_KEYS } from "./services/data_keys.js";

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Elenco dei nomi dei documenti caricati.
 * @type {Array<string>}
 * @private
 */
let _names = [];

/**
 * Inizializza l'elenco dei documenti dal storage.
 * @returns {void}
 * @private
 */
const _init = async () => {
    _names = await UaDb.readArray(DATA_KEYS.KEY_DOCS) || [];
};

// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Controlla se un nome documento esiste nell'elenco.
 * @param {string} name - Nome del documento
 * @param {Array} list - Elenco dei nomi
 * @returns {boolean} True se il documento esiste
 * @private
 */
const _includes = (name, list) => {
    const found = list.includes(name);
    return found;
};

// ============================================================================
// API PUBBLICA
// ============================================================================

/**
 * Oggetto principale per gestione documenti.
 * @namespace
 */
export const DocsMgr = {

    /**
     * Inizializza il gestore documenti.
     * @returns {void}
     * @public
     */
    init: async () => {
        await _init();
    },

    /**
     * Aggiunge un documento allo storage.
     * @param {string} name - Nome del documento
     * @param {string} doc - Contenuto del documento
     * @returns {void}
     * @public
     */
    add: async (name, doc) => {
        await _init(); // Assicura che i nomi siano caricati

        if (!_includes(name, _names)) {
            _names.push(name);
            await UaDb.saveArray(DATA_KEYS.KEY_DOCS, _names);
        }

        await UaDb.save(`${DATA_KEYS.KEY_DOC_PRE}${name}`, doc);
    },

    /**
     * Legge il contenuto di un documento.
     * @param {string} name - Nome del documento
     * @returns {string} Contenuto del documento
     * @public
     */
    read: async (name) => {
        const content = await UaDb.read(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
        return content;
    },

    /**
     * Ottiene l'elenco dei nomi dei documenti.
     * @returns {Promise<Array<string>>} Elenco dei nomi
     * @public
     */
    names: async () => {
        await _init();
        return _names;
    },

    /**
     * Ottiene tutti i documenti (nome e contenuto).
     * @returns {Promise<Array<{name: string, text: string}>>} Array di documenti
     * @public
     */
    getAll: async () => {
        await _init();
        const all = [];
        for (const name of _names) {
            const text = await DocsMgr.read(name);
            all.push({ name, text });
        }
        return all;
    },

    /**
     * Ottiene il nome del documento a un indice specifico.
     * @param {number} i - Indice del documento
     * @returns {string|null} Nome del documento o null
     * @public
     */
    name: async (i) => {
        await _init();

        let result = null;

        if (i >= 0 && i < _names.length) {
            result = _names[i];
        }

        return result;
    },

    /**
     * Ottiene il contenuto del documento a un indice specifico.
     * @param {number} i - Indice del documento
     * @returns {string|null} Contenuto del documento o null
     * @public
     */
    doc: async (i) => {
        const name = await DocsMgr.name(i);

        let content = null;

        if (name) {
            content = await DocsMgr.read(name);
        }

        return content;
    },

    /**
     * Elimina un documento dallo storage.
     * @param {string} name - Nome del documento
     * @returns {boolean} True se eliminato, false altrimenti
     * @public
     */
    delete: async (name) => {
        await _init(); // Forza ricaricamento lista nomi

        const index = _names.indexOf(name);
        if (index > -1) {
            _names.splice(index, 1);
            // Salva la lista aggiornata
            await UaDb.saveArray(DATA_KEYS.KEY_DOCS, _names);
            // Elimina fisicamente il contenuto
            await UaDb.delete(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
            return true;
        }
        return false;
    },

    /**
     * Elimina tutti i documenti.
     * @returns {void}
     * @public
     */
    deleteAll: async () => {
        await _init();

        for (const name of _names) {
            await UaDb.delete(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
        }

        _names = [];
        await UaDb.saveArray(DATA_KEYS.KEY_DOCS, []); // Svuota esplicitamente
    },

    /**
     * Controlla se un documento esiste.
     * @param {string} name - Nome del documento
     * @returns {boolean} True se esiste, false altrimenti
     * @public
     */
    exists: async (name) => {
        await _init();
        const found = _includes(name, _names);
        return found;
    }
};
