/** @format */
"use strict";

import van from "./vendor/van.mjs";
import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";
import { PROVIDER_CONFIG } from "../llm_provider.js";
import { wnds } from "../app_ui.js";

const STORAGE_KEY = DATA_KEYS.KEY_API_KEYS;

const { div, h4, h5, table, thead, tbody, tr, th, td, button, input, select, option, span, label } = van.tags;

/**
 * Recupera la chiave attiva per un determinato provider.
 * @param {string} providerName - Il nome del provider (es. 'gemini', 'groq')
 * @returns {Promise<string|null>} La chiave API attiva o null.
 */
export async function getApiKey(providerName) {
    try {
        const db = await UaDb.readJson(STORAGE_KEY);
        if (!db || !db.providers || !db.providers[providerName]) return null;

        const providerData = db.providers[providerName];
        const activeKeyName = providerData.exported_key;

        if (!activeKeyName) return null;

        const keyObj = providerData.keys.find(k => k.name === activeKeyName);
        return keyObj ? keyObj.key : null;
    } catch (error) {
        console.error(`Errore nel recupero della chiave per ${providerName}:`, error);
        return null;
    }
}

/**
 * Recupera il nome della chiave attiva per un determinato provider.
 * @param {string} providerName 
 * @returns {Promise<string|null>} Il nome della chiave o null.
 */
export async function getActiveKeyName(providerName) {
    try {
        const db = await UaDb.readJson(STORAGE_KEY);
        if (!db || !db.providers || !db.providers[providerName]) return null;
        return db.providers[providerName].exported_key || null;
    } catch (error) {
        return null;
    }
}

/**
 * Struttura dati base se il DB è vuoto
 */
const INITIAL_DB = {
    last_updated: new Date().toISOString(),
    providers: {}
};

/**
 * Gestore principale delle API Keys (UI).
 * Sostituisce la vecchia `addApiKey`.
 */
export async function addApiKey() {
    let db = await UaDb.readJson(STORAGE_KEY);
    if (!db || !db.providers) {
        db = JSON.parse(JSON.stringify(INITIAL_DB)); // Deep copy
    }

    // Stato reattivo locale per la UI
    const dbState = van.state(db);

    const refreshDb = async () => {
        db = await UaDb.readJson(STORAGE_KEY) || JSON.parse(JSON.stringify(INITIAL_DB));
        dbState.val = db;
    };

    const saveDb = async (newDb) => {
        newDb.last_updated = new Date().toISOString();
        await UaDb.saveJson(STORAGE_KEY, newDb);
        await refreshDb();
    };

    const handleDelete = async (provider, keyName) => {
        if (!confirm(`Eliminare la chiave '${keyName}' di ${provider}?`)) return;

        const newDb = JSON.parse(JSON.stringify(dbState.val));
        const providerData = newDb.providers[provider];

        providerData.keys = providerData.keys.filter(k => k.name !== keyName);
        if (providerData.exported_key === keyName) {
            providerData.exported_key = null;
        }

        await saveDb(newDb);
    };

    const handleSetActive = async (provider, keyName) => {
        if (!confirm(`Attivare la chiave '${keyName}' per ${provider}?`)) {
            // Se l'utente annulla, dobbiamo forzare il refresh dello stato per resettare il radio button al valore precedente
            refreshDb();
            return;
        }
        const newDb = JSON.parse(JSON.stringify(dbState.val));
        newDb.providers[provider].exported_key = keyName;
        await saveDb(newDb);
    };

    const handleAdd = async (provider, name, key, notes) => {
        if (!provider || !name || !key) return alert("Provider, Nome e Key obbligatori.");

        const newDb = JSON.parse(JSON.stringify(dbState.val));

        if (!newDb.providers[provider]) {
            newDb.providers[provider] = {
                api_key_env: `${provider.toUpperCase()}_API_KEY`, // Default convention
                exported_key: null,
                keys: []
            };
        }

        const providerData = newDb.providers[provider];
        if (providerData.keys.some(k => k.name === name)) {
            return alert(`Esiste già una chiave con nome '${name}' per ${provider}.`);
        }

        providerData.keys.push({ name, key, notes });

        // Se è la prima chiave, impostala come attiva
        if (!providerData.exported_key) {
            providerData.exported_key = name;
        }

        await saveDb(newDb);
    };

    // Componente: Form Aggiunta
    const AddForm = () => {
        // State locali per i campi input
        const selProvider = van.state(Object.keys(PROVIDER_CONFIG)[0]);
        const inpName = van.state("");
        const inpKey = van.state("");

        // Uniamo i provider configurati con quelli già nel DB (se ce ne sono di extra)
        const allProviders = new Set([
            ...Object.keys(PROVIDER_CONFIG),
            ...Object.keys(dbState.val.providers || {})
        ]);

        return div({ class: "add-key-form", style: "margin-top: 5px; padding: 10px; border: 1px solid #555; border-radius: 5px; background: #252526;" },
            div({ style: "display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;" },
                div(
                    label({ style: "display: block; font-size: 0.8em; margin-bottom: 2px;" }, "Provider"),
                    select({
                        style: "padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 3px;",
                        onchange: e => selProvider.val = e.target.value
                    },
                        Array.from(allProviders).sort().map(p => option({ value: p }, p))
                    )
                ),
                div(
                    label({ style: "display: block; font-size: 0.8em; margin-bottom: 2px;" }, "Nome (es. work)"),
                    input({
                        type: "text",
                        style: "padding: 5px; width: 120px;",
                        value: inpName,
                        oninput: e => inpName.val = e.target.value
                    })
                ),
                div({ style: "flex-grow: 1;" },
                    label({ style: "display: block; font-size: 0.8em; margin-bottom: 2px;" }, "API Key"),
                    input({
                        type: "text",
                        style: "padding: 5px; width: 100%;",
                        value: inpKey,
                        oninput: e => inpKey.val = e.target.value
                    })
                ),
                button({
                    class: "btn-success",
                    style: "padding: 6px 15px; height: 32px; background-color: #00e676; border: none; font-weight: bold;",
                    onclick: async () => {
                        await handleAdd(selProvider.val, inpName.val, inpKey.val, "");
                        inpName.val = "";
                        inpKey.val = "";
                    }
                }, "Aggiungi"),
                button({
                    class: "btn-secondary",
                    style: "padding: 6px 15px; height: 32px; background-color: #555; border: none; font-weight: bold;",
                    onclick: async () => {
                        const success = await importAllKeysFromJson();
                        if (success) {
                            alert("Chiavi importate con successo!");
                            await refreshDb(); // Aggiorna la vista
                        } else {
                            alert("Errore durante l'importazione delle chiavi.");
                        }
                    }
                }, "Importa Chiavi")
            )
        );
    };

    // Render principale
    const content = div({ class: "api-keys-manager", style: "display: flex; flex-direction: column; gap: 5px; height: 100%; max-height: 500px; overflow: hidden;" },

        // 1. Form di aggiunta in alto (Compatto)
        AddForm(),

        // 2. Elenco compatto
        div({ style: "flex-grow: 1; overflow-y: auto; border: 1px solid #444; border-radius: 5px; margin-top: 5px; background: #1e1e1e;" },
            table({ class: "table-data", style: "width: 100%; margin: 0; border-collapse: collapse;" },
                thead({ style: "position: sticky; top: 0; background: #252526; z-index: 1;" }, tr(
                    th({ style: "width: 40px; text-align: center; padding: 4px;" }, "Attiva"),
                    th({ style: "padding: 4px;" }, "Nome"),
                    th({ style: "padding: 4px;" }, "Chiave"),
                    th({ style: "width: 30px; text-align: center; padding: 4px;" }, "Del")
                )),
                // Tbody reattivo: rigeneriamo il tbody ogni volta che cambia lo stato
                () => {
                    const currentDb = dbState.val;
                    const sortedProviders = Object.keys(currentDb.providers || {}).sort();

                    const rows = [];

                    if (sortedProviders.length === 0) {
                        rows.push(tr(td({ colspan: 4, style: "text-align: center; padding: 20px; color: #888;" }, "Nessuna chiave configurata.")));
                    } else {
                        sortedProviders.forEach(pName => {
                            const providerData = currentDb.providers[pName];
                            const keys = providerData.keys || [];
                            const activeKey = providerData.exported_key;

                            // Header Provider
                            rows.push(tr({ style: "background: #1e1e1e;" },
                                td({ colspan: 4, style: "padding: 4px 8px; color: #81c784; font-weight: bold; font-size: 0.85em; text-transform: uppercase; border-bottom: 1px solid #333;" }, pName)
                            ));

                            if (keys.length === 0) {
                                rows.push(tr(
                                    td({ colspan: 4, style: "padding: 4px 15px; font-style: italic; color: #555; font-size: 0.8em;" }, "Nessuna chiave.")
                                ));
                            } else {
                                keys.forEach(k => {
                                    const isChecked = activeKey === k.name;
                                    rows.push(tr({ style: `border-bottom: 1px solid #2d2d2d; ${isChecked ? "background: #2a352a; border-left: 3px solid #ffb74d;" : ""}` },
                                        td({ style: "text-align: center; padding: 2px;" },
                                            input({
                                                type: "radio",
                                                name: `group_${pName}`, // Unico per provider
                                                checked: isChecked,
                                                onclick: () => handleSetActive(pName, k.name),
                                                style: "cursor: pointer;"
                                            })
                                        ),
                                        td({ style: `padding: 2px 8px; font-size: 0.9em; ${isChecked ? "color: #ffb74d; font-weight: bold;" : ""}` }, k.name),
                                        td({ style: `padding: 2px 8px; font-family: monospace; font-size: 0.85em; ${isChecked ? "color: #fff;" : "color: #888;"}` },
                                            `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`),
                                        td({ style: "text-align: center; padding: 2px;" },
                                            button({
                                                class: "btn-danger",
                                                style: "padding: 0px 5px; font-size: 10px; line-height: 18px; height: 20px; min-width: 20px;",
                                                onclick: () => handleDelete(pName, k.name)
                                            }, "X")
                                        )
                                    ));
                                });
                            }
                        });
                    }

                    // Restituiamo un tbody NUOVO con dentro le righe
                    return tbody(rows);
                }
            )
        )
    );

    wnds.winfo.show(content);
}



const decodeApiKeysJson = (data) => {
    if (!data?.providers) return data;

    const ALPHABET_FROM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const ALPHABET_TO = "mKpX3vQwL8ZnR4yTbJxF1YHcU9AgNsI2oODh7eMzW5jV6ifqGrPECuS0Btaldk-_";

    const decodeKey = (encodedKey) =>
        [...encodedKey].map(char => {
            const index = ALPHABET_TO.indexOf(char);
            return index !== -1 ? ALPHABET_FROM[index] : char;
        }).join('');

    const decodedData = JSON.parse(JSON.stringify(data));

    Object.values(decodedData.providers).forEach(provider => {
        provider.keys?.forEach(keyObj => {
            if (keyObj.key) keyObj.key = decodeKey(keyObj.key);
        });
    });

    return decodedData;
};
/**
 * Importa tutte le chiavi da api_x.json e aggiorna l'archivio locale
 */
export async function importAllKeysFromJson() {
    const URL = "./data/api_x.json";
    try {
        console.info(`*** IMPORTANDO tutte le chiavi da: ${URL}`);
        const response = await fetch(URL);
        if (!response.ok) {
            console.warn(`File chiavi non trovato o errore nel caricamento: ${URL}`);
            return false;
        }
        const rsp = await response.json();
        const data = decodeApiKeysJson(rsp);
        
        if (data && data.providers) {
            // Sovrascrivi completamente il database esistente con i nuovi dati
            data.last_updated = new Date().toISOString();
            
            await UaDb.saveJson(STORAGE_KEY, data);
            console.log("Tutte le chiavi sono state sovrascritte con i dati importati dal JSON.");
            return true;
        }
    } catch (error) {
        console.error("Errore nell'importazione delle chiavi da JSON:", error);
        return false;
    }
}

export async function fetchApiKeys() {
    const URL = "./data/api_x.json";
    try {
        const existingDb = await UaDb.readJson(STORAGE_KEY);
        if (existingDb && existingDb.providers && Object.keys(existingDb.providers).length > 0) {
            console.log("*** API_KEYS db found.");
            return;
        }
        console.info(`*** API_KEYS loading from: ${URL}`);
        const response = await fetch(URL);
        if (!response.ok) {
            console.warn(`File chiavi non trovato o errore nel caricamento: ${URL}`);
            return;
        }
        const rsp = await response.json();
        const data = decodeApiKeysJson(rsp);
        if (data && data.providers) {
            data.last_updated = new Date().toISOString();
            await UaDb.saveJson(STORAGE_KEY, data);
            console.log("API Keys caricate dal file JSON e salvate nel DB.");
        }
    } catch (error) {
        console.error("Errore in fetchApiKeys:", error);
    }
}

