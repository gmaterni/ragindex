# Specifiche Tecniche Agnostiche: Architettura RAG Ottimizzata

Questo documento descrive le specifiche logiche e algoritmiche per un sistema RAG (Retrieval-Augmented Generation) avanzato. Le specifiche sono neutre rispetto al linguaggio di programmazione e progettate per essere implementabili anche in ambienti con risorse limitate (es. Browser/Client-Side only).

---

## 1. Strategia di Segmentazione (Chunking Gerarchico)

Per migliorare la qualità delle risposte dell'LLM, è fondamentale separare l'unità di **Ricerca** dall'unità di **Contesto**.

### 1.1 Concetto: Parent-Child Chunking
*   **Child Chunk (Unità di Ricerca):** Piccoli segmenti (es. singole frasi o gruppi di 2-3 frasi). Ottimizzati per match precisi di keyword o similitudine semantica.
*   **Parent Chunk (Unità di Contesto):** Blocchi logici più grandi (es. paragrafi completi, 1000-1500 caratteri) che contengono i Child. Questo è il testo che verrà effettivamente passato all'LLM.

### 1.2 Algoritmo di Segmentazione
1.  **Pulizia Preliminare**: Normalizzazione spazi, rimozione caratteri non stampabili, unificazione newline.
2.  **Sentence Splitting**: Divisione del testo in frasi (usando punteggiatura o librerie NLP leggere).
3.  **Raggruppamento (Sliding Window o Logico)**:
    *   Accumulare frasi finché la lunghezza totale < `TARGET_SIZE` (es. 1000 char).
    *   Se l'aggiunta di una frase supera il `MAX_LIMIT` (es. 2000 char), forzare la chiusura del blocco (Parent).
    *   *Opzionale:* Overlap (sovrapposizione) di 1-2 frasi tra Parent adiacenti per non perdere contesto ai bordi.
4.  **Output Strutturato**: Ogni Parent deve avere un ID univoco e contenere la lista dei suoi Child (con testo e ID).

---

## 2. Struttura Dati dell'Indice (Ottimizzazione Client-Side)

Per un'applicazione lato client, l'indice deve essere leggero (basso footprint di memoria) e veloce da interrogare senza database complessi.

### 2.1 Schema Dati (JSON)
L'indice può essere rappresentato come un singolo oggetto JSON (o più file sharded se >10MB).

```json
{
  "metadata": {
    "version": "1.0",
    "total_docs": 15,
    "total_chunks": 450
  },
  "parents": {
    "P_001": { "text": "Testo completo del paragrafo...", "source": "doc1.pdf" },
    "P_002": { "text": "Altro paragrafo...", "source": "doc1.pdf" }
  },
  "index": {
    // Inverted Index semplificato per Keyword Search (BM25/TF-IDF)
    "termin": { "P_001": 2, "P_005": 1 }, // token -> { parent_id: frequency }
    "tecnic": { "P_002": 4 }
  },
  "vectors": {
    // Opzionale: Se si usa embedding locale (es. Transformers.js)
    "P_001": [0.12, -0.05, ...],
    "P_002": [...]
  }
}
```

### 2.2 Strategia di Indicizzazione (Hybrid Search)
Per massimizzare la precisione senza un backend pesante:
1.  **Keyword Index (BM25)**: Creare un indice invertito (Token -> Lista ID Chunk) sui *Child Chunks*. Questo garantisce che se l'utente cerca una parola specifica, il sistema la trovi.
2.  **Semantic Index (Opzionale)**: Se il client supporta WASM/WebGPU, calcolare embedding per i *Child Chunks*.

---

## 3. Algoritmo di Retrieval (Fase di Ricerca)

L'obiettivo è trovare i `k` Parent Chunks più rilevanti per la query dell'utente.

### 3.1 Pre-processing Query
1.  **Normalizzazione**: Lowercase, rimozione stop-words (di, a, da, in...), stemming leggero (tagliare desinenze).
2.  **Espansione (Opzionale)**: Se possibile, usare l'LLM per generare 2-3 varianti della query (HyDE - Hypothetical Document Embeddings) per aumentare la recall.

### 3.2 Scoring e Ranking
1.  **Fase 1: Ricerca (Scoring)**
    *   Per ogni token della query, recuperare i Child Chunks dall'indice invertito.
    *   Calcolare un punteggio (score) per ogni Child (es. BM25 o semplice frequenza).
    *   *Nota*: Se si usa vettoriale, calcolare Cosine Similarity.
2.  **Fase 2: Aggregazione al Parent**
    *   Mappare ogni Child trovato al suo Parent ID.
    *   Lo score del Parent è la somma (o il max) degli score dei suoi Child.
    *   *Bonus*: Dare un boost ai Parent che hanno più Child distinti matchati.
3.  **Fase 3: Reranking (Refinement)**
    *   Ordinare i Parent per score decrescente.
    *   Prendere i Top-N (es. 20).
    *   (Opzionale) Usare una logica di "Cross-Encoder" leggera o euristica (es. densità di keyword) per riordinare questi 20.

### 3.3 Costruzione del Contesto
1.  Selezionare i Top-K Parent (es. 5) finali.
2.  Concatenare il testo dei Parent (`parents[id].text`).
3.  Aggiungere metadati (nome file sorgente) per permettere all'LLM di citare le fonti.
4.  Questo testo concatenato è il **Context** da inviare al Prompt dell'LLM.

---

## 4. Ottimizzazioni Specifiche Lato Client

1.  **Web Workers**: Eseguire l'indicizzazione e la ricerca in un Web Worker per non bloccare la UI principale.
2.  **Compression**: Usare formati compressi (es. `msgpack` o `gzip` su JSON) per salvare/caricare l'indice da LocalStorage/IndexedDB.
3.  **Lazy Loading**: Se l'indice è grande, caricare in memoria solo il dizionario dei termini e caricare il testo completo dei Parent solo al momento della costruzione del contesto.
