# Specifiche Tecniche di RagIndex (Architettura Asincrona/Reattiva)

## Panoramica
RagIndex è un'applicazione RAG (Retrieval-Augmented Generation) 100% client-side, progettata per funzionare sia come applicazione web che come estensione browser (Manifest V3). Non ha backend e garantisce la massima privacy elaborando i dati esclusivamente in locale.

## Architettura (Versione static2)

### Tecnologie Core
*   **UI & Reattività:** VanJS (1kB). La UI è in parte statica (`index.html`) e in parte costruita in modo dichiarativo tramite funzioni JS (`app_ui.js`), garantendo sicurezza (CSP compliant). VanJS gestisce anche lo stato reattivo per elementi dinamici come il nome della Knowledge Base attiva.
*   **Database:** Dexie.js (wrapper IndexedDB). Gestisce sia i dati pesanti (Knowledge Base) nella tabella `kvStore`, sia le configurazioni e impostazioni (ex localStorage) nella tabella `settings`.
*   **Motore RAG:** Lunr.js (ricerca) e Compromise.js (NLP), caricati come script moduli o globali.
*   **Background:** Web Workers per l'indicizzazione non-blocking via `rag_worker.js`.
*   **LLM Client:** REST API pure via `fetch`. Nessuna SDK esterna caricata da CDN.

### Strati Architetturali
1.  **Presentation Layer:** `index.html` (pulito da script inline), `css/*.css` (stili statici).
2.  **Controller Layer:** `app.js` (entry point), `app_mgr.js` (gestione stato app), `app_ui.js` (VanJS components e binding eventi).
3.  **Persistence Layer:** `idb_mgr.js` (schema Dexie strutturato), `uadb.js` (interfaccia asincrona per impostazioni), `docs_mgr.js` (gestione documenti).
4.  **Worker Layer:** `rag_worker.js` gestisce le operazioni pesanti (chunking, indexing).

## Flusso di Lavoro Asincrono
L'applicazione è interamente asincrona. Ogni interazione con i dati utilizza `await` per garantire l'integrità del database.

### Inizializzazione (Boot Sequence)
All'apertura (`window.onload`), l'app in `app.js` segue questa sequenza:
1.  **UI Inits:** `wnds.init()` (finestre VanJS) e `Commands.init()`.
2.  **Logger Init:** `UaLog` viene inizializzato per il feedback visivo.
3.  **App & DB Init:** `AppMgr.initApp()` -> `LlmProvider.init()` (caricamento API Keys da DB) e `AppMgr.initConfig()`.
4.  **Event Binding:** `bindEventListener()` aggancia i trigger della UI.
5.  **History Load:** `showHtmlThread()` recupera la conversazione precedente da IndexedDB.
6.  **UI Refresh:** `getTheme()` e `updateActiveKbDisplay()` (stato reattivo VanJS) aggiornano il look e le info della KB.

### Gestione Dati e Stato Reattivo
*   **Dati:** Memorizzati in Dexie (IndexedDB). 
    *   `kvStore`: Frammenti (`ph0_chunks`), indici (`ph1_index`), e intere Knowledge Base archiviate (`rag_kb_*`).
    *   `settings`: Chiavi API (`api_keys`), preferenze tema (`theme`), e metadati della KB attiva (`active_kb`).
*   **Stato Reattivo:** Utilizzo di `van.state` (es. `activeKbState`) per aggiornare automaticamente la UI al variare della Knowledge Base attiva senza ricaricare la pagina.
*   **API Keys:** Gestite asincronamente tramite `key_retriever.js`. Il sistema supporta ora un archivio multi-chiave (multi-provider) con selezione della chiave attiva, salvato in formato JSON all'interno del record `api_keys` nella tabella `settings`. Le chiavi predefinite possono essere caricate da `static/data/api_x.json` (formato codificato).
*   **Modelli Dinamici:** La configurazione dei modelli (window size, endpoint) è caricata dinamicamente da `static/data/models.json`, permettendo l'aggiornamento dei modelli supportati senza modificare il codice core.
*   **Cancellazione (Nuke):** `idbMgr.clearAll()` svuota tutte le tabelle Dexie e `localStorage.clear()` pulisce i residui.

## Supporto LLM
Comunicazione diretta via HTTPS verso:
*   **Gemini (Google):** Endpoint `generativelanguage.googleapis.com` (REST).
*   **Groq & Mistral:** Endpoint compatibili OpenAI.
*   **OpenRouter:** Hub multi-modello.
*   **HuggingFace:** Accesso a modelli open-source via Inference API.

## Requisiti per Estensione Browser
L'architettura in `static2` rispetta rigorosamente i vincoli del Manifest V3:
1.  Nessun codice remoto (Self-contained).
2.  Nessun `eval()` o `innerHTML` non controllato.
3.  Web Worker isolato.
4.  Storage asincrono.
