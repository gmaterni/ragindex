# Architettura RagIndex

## Panoramica

RagIndex è una web app statica (zero build, no npm) che implementa una pipeline RAG
completamente lato client. Il codice è organizzato in moduli ES2020+ con separation of concerns:
servizi puri, client LLM, UI, e worker.

## Architettura CSS

Il progetto usa LESS compilato lato client via `less.js` **locale** (`static/less/less.js` v4.2.1, non CDN).
- `static/less/style.less` — orchestratore che importa 14 moduli atomici
- `static/less/modules/` — 14 file `.less` (layout, componenti, temi, tabelle, upload, spinner, etc.)
- `static/less/uadialog.less`, `ualog3.less`, `tooltip.less` — stili indipendenti per finestre e log

## Architettura JS

Il flusso principale segue questo percorso d'inizializzazione:

```
static/index.html
  └─ js/app.js                   ← entry point ES module
       ├─ services/              ← servizi puri (nessun DOM)
       │   ├─ config.js          ← flag ambiente (locale/produzione)
       │   ├─ worker_path.js     ← WORKER_PATH per il Web Worker
       │   ├─ key_store.js       ← storage API key (seed offuscato, chiave attiva)
       │   ├─ key_ui.js          ← finestra gestione API key
       │   ├─ key_retriever.js   ← shim di compatibilità (re-export dei due sopra)
       │   ├─ sender.js          ← telemetria opzionale
       │   ├─ ualog3.js          ← logger UI
       │   ├─ uajtfh.js          ← costruttore HTML safe
       │   ├─ uawindow.js        ← gestione finestre flottanti
       │   ├─ uadb.js            ← CRUD IndexedDB
       │   ├─ idb_mgr.js         ← layer Dexie.js
       │   ├─ backup_mgr.js      ← export/import KB e conversazioni
       │   ├─ data_keys.js       ← chiavi storage centralizzate
       │   ├─ build_state_mgr.js ← stato build incrementale KB
       │   ├─ history_utils.js   ← formattazione thread/contesto
       │   ├─ webuser_id.js      ← identità utente
       │   └─ vendor/            ← librerie esterne (dexie, marked, lunr, pdf.js, etc.)
       ├─ llmclient/             ← client LLM (gemini, mistral, groq, openrouter, huggingface)
       │   ├─ registry.js        ← registro provider → classe client (unica fonte)
       │   ├─ base_client.js     ← classe base (fetch, timeout, errori)
       │   ├─ models.js          ← validazione payload e utility contenuti
       │   └─ index.js           ← re-export centralizzato
       ├─ llm/                   ← gestione modelli LLM
       │   ├─ llm-catalog.js     ← lettura modelli dai .txt (no manifest)
       │   ├─ llm-db.js          ← storage discovered/selected (RagIndexLLM_<userId>)
       │   ├─ llm-selection.js   ← finestra "Seleziona LLM"
       │   ├─ llm-logging.js     ← logger della procedura di aggiornamento
       │   └─ test-prompts.js    ← prompt del test modelli
       ├─ llmlist/               ← discovery remota modelli (gemini, groq, mistral, openrouter)
       ├─ commands/              ← Reset LLM, Aggiorna LLM, Test LLM
       ├─ llm_provider.js        ← state manager provider/modello/chiave attivo
       ├─ llm_updater.js         ← test modello, voto qualità, STOP
       ├─ app_mgr.js             ← orchestratore init e configurazione
       ├─ app_ui.js              ← UI, event binding, comandi
       ├─ rag_engine.js          ← motore RAG (buildContext, distillazione, retry)
       ├─ rag_worker.js          ← Web Worker (chunking + indicizzazione Lunr)
       ├─ uploader.js            ← upload documenti (PDF, DOCX, TXT)
       ├─ docs_mgr.js            ← gestione documenti
       └─ llm_prompts.js         ← template prompt
```

## Gestione Ambiente
Il sistema utilizza `config.js` per gestire le differenze tra ambiente locale (sviluppo) e produzione. In locale è possibile bypassare il login e disattivare la telemetria per semplificare il workflow di sviluppo. Flag chiave: `DISABLE_LOGIN_ON_LOCAL`, `DISABLE_SENDER_ON_LOCAL`, `LOCAL_USER_ID` (vedi `static/js/services/config.js`).

## Convenzioni di Codice
Le convenzioni vincolanti (Return Strict, Template Literal Strict, Fail Fast, Factory Pattern, async/await) sono codificate nelle skill JavaScript caricate in `.agents/skills/javascript/SKILL.md` (locale, non committato — vedi `.gitignore`). Commenti e JSDoc in italiano, identificatori in inglese.
