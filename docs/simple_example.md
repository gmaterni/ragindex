# Esempio Pratico: Il Viaggio di un Dato nel Flusso a 3 Azioni

Questo documento illustra con un esempio concreto come un'informazione viaggia attraverso la pipeline RAG, seguendo il nuovo flusso di lavoro semplificato.

---

### Dati di Partenza: Il Documento

Immaginiamo di caricare un singolo documento di testo (`doc1.txt`) con il seguente contenuto:

```txt
L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.
```

---

### Azione 1: Crea Knowledge Base

**Azione Utente:** L'utente, dopo aver caricato il documento, preme il **primo pulsante "play"** (rosso).

**Processo del Sistema:**
In un thread in background (Web Worker) per non bloccare l'interfaccia, il sistema esegue due passaggi in uno:
1.  **Segmentazione:** Il testo viene analizzato e suddiviso in frammenti (chunks).
2.  **Indicizzazione:** Viene costruito un indice di ricerca (`lunr.js`) che mappa le parole chiave ai chunk corrispondenti.

**Output (Stato dell'Applicazione):**
Viene creata la **"Knowledge Base di Lavoro"**, composta da due artefatti salvati in IndexedDB:
-   **Chunks** (`phase0_chunks`): L'array di frammenti di testo.
-   **Indice** (`phase1_index`): L'indice di ricerca serializzato.

**Rappresentazione Concettuale della KB di Lavoro:**
-   **Chunk 1:** `{ id: "doc0-chunk0", text: "L'intelligenza artificiale..." }`
-   **Indice:** `{ "roberto" -> [doc0-chunk0], "busa" -> [doc0-chunk0], "ia" -> [doc0-chunk0], ... }`

---

### Azione 2: Inizia Conversazione

**Azione Utente:** L'utente scrive la sua prima domanda (query) e preme il **secondo pulsante "play"** (giallo).

**Query:** `chi era Roberto Busa?`

**Processo del Sistema:**
1.  **Ricerca e Costruzione Contesto:**
    -   Il sistema carica la KB di Lavoro (chunks e indice).
    -   Usa l'indice per cercare i chunk più pertinenti alla query. In questo caso, trova `doc0-chunk0`.
    -   Assembla il testo dei chunk trovati in una singola stringa formattata, il **Contesto**.

    **Contesto Generato:**
    ```txt
    --- Chunk: doc0-chunk0, Score: 0.9800 ---
    L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.
    ```

2.  **Generazione Risposta:**
    -   Il sistema prepara un **prompt** per l'LLM che include il **Contesto** appena creato e la **Query** dell'utente.
    -   Invia il prompt all'LLM.

**Output (Stato dell'Applicazione):**
-   La risposta dell'LLM (es. "Basandosi sul contesto, Roberto Busa è stato un pioniere...") viene mostrata all'utente.
-   Viene creata la **"Conversazione Attiva"**, salvando in IndexedDB:
    -   Il **Contesto** (`phase2_context`).
    -   La **Cronologia** (`thread`), che ora contiene la domanda dell'utente e la risposta dell'assistente.

---

### Azione 3: Continua Conversazione

**Azione Utente:** L'utente scrive una seconda domanda di approfondimento e preme il **terzo pulsante "play"** (verde).

**Query:** `e cosa è l'IA generativa?`

**Processo del Sistema:**
1.  **Recupero Conversazione Attiva:**
    -   Il sistema carica il **Contesto originale** e la **Cronologia** esistente da IndexedDB.
2.  **Aggiornamento Cronologia:**
    -   La nuova query (`e cosa è l'IA generativa?`) viene aggiunta in fondo alla cronologia.
3.  **Generazione Nuova Risposta:**
    -   Il sistema invia un nuovo prompt all'LLM contenente:
        -   Il **Contesto originale** (quello generato all'Azione 2).
        -   La **Cronologia completa e aggiornata**.
    -   L'LLM usa sia il contesto che la cronologia per formulare una risposta pertinente alla nuova domanda, mantenendo il filo del discorso.

**Output (Stato dell'Applicazione):**
-   La nuova risposta viene mostrata all'utente.
-   La **Cronologia** (`thread`) della Conversazione Attiva viene aggiornata con l'ultimo scambio di messaggi.