<!-- @format -->

# RagIndex: Generazione Aumentata da Recupero (RAG) 100% Client-Side

**Versione:** 0.2.3

**RagIndex** è un'applicazione web che implementa un'architettura RAG (Retrieval-Augmented Generation) completa, operando interamente nel browser dell'utente. Nessun dato viene inviato a un server, garantendo massima privacy e autonomia.

> 📘 **Documentazione Tecnica**: Per una spiegazione dettagliata "sotto il cofano" delle fasi di ingestione, chunking e retrieval, consulta [docs/ARCH_SPECIFICHE.md](docs/ARCH_SPECIFICHE.md).

## Setup Rapido

Essendo un'applicazione puramente statica, non richiede build system complessi (Webpack, Vite, ecc.) né backend.

1.  **Requisiti**: Un qualsiasi web server statico (es: `python3 -m http.server`, `npx http-server .`, o l'estensione "Live Server" di VS Code).
2.  **Avvio**: Apri il browser all'indirizzo locale della cartella root.
3.  **Configurazione API**: Apri il menu laterale e seleziona **"Gestisci API Key"**. Inserisci la tua chiave (Gemini, Mistral o OpenRouter) e attivala cliccando sul relativo selettore.
    > 🛡️ **Privacy**: Le chiavi sono salvate esclusivamente nell'**IndexedDB** del tuo browser. La comunicazione AI avviene direttamente dal tuo computer al provider, senza server intermedi.

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

RagIndex è progettato per essere utilizzato seguendo tre fasi sequenziali, identificate dai pulsanti numerati:

1.  **🔴 (1) Crea Knowledge Base**: Carica i tuoi documenti (icona nuvola o menu documenti esempio) e clicca il pulsante **(1)**. Il sistema segmenterà il testo e creerà un indice di ricerca locale.
2.  **🟠 (2) Inizia Conversazione**: Scrivi la tua domanda nel campo di input e clicca il pulsante **(2)** (o premi Invio). Il sistema cercherà i frammenti più rilevanti e interrogherà l'AI.
3.  **🟢 (3) Continua Conversazione**: Scrivi domande di approfondimento e clicca il pulsante **(3)**. L'AI risponderà tenendo conto di tutta la cronologia e del contesto già identificato.
