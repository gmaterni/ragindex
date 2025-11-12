# RagIndex: Generazione Aumentata da Recupero (RAG) 100% Client-Side

**RagIndex** è un'applicazione web che implementa un'architettura RAG (Retrieval-Augmented Generation) completa, operando interamente nel browser dell'utente. Nessun dato viene inviato a un server, garantendo massima privacy e autonomia.

A differenza degli approcci RAG tradizionali che si basano su *embeddings* e ricerca semantica, RagIndex utilizza una **ricerca lessicale avanzata** (basata sull'algoritmo BM25) per recuperare le informazioni. Questa scelta architetturale rende l'applicazione leggera, veloce e interpretabile, senza la necessità di un backend o di costose API di vettorizzazione.

## Obiettivi del Progetto

- **Privacy Assoluta**: Tutta l'elaborazione dei documenti, dall'indicizzazione alla costruzione del contesto, avviene localmente. I documenti non lasciano mai il computer dell'utente.
- **Zero Dipendenze da Backend**: L'applicazione è un puro front-end. Può essere eseguita da un semplice web server o persino da un file locale.
- **Efficienza e Velocità**: Sfrutta un indice di ricerca lessicale (Lunr.js con BM25) che è computazionalmente leggero e veloce da costruire, ideale per l'ambiente browser.
- **Interpretabilità**: I risultati della ricerca sono basati sulla rilevanza statistica dei termini, rendendo il processo di "retrieval" più trasparente rispetto alla ricerca per similarità vettoriale.
- **Accessibilità**: Consente a chiunque di sfruttare la potenza del RAG senza dover configurare complessi ambienti server o sostenere costi per servizi di embedding.

## Architettura

L'architettura di RagIndex è modulare e progettata per massimizzare la reattività dell'interfaccia utente, separando le operazioni leggere da quelle computazionalmente intensive.

1.  **Presentation Layer (UI)**: La struttura HTML (`index.html`) e lo stile (`less/*.less`) che compongono l'interfaccia utente.
2.  **Controller Layer (`app.js`, `app_ui.js`)**: Gestisce gli eventi dell'utente, orchestra il flusso di lavoro e aggiorna l'interfaccia. È il "cervello" che collega l'UI alla logica di business.
3.  **Business Logic Layer (`rag_engine.js`)**: Contiene la logica RAG per le operazioni rapide eseguite nel thread principale, come la costruzione del contesto e la preparazione delle query per l'LLM.
4.  **Background Processing Layer (`rag_worker.js`)**: Un **Web Worker** dedicato esegue le operazioni più pesanti in un thread separato. La creazione della Knowledge Base (segmentazione dei documenti e indicizzazione) avviene qui, garantendo che l'interfaccia rimanga sempre fluida e reattiva.
5.  **Service Layer (`services/*.js`)**: Fornisce funzionalità trasversali come l'interazione con IndexedDB (`idb_mgr.js`), la gestione delle API dei modelli linguistici (`llm_provider.js`) e la gestione dei documenti (`docs_mgr.js`).
6.  **Data Layer (Browser Storage)**: Sfrutta **IndexedDB** per archiviare dati complessi come le Knowledge Base e le conversazioni, e **LocalStorage** per le configurazioni dell'applicazione.

## Il Flusso di Lavoro a 3 Azioni

L'interazione con RagIndex è guidata da un semplice processo in tre fasi:

### Azione 1: Crea Knowledge Base
- **Scopo**: Preparare i documenti per la ricerca.
- **Processo**: I documenti caricati vengono inviati al Web Worker, che li segmenta in "Chunks" (frammenti) e costruisce un indice di ricerca efficiente. Il risultato è una "Knowledge Base di Lavoro" salvata localmente in IndexedDB.

### Azione 2: Inizia Conversazione
- **Scopo**: Avviare un dialogo contestualizzato.
- **Processo**: L'applicazione utilizza la query dell'utente per cercare nell'indice della Knowledge Base. Costruisce quindi un "Contesto" con i chunk più pertinenti e lo invia, insieme alla domanda, al modello linguistico (LLM) scelto per generare la prima risposta.

### Azione 3: Continua Conversazione
- **Scopo**: Proseguire il dialogo mantenendo la coerenza.
- **Processo**: L'LLM riceve la nuova domanda insieme al contesto originale e all'intera cronologia della conversazione. Questo gli permette di formulare risposte che tengono conto di tutto ciò che è stato detto in precedenza.

## Quick Start

Per iniziare a usare l'applicazione, consulta la guida rapida: `docs/quickstart.md`.