
import { DATA_KEYS } from './data_keys.js';
import { UaDb } from './uadb.js';

export const WebId = (() => {
    const storageKey = DATA_KEYS.KEY_WEB_ID;

    const get = async () => {
        const now = new Date().toISOString();
        let userDataStr = await UaDb.read(storageKey);
        
        if (userDataStr) {
            try {
                const userData = typeof userDataStr === 'string' ? JSON.parse(userDataStr) : userDataStr;
                userData.lastRequest = now;
                await UaDb.save(storageKey, JSON.stringify(userData));
                return userData;
            } catch (e) {
                console.error("Error parsing user data", e);
                // Fallthrough to create new if corrupted
            }
        }
        
        const url = new URL(window.location.href);
        const newUserData = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            firstRequest: now,
            lastRequest: now,
            hosname: url.hostname,
            pathname: url.pathname
        };
        await UaDb.save(storageKey, JSON.stringify(newUserData));
        return newUserData;
    };

    const clear = async () => {
        await UaDb.delete(storageKey);
        console.log('User ID rimosso dal database');
    };

    return {
        get,
        clear
    };
})();
