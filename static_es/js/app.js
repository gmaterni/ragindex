/** @format */
"use strict";

import { GeminiClient } from './llmclient/gemini_client.js';
import { GroqClient } from './llmclient/groq_client.js';
import { MistralClient } from './llmclient/mistral_client.js';
import { HuggingFaceClient } from './llmclient/huggingface_client.js';
import { OpenRouterClient } from './llmclient/openrouter_client.js';
import { getApiKey, getActiveKeyName, fetchApiKeys, addApiKey, importAllKeysFromJson } from "./services/key_retriever.js";
import { PROVIDER_CONFIG } from "./llm_provider.js";
import { UaWindowAdm } from "./services/uawindow.js";

const CLIENTS = { 
    gemini: GeminiClient, 
    groq: GroqClient, 
    mistral: MistralClient,
    huggingface: HuggingFaceClient,
    openrouter: OpenRouterClient
};

const REQUEST_TIMEOUT = 5;

const QUERIES = {
    ping: `Rispondi solo con 'OK' se mi senti.`,
    logic: `Se oggi è lunedì e domani è il giorno dopo martedì, che giorno è oggi? Spiega brevemente.`,
    ext: `Estrai i dati in JSON da questo testo: 'Alice ha 25 anni e vive a Roma'. Formato: {"nome": string, "eta": number, "citta": string}`
};

const log = (msg, color = "#0f0") => {
    const el = document.getElementById('console-log');
    const time = new Date().toLocaleTimeString();
    el.innerHTML += `<div style="color:${color}"><span style="color:#666">[${time}]</span> ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
};

/**
 * Popola la griglia di selezione modelli basandosi sulla configurazione.
 */
const populateModels = async () => {
    const grid = document.getElementById('selection-grid');
    grid.innerHTML = '';

    if (!PROVIDER_CONFIG) {
        return log("ERRORE: PROVIDER_CONFIG non trovato.", "#f44336");
    }

    for (const [pName, pConfig] of Object.entries(PROVIDER_CONFIG)) {
        const card = document.createElement('div');
        card.className = 'provider-card';
        
        // Recupera il nome della chiave attiva per questo provider
        const activeKeyLabel = await getActiveKeyName(pName);
        const activeKeyDisplay = activeKeyLabel ? "Chiave attiva: " + activeKeyLabel : "NESSUNA CHIAVE ATTIVA";
        const keyStatusColor = activeKeyLabel ? "#ff5252" : "#ff8a8a"; 
        
        // Aggiungi un checkbox per selezionare tutti i modelli di questo provider e mostra la chiave attiva
        card.innerHTML = `
            <div style="color: ${keyStatusColor}; font-weight: bold; margin-bottom: 5px; font-size: 0.9em;">
                ${activeKeyDisplay}
            </div>
            <h3><input type="checkbox" id="sel-all-${pName}" class="provider-select-all"> ${pName.toUpperCase()}</h3>
            <div id="list-${pName}"></div>
        `;
        grid.appendChild(card);

        const list = card.querySelector(`#list-${pName}`);
        
        // Gestisci la selezione/deselezione di tutti i modelli di questo provider
        const selectAllCheckbox = card.querySelector(`#sel-all-${pName}`);
        selectAllCheckbox.onchange = () => {
            const modelCheckboxes = list.querySelectorAll('input[name="m-cb"]');
            modelCheckboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        };

        Object.keys(pConfig.models).forEach(mName => {
            const div = document.createElement('div');
            div.className = 'model-item';
            div.innerHTML = `<input type="checkbox" name="m-cb" value='${JSON.stringify({p:pName, m:mName})}'> <span>${mName}</span>`;
            
            // Aggiorna lo stato del checkbox "Seleziona tutti" quando un modello viene selezionato/deselezionato
            div.onclick = (e) => {
                if(e.target.tagName !== 'INPUT') {
                    const cb = div.querySelector('input');
                    cb.checked = !cb.checked;
                }
                
                // Aggiorna lo stato del checkbox "Seleziona tutti" per questo provider
                updateSelectAllCheckbox(pName);
            };
            
            // Aggiungi evento anche al checkbox del modello
            const modelCheckbox = div.querySelector('input[name="m-cb"]');
            modelCheckbox.onchange = () => {
                updateSelectAllCheckbox(pName);
            };
            
            list.appendChild(div);
        });
    }

    log("Configurazione modelli caricata correttamente.");
};

// Funzione per aggiornare lo stato del checkbox "Seleziona tutti" per un provider
const updateSelectAllCheckbox = (providerName) => {
    // Trova il provider card cercando l'elemento con id "list-${providerName}"
    const providerCard = Array.from(document.querySelectorAll('.provider-card')).find(card => 
        card.querySelector(`#list-${providerName}`)
    );
    
    if (!providerCard) return;
    
    const selectAllCheckbox = providerCard.querySelector(`#sel-all-${providerName}`);
    const modelCheckboxes = providerCard.querySelectorAll(`#list-${providerName} input[name="m-cb"]`);
    
    if (modelCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        return;
    }
    
    // Controlla quanti modelli sono selezionati
    const checkedCount = Array.from(modelCheckboxes).filter(cb => cb.checked).length;
    
    // Imposta lo stato del checkbox "Seleziona tutti"
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === modelCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true; // Stato parziale
    }
};

// Gestione UI Query Personalizzata
document.getElementById('test-query-type').onchange = (e) => {
    const customContainer = document.getElementById('custom-query-container');
    customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
};

document.getElementById('btn-all').onclick = () => {
    document.querySelectorAll('input[name="m-cb"]').forEach(c => c.checked = true);
    // Aggiorna tutti i checkbox "Seleziona tutti" per i provider
    Object.keys(PROVIDER_CONFIG).forEach(pName => {
        const selectAllCheckbox = document.querySelector(`#sel-all-${pName}`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        }
    });
};

document.getElementById('btn-none').onclick = () => {
    document.querySelectorAll('input[name="m-cb"]').forEach(c => c.checked = false);
    // Deseleziona tutti i checkbox "Seleziona tutti" per i provider
    Object.keys(PROVIDER_CONFIG).forEach(pName => {
        const selectAllCheckbox = document.querySelector(`#sel-all-${pName}`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    });
};

document.getElementById('btn-select').onclick = () => {
    console.log("Pulsante Seleziona cliccato");
    const tbody = document.querySelector('#results tbody');
    if (!tbody) {
        console.error("Tabella risultati non trovata");
        return;
    }
    const rows = Array.from(tbody.querySelectorAll('tr'));
    console.log(`Analisi di ${rows.length} righe`);
    const results = [];

    rows.forEach((row, index) => {
        if (row.cells.length < 4) return;
        
        const providerCell = row.cells[0];
        if (!providerCell || providerCell.colSpan > 1) return; 

        const statusCell = row.cells[2];
        const timeCell = row.cells[3];

        if (statusCell && statusCell.textContent.includes('SUCCESS')) {
            const provider = providerCell.textContent.toLowerCase();
            const model = row.cells[1].textContent.trim();
            const timeText = timeCell.textContent || "";
            const timeStr = timeText.split('s')[0];
            const duration = parseFloat(timeStr);
            
            console.log(`Trovato successo: ${model} in ${duration}s`);

            // Trova windowSize
            let windowSize = "??";
            if (PROVIDER_CONFIG[provider] && PROVIDER_CONFIG[provider].models[model]) {
                windowSize = `${PROVIDER_CONFIG[provider].models[model].windowSize}k`;
            }

            results.push({
                model,
                duration: isNaN(duration) ? 999 : duration,
                windowSize,
                formatted: `${model}|${windowSize}`
            });
        }
    });

    if (results.length === 0) {
        return alert("Nessun risultato di test con successo da analizzare!");
    }

    // Ordina per durata crescente (dal più veloce al più lento)
    results.sort((a, b) => a.duration - b.duration);

    const analysisId = 'analysis-results-wnd';
    const wnd = UaWindowAdm.create(analysisId);
    wnd.addClassStyle('analysis-window');

    const listHtml = results.map(r => `
        <li class="analysis-item">
            <span>${r.formatted}</span>
            <span class="perf-time">${r.duration}s</span>
        </li>
    `).join('');

    const copyText = results.map(r => r.formatted).join('\n');

    wnd.setHtml(`
        <div class="analysis-header">
            <span class="analysis-title">Analisi Performance</span>
            <span class="analysis-close" id="close-analysis-btn">&times;</span>
        </div>
        <ul class="analysis-list">
            ${listHtml}
        </ul>
        <div class="analysis-footer">
            <button id="copy-analysis-btn" class="btn-success">Copia Elenco</button>
        </div>
    `);

    document.getElementById('close-analysis-btn').onclick = () => {
        wnd.close();
    };

    document.getElementById('copy-analysis-btn').onclick = () => {
        navigator.clipboard.writeText(copyText).then(() => {
            const btn = document.getElementById('copy-analysis-btn');
            const originalText = btn.textContent;
            btn.textContent = "Copiato!";
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    };

    wnd.setCenter(0).show().drag();
};

document.getElementById('manage-keys-btn').onclick = () => addApiKey();

document.getElementById('import-keys-btn').onclick = async () => {
    const success = await importAllKeysFromJson();
    if (success) {
        alert("Chiavi importate con successo!");
    } else {
        alert("Errore durante l'importazione delle chiavi.");
    }
};

/**
 * Resetta l'output (log e tabella).
 */
document.getElementById('clear-output-btn').onclick = () => {
    const logEl = document.getElementById('console-log');
    const tbody = document.querySelector('#results tbody');
    
    logEl.innerHTML = 'SISTEMA PRONTO. In attesa di selezione modelli...';
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#555; padding: 30px;">Seleziona i modelli e avvia il test</td></tr>';
};

/**
 * Esegue il test sui modelli selezionati.
 */
document.getElementById('start-btn').onclick = async () => {
    const startBtn = document.getElementById('start-btn');
    const selectedRaw = Array.from(document.querySelectorAll('input[name="m-cb"]:checked')).map(c => JSON.parse(c.value));
    
    // Garantisce l'unicità della selezione (coppia provider|modello)
    const selected = [];
    const seen = new Set();
    selectedRaw.forEach(item => {
        const key = `${item.p}|${item.m}`;
        if (!seen.has(key)) {
            seen.add(key);
            selected.push(item);
        }
    });
    
    if(selected.length === 0) {
        return alert("Seleziona almeno un modello per iniziare il test!");
    }

    const queryType = document.getElementById('test-query-type').value;
    let prompt = QUERIES[queryType];
    
    if (queryType === 'custom') {
        prompt = document.getElementById('custom-query').value.trim();
        if (!prompt) return alert("Inserisci una query personalizzata!");
    }

    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    
    startBtn.disabled = true;
    startBtn.textContent = "Test in corso...";
    
    log(`Inizio sessione di test. Query: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`, "#ffd670");
    
    // Assicuriamoci che le chiavi siano caricate nel DB locale
    await fetchApiKeys();

    for(const item of selected) {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${item.p.toUpperCase()}</td>
            <td><b>${item.m}</b></td>
            <td><span class="status-pill status-wait">TESTING...</span></td>
            <td>-</td>
            <td style="color:#888; font-size: 0.85rem;">In attesa di risposta...</td>
        `;
        
        let key = await getApiKey(item.p);
        if (!key && item.p === 'openrouter') {
            key = await getApiKey('openai');
        }
        
        if(!key) {
            row.cells[2].innerHTML = `<span class="status-pill status-err">NO KEY</span>`;
            row.cells[4].textContent = "API Key non configurata per questo provider.";
            log(`ERRORE: Chiave mancante per ${item.p} (${item.m})`, "#f88");
            continue;
        }

        const client = new CLIENTS[item.p](key);
        const startTime = Date.now();
        
        try {
            const response = await client.sendRequest({
                model: item.m,
                messages: [{role: 'user', content: prompt}],
                temperature: 0.2,
                max_tokens: 500
            }, REQUEST_TIMEOUT);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if(response.ok) {
                const charCount = response.data.length;
                row.cells[3].textContent = `${duration}s (${charCount} ch)`;
                row.cells[2].innerHTML = `<span class="status-pill status-ok">SUCCESS</span>`;
                row.cells[4].textContent = response.data.trim();
                log(`OK: ${item.m} ha risposto in ${duration}s (${charCount} ch)`);
            } else {
                row.cells[3].textContent = `${duration}s`;
                row.cells[2].innerHTML = `<span class="status-pill status-err">FAILED</span>`;
                const errorMsg = response.error?.message || "Errore sconosciuto dall'API";
                row.cells[4].innerHTML = `<span style="color:#ff8a8a">${errorMsg}</span>`;
                log(`FALLITO: ${item.m} - ${errorMsg}`, "#f88");
            }
        } catch(err) {
            row.cells[2].innerHTML = `<span class="status-pill status-err">ERROR</span>`;
            row.cells[4].textContent = err.message;
            log(`ECCEZIONE: ${item.m} - ${err.message}`, "#f44336");
        }
    }
    
    log("Sessione di test completata.", "#00bd97");
    startBtn.disabled = false;
    startBtn.textContent = "Avvia Test Modelli";
};

// Inizializzazione
populateModels();
