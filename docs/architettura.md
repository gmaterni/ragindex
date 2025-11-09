# Architettura dell'Applicazione RAG-NoEmb-JS

## 1. Filosofia Architetturale

L'architettura di questa applicazione è basata su tre principi fondamentali:

1.  **Separazione delle Competenze (Separation of Concerns):** Ogni parte del codice ha una responsabilità chiara e definita. Questo rende l'applicazione più facile da comprendere, manutenere ed estendere.
2.  **Modularità:** I componenti sono progettati per essere moduli indipendenti e riutilizzabili (es. i servizi di storage, logging, ecc.).
3.  **Flusso di Dati Unidirezionale (ispirato a):** Le azioni dell'utente scatenano eventi che vengono gestiti da un "controllore", il quale a sua volta invoca la logica di business e i servizi. I risultati vengono quindi utilizzati per aggiornare lo stato dei dati e, di conseguenza, l'interfaccia utente.

L'intera applicazione è **client-side**, il che significa che non richiede un backend dedicato per le sue funzionalità principali, ma si affida a servizi esterni (LLM) e alle capacità del browser (storage, processing).

## 2. Layer Architetturali

L'applicazione può essere suddivisa logicamente nei seguenti layer (strati):

![Diagramma Architettura](https://i.imgur.com/xxxx.png)  <!-- Immagine puramente illustrativa -->

1.  **Presentation Layer (UI):**
    - **Componenti:** `ragtext.html`, `less/*.less`
    - **Responsabilità:** Definire la struttura e lo stile dell'interfaccia utente. È uno strato "passivo" che contiene gli elementi HTML (pulsanti, menu, aree di testo) con cui l'utente interagisce.

2.  **Controller Layer:**
    - **Componenti:** `app.js`, `app_ui.js`
    - **Responsabilità:** Agisce come un ponte tra l'UI e la logica di business.
        - `app.js`: È il punto di ingresso che inizializza l'applicazione.
        - `app_ui.js`: Cattura gli eventi dell'utente (es. click su un pulsante) tramite `bindEventListener`, orchestra le chiamate alla logica di business e ai servizi, e aggiorna l'interfaccia utente con i risultati.

3.  **Business Logic Layer:**
    - **Componenti:** `rag_engine.js`
    - **Responsabilità:** Contiene il "cervello" dell'applicazione. Implementa la logica pura e agnostica della pipeline RAG (le funzioni `ne0`, `ne1`, `ne2`, `ne3`). Questo strato non sa nulla dell'interfaccia utente; riceve dati, li elabora e restituisce un risultato.

4.  **Service Layer:**
    - **Componenti:** `services/*.js`
    - **Responsabilità:** Fornisce funzionalità trasversali e riutilizzabili, astraendo operazioni complesse o di basso livello.
        - `idb_mgr.js`, `uadb.js`: Forniscono un'API semplificata per interagire con IndexedDB e LocalStorage, nascondendo i dettagli implementativi.
        - `llm_provider.js`, `gemini_client.js`: Gestiscono la comunicazione con i servizi LLM esterni.
        - `docs_mgr.js`: Gestisce il ciclo di vita dei documenti caricati.
        - `data_keys.js`: Centralizza le chiavi di storage, agendo come un "contratto" per i dati.

5.  **Data Layer:**
    - **Componenti:** Browser Storage (IndexedDB, LocalStorage)
    - **Responsabilità:** È lo strato di persistenza dei dati, dove vengono effettivamente memorizzati gli artefatti RAG e le configurazioni.

## 3. Flusso di una Chiamata: Esempio con la "Fase 2: Cerca"

Per illustrare come i layer interagiscono, seguiamo il flusso di un'azione dell'utente:

1.  **UI Layer:** L'utente scrive una query nell'area di testo e clicca sul pulsante "Cerca" (`#btn-phase2` in `ragtext.html`).

2.  **Controller Layer (`app_ui.js`):**
    - L'evento `click` viene intercettato dalla funzione `bindEventListener`.
    - Viene chiamata la funzione `TextInput.runPhase2()`.
    - `runPhase2` orchestra l'operazione:
        a. Mostra un'icona di caricamento (spinner) sull'interfaccia.
        b. Legge la query dall'input.
        c. Chiama il Service Layer per recuperare i dati necessari.

3.  **Service Layer (`idb_mgr.js`):**
    - `runPhase2` invoca `idbMgr.read(DATA_KEYS.PHASE1_INDEX)` per caricare l'indice di ricerca da IndexedDB.

4.  **Business Logic Layer (`rag_engine.js`):**
    - `runPhase2` chiama `ragEngine.ne2_search()`, passandogli l'indice caricato e la query dell'utente.
    - `ne2_search` esegue la ricerca lessicale utilizzando Lunr.js e restituisce i risultati.

5.  **Service Layer (`idb_mgr.js`):**
    - `runPhase2` riceve i risultati e li passa a `idbMgr.create(DATA_KEYS.PHASE2_CONTEXT, ...)` per salvarli in IndexedDB.

6.  **Controller Layer (`app_ui.js`):**
    - `runPhase2` conclude l'orchestrazione:
        a. Nasconde lo spinner.
        b. Mostra un messaggio di successo all'utente.

Questo flusso dimostra la chiara separazione delle responsabilità: l'UI è passiva, il Controller orchestra, la Business Logic calcola e i Servizi forniscono funzionalità di supporto.

## 4. Componenti Chiave e Responsabilità

- **`app.js`**:
  - **Responsabilità:** Inizializzazione globale.
  - **Funzione Primaria:** `AppMgr.init()` che, al caricamento del DOM, avvia tutti i moduli e collega gli eventi.

- **`app_ui.js`**:
  - **Responsabilità:** Controller dell'UI.
  - **Funzione Primaria:** `bindEventListener()` per la gestione degli eventi; `TextInput.runPhaseX()` per l'orchestrazione del flusso RAG.

- **`rag_engine.js`**:
  - **Responsabilità:** Logica di business RAG.
  - **Funzione Primaria:** Esporta le funzioni `ne0_...` a `ne3_...` che implementano le 4 fasi in modo puro.

- **`services/idb_mgr.js` & `uadb.js`**:
  - **Responsabilità:** Astrazione dello storage.
  - **Funzione Primaria:** Fornire metodi semplici (`create`, `read`, `delete`) per nascondere la complessità delle API del browser.

- **`services/data_keys.js`**:
  - **Responsabilità:** Contratto dei dati.
  - **Funzione Primaria:** Esportare costanti stringa per tutte le chiavi di storage, prevenendo errori di battitura e centralizzando la gestione dei nomi.
