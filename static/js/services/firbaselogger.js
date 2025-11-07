export const FirebaseLogger = (() => {
    // Variabili private
    let cachedIp = null;
    let ipPromise = null;

    // Metodi privati
    const getClientIp = async () => {
        // Se abbiamo già un IP valido in cache, lo restituiamo
        if (cachedIp && !cachedIp.startsWith('err.') && !cachedIp.startsWith('xxx.')) {
            return cachedIp;
        }

        // Se c'è già una richiesta in corso, aspettiamo quella
        if (ipPromise) return ipPromise;

        // Creiamo una nuova richiesta con timeout di 3 secondi
        ipPromise = Promise.race([
            fetch('https://api.ipify.org?format=json')
                .then(response => response.ok ? response.json() : null)
                .then(data => data?.ip || 'xxx.xxx.xxx.xxx'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 3000)
            )
        ]).catch(error => {
            console.warn('Impossibile recuperare IP:', error.message);
            return 'err.xxx.xxx.xxx';
        }).finally(() => {
            ipPromise = null; // Reset per future chiamate
        });

        const result = await ipPromise;
        // Cacheiamo solo se abbiamo ottenuto un IP valido
        if (result && !result.startsWith('err.') && !result.startsWith('xxx.')) {
            cachedIp = result;
        }
        return result;
    };

    const performLogSend = async (appId, payload) => {
        const firebaseDbUrl = 'https://simple-moniotr-default-rtdb.europe-west1.firebasedatabase.app/visite.json';

        // Recuperiamo l'IP con timeout di 3 secondi, ma non blocchiamo se fallisce
        let ip = 'unavailable';
        try {
            ip = await getClientIp();
        } catch (error) {
            // Se l'IP fallisce, continuiamo senza
            console.warn('IP non disponibile, continuo senza');
        }

        // Prepariamo i dati da inviare
        const dataDaInviare = {
            appId: appId,
            // timestamp: new Date().toISOString(),
            ip: ip,
            // userAgent: navigator.userAgent,
            ...payload
        };

        // Inviamo a Firebase con timeout
        try {
            const controller = new AbortController();
            // 10 secondi timeout
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(firebaseDbUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataDaInviare),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('Errore Firebase:', response.status, response.statusText);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Timeout invio Firebase');
            } else {
                console.error('Errore rete Firebase:', error.message);
            }
        }
    };

    // API pubblica
    return {
        sendLog(appId, payload = {}) {
            const host = window.location.hostname;
            // AAA disattivazione log in lcale
            if (host === '127.0.0.1' || host === 'localhost') {
                console.log('Registrazione disattivata in ambiente locale');
                return;
            }

            // Eseguiamo tutto in background senza bloccare
            performLogSend(appId, payload).catch(error => {
                console.error('Errore durante l\'invio del log:', error);
            });
        },

        resetIpCache() {
            cachedIp = null;
            ipPromise = null;
            console.log('Cache IP resettata, prossima chiamata recupererà un nuovo IP');
        }
    };
})();

// Facoltativo 
// export const sendLog = FirebaseLogger.sendLog;

///////////////////////////
/*
// Metodo principale
FirebaseLogger.sendLog('user123', { action: 'login' });

// Reset cache quando serve
FirebaseLogger.resetIpCache();

// Oppure per compatibilità con il codice esistente
sendLog('user123', { action: 'login' });
*/
