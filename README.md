<!-- @format -->

# RagIndex: Generazione Aumentata da Recupero (RAG) 100% Client-Side

**Versione:** 0.2.1

**RagIndex** è un'applicazione web che implementa un'architettura RAG (Retrieval-Augmented Generation) completa, operando interamente nel browser dell'utente. Nessun dato lascia mai il client, garantendo massima privacy e autonomia.

> 🚀 **Scopri di più**: Per una presentazione approfondita delle funzionalità e dell'implementazione tecnica, consulta la nuova pagina [ragindex.html](ragindex.html).

## Setup Rapido

Essendo un'applicazione puramente statica, non richiede build system complessi (Webpack, Vite, ecc.) né backend.

1.  **Requisiti**: Un qualsiasi web server statico (es: `python3 -m http.server`, `npx http-server .`, o l'estensione "Live Server" di VS Code).
2.  **Avvio**: Apri il browser all'indirizzo locale della cartella root.
3.  **Configurazione API**: 
    - Apri il menu laterale.
    - Seleziona **"API Keys Default"** per caricare le chiavi di prova predefinite dal file locale.
    - Oppure seleziona **"Gestisci API Key"** per inserire la tua chiave personale (Gemini, Mistral, Groq, OpenRouter, HuggingFace).
    > 🛡️ **Privacy**: Le chiavi sono salvate esclusivamente nell'**IndexedDB** del tuo browser. La comunicazione AI avviene direttamente dal tuo computer al provider, senza server intermedi.

## Caratteristiche Principali

- **Privacy Assoluta**: Tutta l'elaborazione dei documenti, dall'indicizzazione alla costruzione del contesto, avviene localmente. I documenti non lasciano mai il computer dell'utente.
- **Strategia Parent-Child**: Utilizza una segmentazione gerarchica per la massima precisione:
    - **Child Chunks**: Singole frasi indicizzate per una ricerca ultra-precisa.
    - **Parent Chunks**: Paragrafi completi inviati all'AI per mantenere il contesto.
- **Zero Dipendenze da Backend**: L'applicazione è un puro front-end che sfrutta le API degli LLM direttamente dal client.
- **Ricerca Lessicale BM25**: Sfrutta `Lunr.js` per un'indicizzazione veloce e affidabile direttamente nel browser.
- **Giudizio Semantico (rerank)**: Dopo la ricerca BM25, il modello valuta la pertinenza reale (0-5) dei candidati e riordina il contesto: sinonimi e parafrasi vengono promossi, i falsi positivi lessicali declassati. Nessun embedding, nessuna modifica all'indice.

## Il Flusso di Lavoro a 3 Azioni

L'applicazione è progettata per essere utilizzata seguendo tre fasi sequenziali, identificate dai pulsanti numerati:

1.  **🔴 (1) Crea Knowledge Base**: Carica i tuoi documenti (PDF, TXT, DOCX) e clicca il pulsante **(1)**. Il sistema creerà l'indice di ricerca locale.
2.  **🟠 (2) Inizia Conversazione**: Scrivi la tua domanda e clicca il pulsante **(2)**. Il sistema estrarrà i frammenti pertinenti e interrogherà l'AI.
3.  **🟢 (3) Continua Conversazione**: Prosegui il dialogo cliccando il pulsante **(3)**. L'AI risponderà tenendo conto di tutta la cronologia.

## Gestione Modelli LLM

- **Reset LLM**: ripristina la selezione ai modelli di default dai file locali.
- **Aggiorna LLM**: scopre i modelli dai provider con le tue chiavi, li testa (voto ≥ 6) e apre la selezione.
- **Seleziona LLM**: mostra solo i modelli scaricati e testati; Salva sostituisce, Aggiungi unisce.
- **Test LLM**: prova il prompt sui modelli selezionati del provider scelto, con riepilogo finale.
- **STOP**: durante elaborazioni e ricerche, clicca l'icona di attesa (STOP) per interrompere l'operazione in corso.

## Architettura del Codice

- **UI Controller**: `static/js/app_ui.js` (Gestione DOM ed eventi).
- **RAG Engine**: `static/js/rag_engine.js` (Orchestratore del flusso RAG).
- **Worker**: `static/js/rag_worker.js` (Elaborazione intensiva in background).
- **LLM Clients**: `static/js/llmclient/` (5 provider: Gemini, Mistral, Groq, OpenRouter, HuggingFace).
- **Database Locale**: `static/js/services/idb_mgr.js` (Persistenza via Dexie.js).
- **Database Locale**: `static/js/services/idb_mgr.js` (Persistenza via Dexie.js).
- **Test**: 
  - `static/test_providers.html` — eseguito nel browser via menu ☰ → "Test Provider" (oppure aprendo direttamente la pagina).
  - `test/test_providers.js` — Node.js, genera report HTML in `test/providers_report.html`.
  - Entrambi testano tutti i provider e modelli configurati con chiavi da `static/data/api_x.json`.

---
*RagIndex è un progetto focalizzato sulla privacy e sull'efficienza dell'AI lato client.*
