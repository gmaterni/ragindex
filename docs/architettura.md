# Architettura dell'Applicazione RagIndex

## 1. Filosofia Architetturale

L'architettura è progettata per essere **modulare, client-side e reattiva**, basandosi su tre principi:

1.  **Separazione delle Competenze:** Ogni modulo ha una responsabilità chiara (UI, controllo, logica di business, servizi).
2.  **Offloading del Carico Pesante:** Le operazioni computazionalmente intensive (creazione della Knowledge Base) vengono delegate a un **Web Worker** per non bloccare l'interfaccia utente.
3.  **Flusso di Dati Guidato dagli Eventi:** Le azioni dell'utente attivano funzioni "controllore" che orchestrano le chiamate alla logica di business e ai servizi, per poi aggiornare lo stato e l'UI.

## 2. Layer Architetturali e Componenti Chiave

L'applicazione è suddivisa logicamente in più strati, ognuno con componenti specifici.

![Diagramma Architettura Semplificato](https://i.imgur.com/9E8Z7Yc.png) <!-- Immagine puramente illustrativa -->

1.  **Presentation Layer (UI)**
    - **Componenti:** `ragtext.html`, `less/*.less`
    - **Responsabilità:** Definisce la struttura e lo stile dell'interfaccia. È uno strato "passivo" che attende l'interazione dell'utente.

2.  **Controller Layer**
    - **Componenti:** `app.js`, `app_ui.js`
    - **Responsabilità:** È il ponte tra l'UI e la logica applicativa.
        - `app.js`: Punto di ingresso, inizializza l'applicazione e i suoi moduli.
        - `app_ui.js`: Contiene i gestori di eventi (`bindEventListener`), le funzioni `runActionX()` che orchestrano il flusso di lavoro e la logica per aggiornare gli elementi dell'interfaccia (es. il nome della KB attiva). Chiama i servizi per accedere ai dati e il motore RAG per elaborarli.

3.  **Business Logic Layer (Main Thread)**
    - **Componenti:** `rag_engine.js`
    - **Responsabilità:** Contiene il "cervello" RAG per le operazioni veloci.
        - `buildContext()`: Esegue la ricerca lessicale sull'indice e costruisce la stringa di contesto.
        - `generateResponse()`: Prepara il prompt e gestisce la comunicazione con il servizio LLM.

4.  **Background Processing Layer**
    - **Componenti:** `rag_worker.js`
    - **Responsabilità:** Esegue operazioni lunghe e pesanti in un thread separato per non bloccare l'UI.
        - `createKnowledgeBase`: Riceve i documenti, li segmenta in chunks e crea l'indice di ricerca. Comunica il risultato al thread principale al termine.

5.  **Service Layer**
    - **Componenti:** `services/*.js`
    - **Responsabilità:** Fornisce funzionalità trasversali e riutilizzabili.
        - `idb_mgr.js`, `uadb.js`: API semplificate per lo storage su IndexedDB e LocalStorage.
        - `llm_provider.js`, `llm_clients/*.js`: Gestiscono la comunicazione con le API degli LLM.
        - `docs_mgr.js`: Gestisce i documenti caricati dall'utente.
        - `data_keys.js`: Centralizza le chiavi di storage.

6.  **Data Layer**
    - **Componenti:** Browser Storage (IndexedDB, LocalStorage).
    - **Responsabilità:** Persistenza dei dati (KB di lavoro, conversazione attiva, archivi, configurazioni).

## 3. Flusso di una Chiamata: Esempio con "Azione 2: Inizia Conversazione"

1.  **UI Layer:** L'utente scrive una query e clicca sul secondo pulsante "play" (`#btn-action2-start-convo`).

2.  **Controller Layer (`app_ui.js`):**
    - L'evento `click` viene intercettato da `bindEventListener`.
    - Viene chiamata la funzione `TextInput.runAction2_StartConversation()`.
    - `runAction2` orchestra l'operazione:
        a. Mostra uno spinner di caricamento.
        b. Chiama il Service Layer per recuperare la KB di lavoro.

3.  **Service Layer (`idb_mgr.js`):**
    - `runAction2` invoca `idbMgr.read()` per caricare i `chunks` e l' `indice` da IndexedDB.

4.  **Business Logic Layer (`rag_engine.js`):**
    - `runAction2` chiama `ragEngine.buildContext()`, passandogli i dati della KB e la query. Questa funzione, essendo veloce, viene eseguita nel thread principale.
    - Il contesto (`string`) viene restituito.
    - `runAction2` chiama `ragEngine.generateResponse()`, passandogli il contesto e la query.

5.  **LLM Service Layer (`llm_provider.js`):**
    - `generateResponse` prepara il payload e invia la richiesta all'LLM tramite il client configurato.

6.  **Controller & Service Layers (`app_ui.js`, `idb_mgr.js`):**
    - La risposta dell'LLM viene ricevuta.
    - `runAction2` salva la nuova conversazione (contesto + thread) in IndexedDB tramite `idbMgr.create()`.
    - Chiama `showHtmlThread()` per aggiornare l'area di output dell'interfaccia.
    - Nasconde lo spinner.

Questo flusso dimostra la chiara separazione delle responsabilità e l'uso strategico del thread principale per operazioni veloci e del worker per quelle lente, garantendo un'esperienza utente fluida.