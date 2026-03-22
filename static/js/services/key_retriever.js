/** @format */
"use strict";

import { UaJtfh } from "./uajtfh.js";
import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";

const STORAGE_KEY = DATA_KEYS.KEY_API_KEYS;

/**
 * Lista dei provider supportati.
 * @type {Array<string>}
 * @private
 */
const _SUPPORTED_PROVIDERS = ["gemini", "mistral", "openrouter"];

/**
 * Recupera la chiave attiva per un determinato provider.
 * @param {string} providerName - Il nome del provider (es. 'gemini', 'mistral')
 * @returns {string|null} La chiave API attiva o null.
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
 * Struttura dati base se il DB è vuoto
 */
const INITIAL_DB = {
    last_updated: new Date().toISOString(),
    providers: {}
};

/**
 * Gestore principale delle API Keys (UI).
 */
export async function addApiKey() {
    let db = await UaDb.readJson(STORAGE_KEY) || JSON.parse(JSON.stringify(INITIAL_DB));

    const render = async () => {
        const jfh = UaJtfh();

        // Uniamo i provider supportati con quelli già nel DB
        const allProviders = new Set([
            ..._SUPPORTED_PROVIDERS,
            ...Object.keys(db.providers || {})
        ]);
        const sortedAllProviders = Array.from(allProviders).sort();

        jfh.append('<div class="api-keys-manager" style="display: flex; flex-direction: column; gap: 5px; height: 100%;">');

        // 1. Form Aggiunta
        jfh.append('<div class="add-key-form" style="margin-top: 5px; padding: 10px; border: 1px solid #555; border-radius: 5px; background: #252526;">');
        jfh.append('<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">');
        
        jfh.append('<div><label style="display: block; font-size: 0.8em; margin-bottom: 2px;">Provider</label>');
        jfh.append('<select id="key-sel-provider" style="padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 3px;">');
        sortedAllProviders.forEach(p => jfh.append(`<option value="${p}">${p}</option>`));
        jfh.append('</select></div>');

        jfh.append('<div><label style="display: block; font-size: 0.8em; margin-bottom: 2px;">Nome (es. work)</label>');
        jfh.append('<input type="text" id="key-inp-name" style="padding: 5px; width: 120px;"></div>');

        jfh.append('<div style="flex-grow: 1;"><label style="display: block; font-size: 0.8em; margin-bottom: 2px;">API Key</label>');
        jfh.append('<input type="text" id="key-inp-key" style="padding: 5px; width: 100%;"></div>');

        jfh.append('<button class="btn-success" style="padding: 6px 15px; height: 32px; background-color: #00e676; border: none; font-weight: bold;" onclick="wnds.handleAddKey()">Aggiungi</button>');
        jfh.append('</div></div>');

        // 2. Elenco
        jfh.append('<div style="flex-grow: 1; overflow-y: auto; border: 1px solid #444; border-radius: 5px; margin-top: 5px;">');
        jfh.append('<table class="table-data" style="width: 100%; margin: 0; border-collapse: collapse;">');
        jfh.append('<thead style="position: sticky; top: 0; background: #252526; z-index: 1;"><tr>');
        jfh.append('<th style="width: 40px; text-align: center; padding: 4px;">Attiva</th>');
        jfh.append('<th style="padding: 4px;">Nome</th>');
        jfh.append('<th style="padding: 4px;">Chiave</th>');
        jfh.append('<th style="width: 30px; text-align: center; padding: 4px;">Del</th>');
        jfh.append('</tr></thead><tbody>');

        const sortedProviders = Object.keys(db.providers || {}).sort();
        if (sortedProviders.length === 0) {
            jfh.append('<tr><td colspan="4" style="text-align: center; padding: 20px; color: #888;">Nessuna chiave configurata.</td></tr>');
        } else {
            sortedProviders.forEach(pName => {
                const providerData = db.providers[pName];
                const keys = providerData.keys || [];
                const activeKey = providerData.exported_key;

                jfh.append(`<tr style="background: #1e1e1e;"><td colspan="4" style="padding: 4px 8px; color: #81c784; font-weight: bold; font-size: 0.85em; text-transform: uppercase; border-bottom: 1px solid #333;">${pName}</td></tr>`);

                if (keys.length === 0) {
                    jfh.append('<tr><td colspan="4" style="padding: 4px 15px; font-style: italic; color: #555; font-size: 0.8em;">Nessuna chiave.</td></tr>');
                } else {
                    keys.forEach(k => {
                        const isChecked = activeKey === k.name;
                        const rowStyle = `border-bottom: 1px solid #2d2d2d; ${isChecked ? "background: #2a352a; border-left: 3px solid #ffb74d;" : ""}`;
                        jfh.append(`<tr style="${rowStyle}">`);
                        jfh.append(`<td style="text-align: center; padding: 2px;"><input type="radio" name="group_${pName}" ${isChecked ? 'checked' : ''} onclick="wnds.handleSetActiveKey('${pName}', '${k.name}')" style="cursor: pointer;"></td>`);
                        jfh.append(`<td style="padding: 2px 8px; font-size: 0.9em; ${isChecked ? "color: #ffb74d; font-weight: bold;" : ""}">${k.name}</td>`);
                        jfh.append(`<td style="padding: 2px 8px; font-family: monospace; font-size: 0.85em; ${isChecked ? "color: #fff;" : "color: #888;"}">${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}</td>`);
                        jfh.append(`<td style="text-align: center; padding: 2px;"><button class="btn-danger" style="padding: 0px 5px; font-size: 10px; line-height: 18px; height: 20px; min-width: 20px;" onclick="wnds.handleDeleteKey('${pName}', '${k.name}')">X</button></td>`);
                        jfh.append('</tr>');
                    });
                }
            });
        }
        jfh.append('</tbody></table></div></div>');

        wnds.handleAddKey = async () => {
            const provider = document.getElementById("key-sel-provider").value;
            const name = document.getElementById("key-inp-name").value;
            const key = document.getElementById("key-inp-key").value;
            if (!provider || !name || !key) return alert("Provider, Nome e Key obbligatori.");

            if (!db.providers[provider]) {
                db.providers[provider] = { api_key_env: `${provider.toUpperCase()}_API_KEY`, exported_key: null, keys: [] };
            }
            const providerData = db.providers[provider];
            if (providerData.keys.some(k => k.name === name)) return alert(`Esiste già una chiave con nome '${name}' per ${provider}.`);
            
            providerData.keys.push({ name, key, notes: "" });
            if (!providerData.exported_key) {
                providerData.exported_key = name;
                // Aggiorna il client LLM "a caldo"
                const { LlmProvider } = await import("../llm_provider.js");
                await LlmProvider.updateClient(provider);
            }

            await saveDb();
        };

        wnds.handleSetActiveKey = async (provider, keyName) => {
            if (!confirm(`Attivare la chiave '${keyName}' per ${provider}?`)) {
                await render();
                return;
            }
            db.providers[provider].exported_key = keyName;
            await saveDb();

            // Aggiorna il client LLM "a caldo"
            const { LlmProvider } = await import("../llm_provider.js");
            await LlmProvider.updateClient(provider);
        };

        wnds.handleDeleteKey = async (provider, keyName) => {
            if (!confirm(`Eliminare la chiave '${keyName}' di ${provider}?`)) return;
            const providerData = db.providers[provider];
            providerData.keys = providerData.keys.filter(k => k.name !== keyName);
            if (providerData.exported_key === keyName) providerData.exported_key = null;
            await saveDb();
        };

        wnds.winfo.show(jfh.html());
    };

    const saveDb = async () => {
        db.last_updated = new Date().toISOString();
        await UaDb.saveJson(STORAGE_KEY, db);
        await render();
    };

    await render();
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

