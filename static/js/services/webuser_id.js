

import { DATA_KEYS } from './data_keys.js';

/**
 * Costante per il valore di default dell'ID Utente.
 */
const USER_WEB_ID = "ragindex_id";

export const WebId = (() => {
    const storageKey = DATA_KEYS.KEY_WEB_ID;

    const get = () => {
        let userId = localStorage.getItem(storageKey);
        if (!userId) {
            userId = `${USER_WEB_ID}_${Date.now()}`;
            localStorage.setItem(storageKey, userId);
        }
        return userId;
    };

    const clear = () => {
        localStorage.removeItem(storageKey);
    };

    return {
        get,
        clear
    };
})();
