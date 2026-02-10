# Analisi del Sistema RAG Index

## Panoramica del Progetto

Il sistema RAG Index è un'applicazione web client-side che implementa un sistema di Retrieval-Augmented Generation (RAG) per consentire interrogazioni intelligenti su documenti personali. L'applicazione permette agli utenti di caricare documenti, creare una knowledge base basata su questi documenti e poi porre domande contestuali ai Large Language Models (LLMs) utilizzando il contenuto dei documenti come contesto.

## Struttura del Codice

### Componenti Principali

#### 1. Applicazione Principale (`app.js`)
- Gestisce l'inizializzazione dell'applicazione
- Coordina i vari componenti del sistema
- Versione corrente: 0.2.0

#### 2. Interfaccia Utente (`app_ui.js`)
- Gestisce tutta l'interfaccia utente
- Implementa finestre dinamiche per visualizzare dati
- Gestisce input/output testuali
- Implementa spinner per indicare operazioni in corso
- Supporta temi chiaro/scuro
- Utilizza VanJS per gestire lo stato reattivo

#### 3. Gestore Applicazione (`app_mgr.js`)
- Inizializza e configura il provider LLM
- Calcola dimensioni dei prompt in base alla finestra del modello
- Gestisce il client LLM

#### 4. Motore RAG (`rag_engine.js`)
- Coordinazione tra chunking, indicizzazione e generazione
- Implementa la ricerca nel contesto usando un indice Lunr
- Comunica con il Web Worker per operazioni intensive
- Gestisce la costruzione del contesto e la generazione delle risposte

#### 5. Web Worker RAG (`rag_worker.js`)
- Esegue operazioni intensive di chunking e indicizzazione
- Implementa chunking gerarchico (Parent-Child)
- Usa Compromise.js per l'elaborazione linguistica
- Usa Lunr.js per l'indicizzazione e ricerca full-text
- Supporta l'italiano grazie a lunr.it.js

#### 6. Caricatore Documenti (`uploader.js`)
- Gestisce il caricamento di documenti (TXT, PDF, DOCX)
- Supporta drag-and-drop e selezione di directory
- Estrae testo da PDF e DOCX usando librerie esterne
- Gestisce feedback progressivo durante l'upload

#### 7. Client LLM (`llmclient/*`)
- Implementazioni specifiche per diversi provider:
  - Gemini (Google)
  - Groq
  - Mistral
  - Hugging Face
- Ogni client gestisce la conversione del payload specifico del provider
- Gestione degli errori e cancellazione delle richieste

### Servizi

#### 1. Gestione Database (`services/idb_mgr.js`)
- Wrapper su Dexie.js per IndexedDB
- Gestisce dati pesanti e complessi
- Schema versionato con due tabelle: `kvStore` e `settings`

#### 2. Database Utente (`services/uadb.js`)
- Wrapper asincrono su IndexedDB per dati di configurazione
- Gestisce preferenze utente e configurazioni

#### 3. Gestione Documenti (`services/docs_mgr.js`)
- Gestisce l'archiviazione e recupero dei documenti caricati
- Opera in modo asincrono

#### 4. Chiavi di Dati (`services/data_keys.js`)
- Definisce tutte le chiavi di archiviazione usate nell'app
- Centralizza la gestione delle chiavi per consistenza

#### 5. Prompt Builder (`llm_prompts.js`)
- Costruisce i prompt per i LLM in base al contesto
- Implementa logica per distinguere tra richieste con e senza contesto
- Gestisce la cronologia della conversazione

#### 6. Utilità di Testo (`text_cleaner.js`)
- Pulisce e normalizza il testo dai documenti
- Rimuove tag, link e caratteri speciali
- Gestisce caratteri unicode e spazi multipli

#### 7. Utilità di Cronologia (`history_utils.js`)
- Converte messaggi tra formato HTML e testo
- Formatta la cronologia delle conversazioni
- Gestisce ruoli utente, assistente e sistema

## Architettura Tecnica

### Stack Tecnologico
- **VanJS**: Framework reattivo leggero per la gestione dello stato
- **Dexie.js**: Wrapper su IndexedDB per database locale
- **Lunr.js**: Motori di ricerca full-text
- **Compromise.js**: Elaborazione linguistica naturale
- **PDF.js**: Estrazione testo da PDF
- **Mammoth.js**: Estrazione testo da DOCX

### Flusso di Lavoro

1. **Caricamento Documenti**: Gli utenti caricano documenti che vengono archiviati localmente
2. **Creazione Knowledge Base**: I documenti vengono suddivisi in chunk e indicizzati
3. **Interrogazione**: Le query degli utenti vengono confrontate con l'indice per trovare contesto rilevante
4. **Generazione Risposta**: Il contesto viene inviato al LLM insieme alla query per generare una risposta contestuale

### Sicurezza e Privacy
- Tutti i dati rimangono sul dispositivo dell'utente
- Nessun caricamento di documenti su server esterni
- Le API keys sono memorizzate localmente e criptate

### Persistenza Dati
- **IndexedDB**: Per dati pesanti come documenti, chunk e indici
- **localStorage**: Per configurazioni e preferenze utente
- **Dexie.js**: Per astrazione e gestione efficiente del database

## Caratteristiche Distintive

1. **Approccio RAG Completo**: Implementazione end-to-end di un sistema RAG client-side
2. **Supporto Multiplo Documento**: Supporto per TXT, PDF e DOCX
3. **Chunking Gerarchico**: Approccio Parent-Child per una migliore gestione del contesto
4. **Web Workers**: Operazioni intensive eseguite in background per non bloccare l'UI
5. **Multi-Provider LLM**: Supporto per diversi servizi di LLM
6. **Interfaccia Reattiva**: UI aggiornata automaticamente grazie a VanJS
7. **Gestione Contesto Conversazionale**: Mantenimento della cronologia delle conversazioni

## Note Tecniche Importanti

- Il codice utilizza ampiamente programmazione asincrona con Promises e async/await
- Presenza di commenti AAA che indicano modifiche significative o ottimizzazioni
- Implementazione di meccanismi di retry per le richieste ai LLM
- Gestione avanzata degli errori e dei casi limite
- Supporto per cancellazione richieste in corso
- Ottimizzazione per la lingua italiana (tramite lunr.it.js e Compromise.js)