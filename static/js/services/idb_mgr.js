/**
 * @fileoverview idb_mgr.js - Gestore IndexedDB basato su Dexie.js
 * @description Fornisce un'interfaccia semplificata per operazioni CRUD
 *              su IndexedDB utilizzando Dexie.js come motore sottostante.
 * @module services/idb_mgr
 */
"use strict";

import Dexie from "./vendor/dexie.js";

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Istanza del database Dexie.
 * @type {Dexie}
 * @private
 */
const _db = new Dexie("RagIndexDB");

// Configurazione schema database
// kvStore: tabella per dati pesanti (chunks, indici, conversazioni)
// settings: tabella per configurazioni (ex localStorage)
_db.version(2).stores({
    kvStore: "id",
    settings: "id"
});

// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Gestisce gli errori delle operazioni Dexie.
 * @param {string} operation - Nome dell'operazione fallita
 * @param {Error} error - Oggetto errore
 * @returns {boolean} Sempre false per indicare fallimento
 * @private
 */
const _handleError = (operation, error) => {
    console.error(`Dexie: Errore durante ${operation}:`, error);
    return false;
};

/**
 * Legge un record dalla tabella settings.
 * @param {string} id - Identificativo del record
 * @returns {*} Valore del record o stringa vuota
 * @private
 */
const _readFromSettings = async (id) => {
    let value = "";

    try {
        const record = await _db.settings.get(id);
        if (record) {
            value = record.value;
        }
    } catch (error) {
        console.error(`Dexie UaDb: Errore lettura ${id}:`, error);
        value = "";
    }

    return value;
};

/**
 * Scrive un record nella tabella settings.
 * @param {string} id - Identificativo del record
 * @param {*} data - Dati da memorizzare
 * @returns {void}
 * @private
 */
const _writeToSettings = async (id, data) => {
    try {
        await _db.settings.put({ id: id, value: data });
    } catch (error) {
        console.error(`Dexie UaDb: Errore salvataggio ${id}:`, error);
    }
};

/**
 * Elimina un record dalla tabella settings.
 * @param {string} id - Identificativo del record
 * @returns {void}
 * @private
 */
const _deleteFromSettings = async (id) => {
    try {
        await _db.settings.delete(id);
    } catch (error) {
        console.error(`Dexie UaDb: Errore eliminazione ${id}:`, error);
    }
};

// ============================================================================
// API PUBBLICA - idbMgr
// ============================================================================

/**
 * Oggetto principale per operazioni su IndexedDB (tabella kvStore).
 * @namespace
 */
export const idbMgr = {

    /**
     * Restituisce l'istanza del database Dexie per utilizzi avanzati.
     * @returns {Dexie} Istanza del database
     * @public
     */
    db: () => {
        return _db;
    },

    /**
     * Crea o aggiorna un record nella tabella kvStore.
     * @param {string} key - Chiave del record
     * @param {*} value - Valore da memorizzare
     * @returns {boolean} True se successo, false altrimenti
     * @public
     */
    create: async (key, value) => {
        let result = false;

        try {
            await _db.kvStore.put({ id: key, value: value });
            result = true;
        } catch (error) {
            result = _handleError("creazione", error);
        }

        return result;
    },

    /**
     * Legge un record dalla tabella kvStore.
     * @param {string} key - Chiave del record
     * @returns {*} Valore del record o undefined
     * @public
     */
    read: async (key) => {
        let value = undefined;

        try {
            const record = await _db.kvStore.get(key);
            if (record) {
                value = record.value;
            }
        } catch (error) {
            _handleError("lettura", error);
            value = undefined;
        }

        return value;
    },

    /**
     * Aggiorna un record esistente (alias di create).
     * @param {string} key - Chiave del record
     * @param {*} value - Nuovo valore
     * @returns {boolean} True se successo, false altrimenti
     * @public
     */
    update: async (key, value) => {
        const result = await idbMgr.create(key, value);
        return result;
    },

    /**
     * Elimina un record dalla tabella kvStore.
     * @param {string} key - Chiave del record
     * @returns {boolean} True se successo, false altrimenti
     * @public
     */
    delete: async (key) => {
        let result = false;

        try {
            await _db.kvStore.delete(key);
            result = true;
        } catch (error) {
            result = _handleError("eliminazione", error);
        }

        return result;
    },

    /**
     * Verifica se una chiave esiste nella tabella kvStore.
     * @param {string} key - Chiave da verificare
     * @returns {boolean} True se esiste, false altrimenti
     * @public
     */
    exists: async (key) => {
        let exists = false;

        try {
            const count = await _db.kvStore.where("id").equals(key).count();
            exists = count > 0;
        } catch (error) {
            _handleError("verifica esistenza", error);
            exists = false;
        }

        return exists;
    },

    /**
     * Ottiene tutte le chiavi dalla tabella kvStore.
     * @returns {string[]} Array di chiavi
     * @public
     */
    getAllKeys: async () => {
        let keys = [];

        try {
            keys = await _db.kvStore.toCollection().primaryKeys();
        } catch (error) {
            _handleError("recupero chiavi", error);
            keys = [];
        }

        return keys;
    },

    /**
     * Ottiene le chiavi che iniziano con un prefisso.
     * @param {string} prefix - Prefisso da cercare
     * @returns {string[]} Array di chiavi corrispondenti
     * @public
     */
    selectKeys: async (prefix) => {
        let keys = [];

        try {
            keys = await _db.kvStore
                .where("id")
                .startsWith(prefix)
                .primaryKeys();
        } catch (error) {
            _handleError("selectKeys", error);
            keys = [];
        }

        return keys;
    },

    /**
     * Ottiene tutti i record come array di oggetti {key, value}.
     * @returns {Promise<Array<{key: string, value: *}>>} Array di record
     * @public
     */
    getAllRecords: async () => {
        let records = [];

        try {
            const all = await _db.kvStore.toArray();
            records = all.map((r) => ({ key: r.id, value: r.value }));
        } catch (error) {
            _handleError("getAllRecords", error);
            records = [];
        }

        return records;
    },

    /**
     * Ottiene i record con un prefisso specifico.
     * @param {string} prefix - Prefisso da cercare
     * @returns {Promise<Array<{key: string, value: *}>>} Array di record
     * @public
     */
    selectRecords: async (prefix) => {
        let records = [];

        try {
            const found = await _db.kvStore
                .where("id")
                .startsWith(prefix)
                .toArray();
            records = found.map((r) => ({ key: r.id, value: r.value }));
        } catch (error) {
            console.error(`Dexie: Errore selectRecords con prefisso '${prefix}':`, error);
            records = [];
        }

        return records;
    },

    /**
     * Pulisce completamente tutte le tabelle del database.
     * @returns {boolean} True se successo, false altrimenti
     * @public
     */
    clearAll: async () => {
        let result = false;

        try {
            const tables = _db.tables;
            await Promise.all(tables.map((table) => table.clear()));
            result = true;
        } catch (error) {
            _handleError("pulizia totale database", error);
            result = false;
        }

        return result;
    }
};

// ============================================================================
// API PUBBLICA - UaDb (wrapper per tabella settings)
// ============================================================================

/**
 * Oggetto wrapper per operazioni sulla tabella settings.
 * Fornisce metodi per salvare/leggere configurazioni e impostazioni.
 * @namespace
 */
export const UaDb = {

    /**
     * Legge un valore dalla tabella settings.
     * @param {string} id - Identificativo del record
     * @returns {*} Valore letto o stringa vuota
     * @public
     */
    read: async (id) => {
        const value = await _readFromSettings(id);
        return value;
    },

    /**
     * Elimina un record dalla tabella settings.
     * @param {string} id - Identificativo del record
     * @returns {void}
     * @public
     */
    delete: async (id) => {
        await _deleteFromSettings(id);
    },

    /**
     * Salva un valore nella tabella settings.
     * @param {string} id - Identificativo del record
     * @param {*} data - Dati da memorizzare
     * @returns {void}
     * @public
     */
    save: async (id, data) => {
        await _writeToSettings(id, data);
    },

    /**
     * Ottiene tutti gli identificativi dalla tabella settings.
     * @returns {string[]} Array di identificativi
     * @public
     */
    getAllIds: async () => {
        let ids = [];

        try {
            ids = await _db.settings.toCollection().primaryKeys();
        } catch (error) {
            console.error("Dexie UaDb: Errore recupero IDs:", error);
            ids = [];
        }

        return ids;
    },

    /**
     * Salva un array come stringa JSON.
     * @param {string} id - Identificativo del record
     * @param {Array} arr - Array da memorizzare
     * @returns {void}
     * @public
     */
    saveArray: async (id, arr) => {
        const str = JSON.stringify(arr);
        await UaDb.save(id, str);
    },

    /**
     * Legge un array da stringa JSON.
     * @param {string} id - Identificativo del record
     * @returns {Array} Array parsato o array vuoto
     * @public
     */
    readArray: async (id) => {
        const str = await UaDb.read(id);
        let arr = [];

        if (!str || str.trim().length === 0) {
            arr = [];
        } else {
            try {
                arr = JSON.parse(str);
            } catch (error) {
                console.error("UaDb: Errore parsing array:", error);
                arr = [];
            }
        }

        return arr;
    },

    /**
     * Salva un oggetto come stringa JSON.
     * @param {string} id - Identificativo del record
     * @param {Object} js - Oggetto da memorizzare
     * @returns {void}
     * @public
     */
    saveJson: async (id, js) => {
        const str = JSON.stringify(js);
        await UaDb.save(id, str);
    },

    /**
     * Legge un oggetto da stringa JSON.
     * @param {string} id - Identificativo del record
     * @returns {Object} Oggetto parsato o oggetto vuoto
     * @public
     */
    readJson: async (id) => {
        const str = await UaDb.read(id);
        let obj = {};

        if (!str) {
            obj = {};
        } else {
            try {
                obj = JSON.parse(str);
            } catch (error) {
                console.error("UaDb: Errore parsing JSON:", error);
                obj = {};
            }
        }

        return obj;
    },

    /**
     * Pulisce completamente la tabella settings.
     * @returns {void}
     * @public
     */
    clear: async () => {
        try {
            await _db.settings.clear();
        } catch (error) {
            console.error("Dexie UaDb: Errore pulizia settings:", error);
        }
    }
};
