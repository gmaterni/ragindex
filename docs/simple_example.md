# Esempio Pratico: Il Viaggio di un Dato attraverso la Pipeline RAG

Questo documento illustra con un esempio semplice e concreto come un'informazione viaggia attraverso le 4 fasi della nostra applicazione RAG, dalla sua forma grezza nel documento di testo fino a diventare parte del contesto utilizzato per rispondere a una domanda.

---

### Dati di Partenza: Il Documento

Immaginiamo di caricare un singolo documento di testo (`doc1.txt`) con il seguente contenuto:

```txt
L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.
```

---

### Fase 0: Segmentazione (Creazione dei "Chunks")

Il testo viene analizzato e suddiviso in frammenti (chunks). In questo caso, essendo il testo breve, verrà creato un solo chunk. Questo chunk non è solo testo, ma un oggetto strutturato con metadati utili per la ricerca.

**Output (Dato Temporaneo): Oggetto Chunk**
*Questo oggetto viene salvato in **IndexedDB** (`phase0_chunks`)*

```json
[
  {
    "id": "doc0-chunk0",
    "text": "L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.",
    "keywords": ["intelligenza", "artificiale", "generativa", "branca", "ia", "creare", "contenuti", "testi", "immagini", "roberto", "busa", "pioniere", "uso", "computer", "analisi", "testuale"],
    "entities": ["roberto busa"]
  }
]
```

---

### Fase 1: Indicizzazione

L'array di chunk viene utilizzato per costruire un indice di ricerca lessicale (con `lunr.js`). Concettualmente, l'indice è una mappa che collega le parole chiave ai chunk in cui appaiono.

**Output (Dato Temporaneo): Indice Serializzato**
*Questo indice viene salvato in **IndexedDB** (`phase1_index`)*

**Rappresentazione Concettuale dell'Indice:**
```
- "roberto"   -> [doc0-chunk0]
- "busa"      -> [doc0-chunk0]
- "pioniere"  -> [doc0-chunk0]
- "computer"  -> [doc0-chunk0]
- ... e così via per tutte le parole chiave
```

---

### Fase 2: Ricerca

Ora, l'utente inserisce una domanda (query) per cercare informazioni nei documenti.

**Input Utente (Query):**
```
chi era Roberto Busa?
```

Il motore di ricerca (`lunr.js`) usa l'indice creato nella Fase 1 per trovare i chunk più pertinenti alla query.

**Output (Dato Temporaneo): Risultati della Ricerca**
*Questo array viene salvato in **IndexedDB** (`phase2_context`)*

```json
[
  {
    "ref": "doc0-chunk0",
    "score": 0.98,
    "matchData": {
      "metadata": {
        "chi": { "body": {} },
        "era": { "body": {} },
        "roberto": { "body": {} },
        "busa": { "body": {} }
      }
    }
  }
]
```
Il risultato ci dice che il chunk `doc0-chunk0` è estremamente pertinente (`score: 0.98`) alla nostra domanda.

---

### Fase 3: Generazione (Costruzione del Contesto Finale)

Questa è la fase cruciale in cui tutto viene assemblato.

1.  Il sistema prende i risultati della ricerca dalla Fase 2 (l'array JSON qui sopra).
2.  Per ogni risultato, usa il `ref` (`doc0-chunk0`) per recuperare il testo completo del chunk originale (quello creato nella Fase 0).
3.  Assembla questi testi in un'unica stringa, formattata in modo leggibile.

**Output (Dato Temporaneo): La Stringa di Contesto**
*Questa stringa viene costruita in memoria e non viene salvata. È l'input per il prompt.*

```txt
--- Chunk: doc0-chunk0, Score: 0.9800 ---
L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.
```

#### L'Obiettivo Finale: Il Prompt per l'LLM

Infine, questa stringa di contesto viene inserita in un template di prompt, insieme alla domanda originale dell'utente, per creare il messaggio finale da inviare all'LLM.

```
Basandoti esclusivamente sul seguente contesto, rispondi alla domanda dell'utente.

[INIZIO CONTESTO]

--- Chunk: doc0-chunk0, Score: 0.9800 ---
L'intelligenza artificiale generativa è una branca dell'IA. Permette di creare nuovi contenuti, come testi e immagini. Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale.

[FINE CONTESTO]

Domanda dell'utente:
chi era Roberto Busa?
```

Questo è il testo esatto che l'LLM riceve, e dal quale genererà la risposta: "Basandosi sul contesto, Roberto Busa è stato un pioniere nell'uso dei computer per l'analisi testuale."
