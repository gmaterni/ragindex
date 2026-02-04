<!-- @format -->

# RagIndex: Generazione Aumentata da Recupero (RAG) 100% Client-Side

**Versione:** 0.2.0

**RagIndex** è un'applicazione web che implementa un'architettura RAG (Retrieval-Augmented Generation) completa, operando interamente nel browser dell'utente. Nessun dato viene inviato a un server, garantendo massima privacy e autonomia.

> 📘 **Documentazione Tecnica**: Per una spiegazione dettagliata "sotto il cofano" delle fasi di ingestione, chunking e retrieval, consulta [docs/PROJECT.md](docs/PROJECT.md).

## Setup Rapido

Essendo un'applicazione puramente statica, non richiede build system complessi (Webpack, Vite, ecc.) né backend.

1.  **Requisiti**: Un qualsiasi web server statico.
    *   *Opzione A (VS Code)*: Installa l'estensione "Live Server" e clicca "Go Live".
    *   *Opzione B (Python)*: Esegui `python3 -m http.server` nella cartella root.
    *   *Opzione C (Node)*: `npx http-server .`
2.  **Avvio**: Apri il browser all'indirizzo locale (es. `http://localhost:8080/index.html`).
3.  **Configurazione**: Apri il menu laterale e seleziona **"Gestisci API Key"** per configurare le tue chiavi (Gemini, Groq o Mistral). Le chiavi sono salvate in modo sicuro nell'**IndexedDB** del tuo browser.

## Obiettivi del Progetto

- **Privacy Assoluta**: Tutta l'elaborazione dei documenti, dall'indicizzazione alla costruzione del contesto, avviene localmente. I documenti non lasciano mai il computer dell'utente.
- **Zero Dipendenze da Backend**: L'applicazione è un puro front-end che sfrutta le API degli LLM direttamente dal client.
- **Efficienza e Velocità**: Sfrutta un indice di ricerca lessicale (Lunr.js con BM25) ottimizzato per il browser ed eseguito in Web Worker.
- **Interpretabilità**: I risultati della ricerca sono trasparenti e verificabili tramite la visualizzazione del contesto estratto.

## Architettura

L'architettura separa le operazioni UI da quelle intensive (eseguite in Web Worker) e utilizza **IndexedDB** (tramite Dexie.js) per la persistenza di documenti e indici di grandi dimensioni.

### Strati Architetturali

1.  **Presentation Layer (UI)**: `index.html`, `less/*.less`.
2.  **Controller Layer**: `app.js`, `app_ui.js`.
3.  **Business Logic Layer**: `rag_engine.js` (orchestratore RAG).
4.  **Background Processing**: `rag_worker.js` (Web Worker per chunking e indicizzazione).
5.  **Service Layer**: `services/*.js` (IndexedDB, API Client, Logger).

### Innovazioni: Chunking Parent-Child

RagIndex utilizza una segmentazione gerarchica:
- **Parent Chunks**: Unità di contesto (paragrafi completi) inviate all'LLM.
- **Child Chunks**: Unità di ricerca (singole frasi) indicizzate per massima precisione.

### Supporto Multi-Provider LLM

RagIndex supporta diverse piattaforme tramite API standard. I modelli sono configurabili tramite l'interfaccia UI:

- **Gemini** (Google): 
  - `gemini-2.5-flash`
  - `gemini-2.5-flash-lite`
  - `gemini-3-flash-preview`
- **Groq**: 
  - `llama-3.1-8b-instant`
  - `llama-3.3-70b-versatile`
  - `groq/compound`
  - `qwen/qwen3-32b`
- **Mistral**: 
  - `mistral-large-latest`
  - `mistral-medium-latest`
  - `mistral-small-latest`
  - `devstral-latest` (e varianti medium/small)
  - `ministral-14b-2512`

## Funzionalità Avanzate

RagIndex include strumenti completi per la gestione dei dati locali:

- **Gestione Knowledge Base**: È possibile archiviare (salvare) e ricaricare intere Knowledge Base indicizzate, permettendo di cambiare contesto di lavoro istantaneamente senza ri-processare i documenti.
- **Archivio Conversazioni**: Salva e riprendi sessioni di chat, mantenendo intatto il contesto storico.
- **Ispezione Dati**: Strumenti integrati per visualizzare il contenuto grezzo di localStorage e IndexedDB (chiavi, dimensioni, JSON).
- **Temi**: Supporto nativo per temi Chiaro/Scuro.

## Il Flusso di Lavoro a 3 Azioni

1.  **Crea Knowledge Base**: Il Web Worker segmenta i documenti e crea l'indice locale.
2.  **Inizia Conversazione**: Il sistema recupera il contesto pertinente e interroga l'LLM.
3.  **Continua Conversazione**: Mantiene la cronologia della chat per risposte coerenti.
