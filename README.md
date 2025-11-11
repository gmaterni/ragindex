# RAG-NoEmb-JS: Retrieval-Augmented Generation Client-Side

## Introduzione

RAG-NoEmb-JS è un'applicazione web interamente client-side che implementa il pattern **Retrieval-Augmented Generation (RAG)**. Sfrutta le capacità di elaborazione e storage del browser per interagire con modelli di linguaggio di grandi dimensioni (LLM) esterni, fornendo risposte contestualizzate basate sui documenti forniti dall'utente.

L'applicazione è progettata per essere modulare, reattiva e guidare l'utente attraverso un flusso di lavoro semplificato basato su **tre azioni principali**.

## Architettura

L'architettura è modulare e si basa su:
- **Presentation Layer (UI)**: `ragtext.html`, `less/*.less` per struttura e stile.
- **Controller Layer**: `app.js`, `app_ui.js` per l'orchestrazione del flusso di lavoro e l'aggiornamento dell'interfaccia.
- **Business Logic Layer**: `rag_engine.js` per la costruzione del contesto e la generazione delle risposte.
- **Background Processing Layer**: `rag_worker.js` (Web Worker) per operazioni intensive come la creazione della Knowledge Base, evitando di bloccare l'UI.
- **Service Layer**: `services/*.js` per funzionalità trasversali (storage, LLM API, gestione documenti).
- **Data Layer**: IndexedDB e LocalStorage del browser per la persistenza dei dati.

## Flusso di Lavoro a 3 Azioni

L'interazione con l'applicazione segue un processo intuitivo suddiviso in tre fasi principali:

### Azione 1: Crea Knowledge Base
- **Scopo**: Preparare i documenti per la ricerca.
- **Processo**: I documenti caricati vengono segmentati in "Chunks" e indicizzati per creare una "Knowledge Base di Lavoro" (salvata in IndexedDB). Questa operazione è eseguita in background.

### Azione 2: Inizia Conversazione
- **Scopo**: Avviare una nuova conversazione contestualizzata.
- **Processo**: L'applicazione usa la query dell'utente per cercare nella Knowledge Base, costruire un "Contesto" con le informazioni più pertinenti e generare la prima risposta dall'LLM. Il contesto e la cronologia della conversazione vengono salvati come "Conversazione Attiva".

### Azione 3: Continua Conversazione
- **Scopo**: Proseguire il dialogo con l'LLM, mantenendo il filo del discorso.
- **Processo**: L'LLM utilizza il contesto originale e l'intera cronologia della conversazione aggiornata con la nuova query per formulare risposte coerenti.

## Gestione dei Dati

L'applicazione gestisce i dati in modo persistente tramite IndexedDB (per Knowledge Base e conversazioni) e LocalStorage (per configurazioni). È possibile archiviare, caricare e gestire Knowledge Base e conversazioni, oltre a visualizzare e cancellare i dati salvati.

## Quick Start

Per una guida dettagliata su come iniziare a usare l'applicazione, consulta il file `docs/quickstart.md`.
