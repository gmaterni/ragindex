
export const WebId = (() => {
    const storageKey = 'ua_web_id';

    const get = () => {
        const now = new Date().toISOString();
        let userData = localStorage.getItem(storageKey);
        if (userData) {
            userData = JSON.parse(userData);
            userData.lastRequest = now;
            localStorage.setItem(storageKey, JSON.stringify(userData));
            return userData;
        } else {
            const url = new URL(window.location.href);
            const newUserData = {
                id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                firstRequest: now,
                lastRequest: now,
                hosname: url.hostname,
                pathname: url.pathname
            };
            localStorage.setItem(storageKey, JSON.stringify(newUserData));
            return newUserData;
        }
    };

    const clear = () => {
        localStorage.removeItem(storageKey);
        console.log('User ID rimosso dal localStorage');
    };

    // API pubblica
    return {
        get,
        clear
    };
})();
