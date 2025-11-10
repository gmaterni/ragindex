# Specifiche Tecniche: RAG-NoEmb-JS

## 1. Introduzione

Questa applicazione implementa un flusso di lavoro **RAG (Retrieval-Augmented Generation)** interamente lato client. Sfrutta le capacità del browser per l'elaborazione e lo storage, e si affida a un modello di linguaggio (LLM) esterno per la generazione delle risposte.

L'architettura è progettata per essere modulare e robusta, guidando l'utente attraverso un flusso di lavoro semplificato basato su **tre azioni principali**.

## 2. Mappa dei Dati Persistenti

L'applicazione utilizza due meccanismi di storage del browser:
- **IndexedDB**: Per dati "pesanti" e strutturati (artefatti RAG, archivi). Gestito tramite `services/idb_mgr.js`.
- **LocalStorage**: Per dati di configurazione "leggeri". Gestito tramite `services/uadb.js`.

---

### Dati di Lavoro (in IndexedDB)

Questi rappresentano lo stato attivo dell'applicazione.

#### 1. Knowledge Base di Lavoro
- **Descrizione**: L'insieme di chunks e indice attualmente in uso per le ricerche. Viene creato dall'Azione 1.
- **Componenti**:
    - **Chiave**: `phase0_chunks`
        - **Contenuto**: `Array<Object>` dei frammenti di testo estratti dai documenti.
    - **Chiave**: `phase1_index`
        - **Contenuto**: `string` (JSON) dell'indice di ricerca `lunr.js` serializzato.

#### 2. Conversazione Attiva
- **Descrizione**: Il contesto di ricerca e la cronologia della conversazione corrente. Viene creata dall'Azione 2 e aggiornata dall'Azione 3.
- **Componenti**:
    - **Chiave**: `phase2_context`
        - **Contenuto**: `string` con i frammenti più pertinenti alla query iniziale.
    - **Chiave**: `thread`
        - **Contenuto**: `Array<Object>` con la cronologia dei messaggi `{role, content}`.

---

### Archivi (in IndexedDB)

Questi rappresentano i salvataggi nominati creati dall'utente.

#### 1. Knowledge Base Archiviata
- **Prefisso Chiave**: `ua-rag-kb-` (es. `ua-rag-kb-libri_scienza`)
- **Fase di Creazione**: Menu -> Knowledge Base -> Archivia
- **Descrizione**: Un singolo oggetto che incapsula una Knowledge Base completa.
- **Formato**: `Object`
- **Esempio**:
  ```json
  {
    "chunks": [ { "id": "...", "text": "..." } ],
    "serializedIndex": "{ \"version\": \"2.3.9\", ... }"
  }
  ```

#### 2. Conversazione Archiviata
- **Prefisso Chiave**: `ua-rag-convo-` (es. `ua-rag-convo-discussione_busa`)
- **Fase di Creazione**: Menu -> Conversazione -> Archivia
- **Descrizione**: Un singolo oggetto che incapsula una conversazione completa (contesto + cronologia).
- **Formato**: `Object`
- **Esempio**:
  ```json
  {
    "context": "--- Chunk: ...",
    "thread": [ { "role": "user", "content": "..." } ]
  }
  ```

---

### Dati di Configurazione (in LocalStorage)

- **Chiave `llm_provider`**: `string` (JSON) con la configurazione del provider LLM.
- **Chiave `ua_theme`**: `string` (`"light"` o `"dark"`) per il tema dell'UI.
- **Chiave `docs_list`**: `string` (JSON) con l'elenco dei nomi dei documenti caricati.
- **Chiave `idoc_{nome_file}`**: `string` con il contenuto testuale di ogni documento.

---

## 3. Flusso di Lavoro a 3 Azioni

La logica è orchestrata da `app_ui.js` che invoca `rag_engine.js`.

### Azione 1: Crea Knowledge Base
- **Pulsante UI**: Primo pulsante "play" (rosso).
- **Funzione Trigger**: `TextInput.runAction1_CreateKnowledgeBase()`
- **Logica Core**: `ragEngine.createKnowledgeBase()` (eseguita in un Web Worker).
- **Processo**:
    1.  Recupera i documenti testuali caricati.
    2.  Li invia al Worker, che li segmenta in "chunks" e costruisce un indice di ricerca `lunr.js`.
- **Output**: I `chunks` e l'`indice serializzato` vengono salvati in IndexedDB come **Knowledge Base di Lavoro**.

### Azione 2: Inizia Conversazione
- **Pulsante UI**: Secondo pulsante "play" (giallo).
- **Funzione Trigger**: `TextInput.runAction2_StartConversation()`
- **Logica Core**: `ragEngine.buildContext()` e `ragEngine.generateResponse()`.
- **Processo**:
    1.  Recupera la query dell'utente e la KB di Lavoro.
    2.  `buildContext` cerca nell'indice i chunks pertinenti e costruisce una stringa di **contesto**.
    3.  `generateResponse` invia al LLM il contesto, la query e un `thread` di conversazione vuoto.
- **Output**: Il `contesto` e il `thread` (con la prima domanda e risposta) vengono salvati in IndexedDB come **Conversazione Attiva**.

### Azione 3: Continua Conversazione
- **Pulsante UI**: Terzo pulsante "play" (verde).
- **Funzione Trigger**: `TextInput.runAction3_ContinueConversation()`
- **Logica Core**: `ragEngine.generateResponse()`.
- **Processo**:
    1.  Recupera la nuova query dell'utente e la Conversazione Attiva (contesto + thread).
    2.  Aggiunge la nuova query al `thread`.
    3.  `generateResponse` invia al LLM il contesto originale e il `thread` aggiornato.
- **Output**: Il `thread` della Conversazione Attiva viene aggiornato con la nuova domanda e risposta.

---

## 4. Componenti dell'Interfaccia Utente (UI)

La UI è definita in `static/ragtext.html` e gestita da `static/js/app_ui.js`.

### 4.1. Menu Laterale (`.menu-box`)
Contiene link per la gestione dei dati e la configurazione.

- **Knowledge Base**:
    - `menu-save-kb`: Archivia la KB di lavoro corrente.
    - `menu-elenco-kb`: Mostra, carica o elimina le KB archiviate.
- **Conversazione**:
    - `menu-view-convo`: Visualizza la conversazione attiva in una finestra.
    - `menu-save-convo`: Archivia la conversazione attiva.
    - `menu-elenco-convo`: Mostra, carica o elimina le conversazioni archiviate.
- **Gestione Dati**:
    - `menu-elenco-docs`: Mostra i documenti caricati.
    - `menu-elenco-dati`: Riepilogo di tutti i dati archiviati.
    - `menu-delete-all`: Apre una finestra per la cancellazione dei dati.
- **Altro**:
    - `menu-readme`, `menu-quickstart`: Mostrano documentazione.
    - `menu-show-config`: Visualizza la configurazione LLM.
    - `menu-help-esempi`: Carica documenti di esempio.

### 4.2. Finestra di Output
- **Nuova Conversazione (`#clear-history1`)**: Cancella solo la cronologia (`thread`).
- **Nuovo Contesto & Conversazione (`#clear-history2`)**: Cancella contesto e cronologia.