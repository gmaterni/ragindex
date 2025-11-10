# Specifiche Tecniche dell'Applicazione RAG-NoEmb-JS

## 1. Introduzione

Questa applicazione implementa un flusso di lavoro **RAG (Retrieval-Augmented Generation)** interamente lato client, senza la necessità di un backend per l'embedding o per la ricerca vettoriale. Sfrutta un modello di linguaggio (LLM) per tutte le fasi del processo, dalla segmentazione dei documenti alla generazione della risposta finale.

L'architettura è progettata per essere modulare e pedagogica, suddividendo il complesso processo RAG in quattro fasi distinte e gestibili dall'utente.

## 2. Mappa dei Dati Persistenti

L'applicazione utilizza due meccanismi di storage del browser per garantire la persistenza dei dati tra le sessioni. La logica è la seguente:
- **IndexedDB**: Utilizzato per memorizzare dati "pesanti" e strutturati, come gli artefatti generati dalla pipeline RAG. Gestito tramite `services/idb_mgr.js`.
- **LocalStorage**: Utilizzato per dati di configurazione "leggeri" e stringhe semplici. Gestito tramite `services/uadb.js`.

Di seguito è riportata una mappa dettagliata dei dati salvati durante il flusso di lavoro.

---

### Artefatti della Pipeline RAG (in IndexedDB)

#### 1. Frammenti dei Documenti (Chunks)
- **Chiave**: `phase0_chunks`
- **Fase di Creazione**: Fase 0 (Segmenta)
- **Descrizione**: Un array contenente tutti i frammenti di testo estratti dai documenti caricati.
- **Formato**: `Array<Object>`
- **Esempio di un elemento dell'array**:
  ```json
  {
    "id": "doc0-chunk1",
    "text": "Questo è un frammento di testo analizzato.",
    "keywords": ["frammento", "testo", "analizzato"],
    "entities": []
  }
  ```

#### 2. Indice di Ricerca
- **Chiave**: `phase1_index`
- **Fase di Creazione**: Fase 1 (Indicizza)
- **Descrizione**: L'indice di ricerca lessicale creato da `lunr.js`, serializzato in una stringa JSON.
- **Formato**: `string` (JSON)
- **Esempio**: `"{ "version": "2.3.9", "fields": [...], ... }"`

#### 3. Contesto della Query
- **Chiave**: `phase2_context`
- **Fase di Creazione**: Fase 2 (Crea Contesto)
- **Descrizione**: I risultati della ricerca effettuata con la query dell'utente. Questo è il "contesto" che verrà passato all'LLM.
- **Formato**: `Array<Object>`
- **Esempio di un elemento dell'array**:
  ```json
  {
    "ref": "doc0-chunk1",
    "score": 0.85,
    "matchData": { "metadata": {} }
  }
  ```

#### 4. Cronologia della Conversazione
- **Chiave**: `thread`
- **Fase di Creazione**: Gestita in `app_ui.js` dopo ogni interazione.
- **Descrizione**: L'intera conversazione tra l'utente e l'assistente.
- **Formato**: `Array<Object>`
- **Esempio**:
  ```json
  [
    { "role": "user", "content": "Qual è lo scopo?" },
    { "role": "assistant", "content": "Lo scopo è..." }
  ]
  ```

---

### Dati di Configurazione e Supporto (in LocalStorage)

#### 1. Query dell'Utente
- **Chiave**: `phase2_query`
- **Fase di Creazione**: Fase 2 (Crea Contesto)
- **Descrizione**: L'ultima query inserita dall'utente per la ricerca.
- **Formato**: `string`
- **Esempio**: `"spiegami il processo"`

#### 2. Configurazione del Provider LLM
- **Chiave**: `llm_provider`
- **Fase di Creazione**: Selezione nel menu LLM
- **Descrizione**: Un oggetto JSON che memorizza il provider, il modello e la configurazione dell'LLM scelto.
- **Formato**: `string` (JSON)
- **Esempio**: `"{ "provider": "gemini", "model": "gemini-2.5-flash-lite", ... }"`

#### 3. Tema dell'Interfaccia
- **Chiave**: `ua_theme`
- **Fase di Creazione**: Click sui pulsanti tema
- **Descrizione**: Salva il tema scelto (`light` o `dark`).
- **Formato**: `string`
- **Esempio**: `"dark"`

#### 4. Elenco Documenti Caricati
- **Chiave**: `docs_list`
- **Fase di Creazione**: Upload dei file
- **Descrizione**: Un array JSON contenente i nomi dei file caricati.
- **Formato**: `string` (JSON)
- **Esempio**: `["documento1.txt", "specifiche.pdf"]`

#### 5. Contenuto dei Documenti
- **Chiave**: `idoc_{nome_file}` (es. `idoc_documento1.txt`)
- **Fase di Creazione**: Upload dei file
- **Descrizione**: Il contenuto testuale di ogni singolo file caricato.
- **Formato**: `string`

---

## 3. Flusso di Lavoro RAG a 4 Fasi

La logica principale della pipeline è implementata in `static/js/rag_engine.js` e orchestrata da `static/js/app_ui.js`.

### Fase 0: Segmentazione
- **Pulsante UI:** `Segmenta` (`#btn-phase0`)
- **Funzione Trigger:** `TextInput.runPhase0()` in `app_ui.js`.
- **Logica Core:** `ragEngine.ne0_chunkAndAnnotate()`
- **Processo:**
    1.  Recupera i documenti testuali caricati tramite `DocsMgr`.
    2.  Per ogni documento, utilizza la libreria NLP client-side (`compromise.js`) per suddividere il testo in "chunks" (frammenti) basati sulle frasi e per estrarre metadati di base come entità e parole chiave.
    3.  Colleziona tutti i chunks generati.
- **Output:** Un array di oggetti `chunk` viene salvato in IndexedDB con la chiave `DATA_KEYS.PHASE0_CHUNKS`.

### Fase 1: Indicizzazione
- **Pulsante UI:** `Indicizza` (`#btn-phase1`)
- **Funzione Trigger:** `TextInput.runPhase1()` in `app_ui.js`.
- **Logica Core:** `ragEngine.ne1_buildIndex()`
- **Processo:**
    1.  Carica i `chunks` dalla chiave `PHASE0_CHUNKS` in IndexedDB.
    2.  Utilizza la libreria **Lunr.js** (`vendor/lunr.js`) per costruire un indice di ricerca lessicale (full-text) basato sul contenuto dei chunks. Vengono utilizzati anche gli stemmer e il supporto per la lingua italiana (`lunr.it.js`, `lunr.stemmer.support.js`).
- **Output:** L'oggetto indice di Lunr.js viene serializzato in una stringa JSON e salvato in IndexedDB con la chiave `DATA_KEYS.PHASE1_INDEX`.

### Fase 2: Ricerca (Creazione Contesto)
- **Pulsante UI:** `Cerca` (`#btn-phase2`)
- **Funzione Trigger:** `TextInput.runPhase2()` in `app_ui.js`.
- **Logica Core:** `ragEngine.ne2_search()`
- **Processo:**
    1.  Recupera la query testuale inserita dall'utente.
    2.  Carica l'indice serializzato da IndexedDB e lo deserializza in un oggetto Lunr.
    3.  Esegue una ricerca full-text sull'indice utilizzando la query dell'utente.
- **Output:** Un array di oggetti, rappresentanti i risultati più pertinenti (il "contesto"), viene salvato in IndexedDB con la chiave `DATA_KEYS.PHASE2_CONTEXT`. La query utilizzata viene salvata in LocalStorage.

### Fase 3: Generazione Risposta
- **Pulsante UI:** `Genera` (`#btn-phase3`)
- **Funzione Trigger:** `TextInput.runPhase3()` in `app_ui.js`.
- **Logica Core:** `ragEngine.ne3_generateResponse()`
- **Processo:**
    1.  Carica i `chunks` (da Fase 0), il `contesto` (da Fase 2) e la `query` (da Fase 2).
    2.  Assembla un prompt complesso per l'LLM, che include la query originale e il contesto estratto dai chunks più rilevanti.
    3.  Invia il prompt al provider LLM configurato (es. Gemini).
- **Output:** La risposta generata dall'LLM viene visualizzata nell'interfaccia utente e aggiunta alla cronologia della conversazione (`KEY_THREAD`) in IndexedDB.

---

## 4. Componenti dell'Interfaccia Utente (UI)

La UI è definita in `static/ragtext.html` e gestita da `static/js/app_ui.js`.

### 4.1. Barra Superiore
- **Menu Laterale (`#id-menu-btn`):** Apre/chiude il menu laterale.
- **Help (`#btn-help`):** Mostra le istruzioni (`Commands.help()`).
- **Upload (`#btn-upload`):** Apre la finestra di dialogo per il caricamento file (`Commands.upload()`).
- **Provider LLM (`#btn-provider-settings`):** Apre il selettore del provider e modello LLM (`Commands.providerSettings()`).
- **Log (`#id_log`):** Mostra/nasconde la finestra di log (`Commands.log()`).
- **Tema (`#btn-dark-theme`, `#btn-light-theme`):** Cambia il tema dell'interfaccia.

### 4.2. Menu Laterale (`.menu-box`)
Contiene link per visualizzare, salvare e gestire i dati delle varie fasi.

- **Gestione Fasi:**
    - **Chunks:** `menu-show-chunks`, `menu-save-chunks`, `menu-elenco-chunks`.
    - **Indice:** `menu-show-index`, `menu-save-index`, `menu-elenco-index`.
    - **Contesto:** `menu-show-context`, `menu-save-context`, `menu-elenco-context`.
- **Conversazione:**
    - `menu-show-thread`, `menu-save-thread`, `menu-elenco-threads`.
- **Gestione Dati:**
    - `menu-elenco-docs`: Mostra i documenti caricati.
    - `menu-elenco-dati`: Riepilogo di tutti i dati in storage.
    - `menu-delete-all`: Apre una finestra per la cancellazione selettiva o totale dei dati.
- **Altro:**
    - `menu-readme`, `menu-quickstart`: Mostrano documentazione.
    - `menu-show-config`: Visualizza la configurazione LLM.
    - `menu-help-esempi`: Carica documenti di esempio.

### 4.3. Finestra di Output
- **Copia (`.copy-output`):** Copia il contenuto.
- **Nuova Conversazione (`#clear-history1`):** Cancella solo la cronologia della conversazione.
- **Nuovo Contesto & Conversazione (`#clear-history2`):** Cancella contesto e conversazione.

---

## 5. Script Principali e Loro Ruolo

- **`app.js`:**
  - Punto di ingresso (entry point).
  - Inizializza tutti i moduli principali (`AppMgr.init()`) al caricamento del DOM.
  - Chiama `app_ui.js` per collegare tutti gli eventi dell'interfaccia (`bindEventListener`).

- **`app_ui.js`:**
  - Funge da "controllore" principale per l'interfaccia utente.
  - Contiene le funzioni `runPhase0` a `runPhase3` che orchestrano il flusso RAG.
  - Implementa tutte le funzioni associate ai comandi del menu (es. `showChunks`, `elencoDati`, `deleteAllData`).
  - Gestisce l'apertura e la chiusura di finestre di dialogo e informative.
  - La funzione `bindEventListener()` mappa tutti gli ID degli elementi HTML alle rispettive funzioni JavaScript.

- **`rag_engine.js`:**
  - Contiene la logica di business "pura" della pipeline RAG.
  - Le sue funzioni (`ne0_...`, `ne1_...`, ecc.) sono agnostiche rispetto all'interfaccia e si concentrano esclusivamente sull'elaborazione dei dati.

- **`services/`:**
  - **`data_keys.js`:** Definisce costanti per le chiavi di storage, garantendo coerenza in tutta l'applicazione.
  - **`idb_mgr.js`:** Un wrapper semplificato per le operazioni asincrone su IndexedDB (creazione, lettura, cancellazione).
  - **`uadb.js`:** Un wrapper per le operazioni sincrone su LocalStorage.
  - **`docs_mgr.js`:** Gestisce i documenti caricati dall'utente (aggiunta, eliminazione, recupero).
  - **`llm_provider.js`:** Gestisce la selezione e la configurazione del provider LLM e del modello.
  - **`help.js`:** Contiene le stringhe HTML per le finestre di aiuto e documentazione.
  - **`vendor/`:** Contiene librerie di terze parti come `lunr.js` per la ricerca.
