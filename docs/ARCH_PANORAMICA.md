# Documentazione Architetturale e Flusso Dati di RagIndex

Questo documento illustra la logica di funzionamento di RagIndex "sotto il cofano". Descrive il processo RAG (Retrieval-Augmented Generation) e le trasformazioni che i dati subiscono, dal documento originale fino alla risposta dell'AI.

## Fasi del Processo RAG

### 1. Ingestione e Pulizia
Trasformazione di file eterogenei (TXT, PDF, HTML) in testo puro normalizzato. Il sistema applica filtri per rimuovere tag HTML, link e normalizzare i caratteri Unicode, garantendo una base testuale pulita per le fasi successive.

### 2. Segmentazione Gerarchica (Parent-Child)
Questa è l'innovazione principale di RagIndex. Invece di dividere il testo in blocchi uniformi, il sistema utilizza una struttura a due livelli:
*   **Parent Chunk**: Blocchi di circa 1000 caratteri (paragrafi). Rappresentano l'unità di **CONTESTO** che viene inviata all'LLM.
*   **Child Chunk**: Singole frasi estratte dal Parent. Rappresentano l'unità di **RICERCA** indicizzata.

**Perché?**: Cerchiamo frasi specifiche (Child) per la massima precisione nel recupero, ma forniamo all'AI l'intero paragrafo circostante (Parent) per permetterle di comprendere appieno il significato.

### 3. Indicizzazione (Indexing)
Viene utilizzato **Lunr.js** all'interno di un Web Worker. Solo i *Child Chunks* vengono indicizzati. L'indice e i frammenti vengono salvati in modo persistente utilizzando **Dexie.js** (IndexedDB). L'indice non salva il testo completo ma crea una mappa invertita dei termini, permettendo ricerche istantanee basate su rilevanza BM25.

### 4. Recupero (Retrieval)
Quando l'utente pone una domanda:
1.  Il sistema interroga l'indice Lunr usando la query dell'utente.
2.  Lunr restituisce gli ID dei *Child Chunks* più pertinenti.
3.  Il sistema risale agli ID dei relativi *Parent Chunks* leggendoli dal database Dexie.
4.  Viene assemblato il testo dei paragrafi completi, eliminando i duplicati, per formare il contesto finale.

### 5. Generazione (Generation)
Il sistema costruisce un "System Message" che include:
*   **Ruolo**: Istruzioni per agire come assistente esperto.
*   **Contesto**: I paragrafi recuperati nella Fase 4.
*   **Regole**: Obbligo di dare priorità al contesto fornito rispetto alla conoscenza pregressa.

L'LLM riceve questo pacchetto e formula la risposta finale. L'interfaccia utente, gestita tramite **VanJS**, aggiorna in modo reattivo lo stato della conversazione e le informazioni sulla Knowledge Base attiva.

---
*Nota: Questa architettura (standardizzata nella versione **static2**) garantisce che l'intelligenza artificiale abbia sempre accesso alle informazioni più pertinenti presenti nei tuoi documenti locali senza mai violare la tua privacy.*
