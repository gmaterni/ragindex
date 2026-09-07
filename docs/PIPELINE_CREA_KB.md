# Pipeline di Creazione Knowledge Base

> **Input:** Documenti caricati dall'utente (PDF, DOCX, TXT, ODT)
> **Output:** Indice Lunr BM25 + Parent Chunks salvati in IndexedDB
> **Esecuzione:** Web Worker (`rag_worker.js`) per non bloccare la UI

---

## Panoramica

La pipeline trasforma documenti grezzi in una Knowledge Base ricercabile. L'utente carica i file → vengono estratti e puliti → inviati a un Web Worker per chunking e indicizzazione → salvati in IndexedDB.

```
Upload → Pulizia → Worker (chunking + indicizzazione) → IndexedDB
```

---

## Fase 0 — Upload ed Estrazione Testo

Eseguita da `uploader.js` nel thread principale. Ogni formato ha un estrattore specifico:

| Formato | Estrattore | Libreria |
|---------|-----------|----------|
| TXT | Lettura diretta | — |
| PDF | `pdf.min.js` | Caricato dinamicamente |
| DOCX | `mammoth.browser.min.js` | Caricato dinamicamente |
| ODT | `jszip.min.js` + XML parser | Caricato dinamicamente |

Il testo estratto viene passato a `cleanDoc()` (`text_cleaner.js`) che applica in sequenza:

1. **Rimozione tag speciali**: `<<<`, `>>>`, `<<`, `>>`, `#`
2. **Rimozione link e URL**: pattern `https?://`, `file:///`, markdown link `[text](url)`, tag `<a>`
3. **Pulizia approfondita**:
   - Rimozione backtick
   - Riunione parole divise da line break (`word-\n`)
   - Rimozione caratteri non stampabili (`\u00AD`, `\u200B`, `\uFEFF`, ecc.)
   - Normalizzazione spazi e tab
   - Gestione escape sequenze e unicode
   - Rimozione path Windows (backslash)
   - Normalizzazione virgolette e apostrofi
   - Rimozione spazi prima di punteggiatura
   - Normalizzazione Unicode NFC
4. **Divisione in linee**: split su punteggiatura forte (`.!?`) seguita da spazio + maiuscola, con lista di abbreviazioni escluse

Il testo pulito viene salvato in IndexedDB con chiave `idoc_<nomeFile>` tramite `DocsMgr.add()`.

---

## Fase 1 — Invio al Web Worker

Eseguita da `app_ui.js` → `TextInput.createKnowledgeAsync()`.

**Trigger:** Pulsante Action 1 o menu "Crea Knowledge Base".

**Workflow:**

```
DocsMgr.getAll()  →  [{name, text}, ...]
         │
         ▼
Filtra documenti vuoti
         │
         ▼
Verifica KB esistente via DATA_KEYS.KB_DOCLIST
         │
         ├── Nessuna KB esistente → FULL REBUILD
         │     ragEngine.createKnowledgeBase(validDocs)
         │     │
         │     ▼
         │   Worker → _createKnowledgeBase(documents)
         │
         └── KB esistente → INCREMENTALE
               ragEngine.chunkDocumentsAsync(newDocs, nextDocIndex)
               │
               ▼
             Worker → _chunkDocuments(documents, startDocIndex)
               │
               ▼
             Ricostruzione indice Lunr nel thread principale
               via _rebuildLunrIndex(allIndexEntries)
```

### Full Rebuild

Chiamata `ragEngine.createKnowledgeBase(documenti)` che invia comando `"createKnowledgeBase"` al Web Worker. Il worker esegue chunking + indicizzazione e restituisce: `{chunks, serializedIndex, childEntries}`.

### Build Incrementale

Se la KB esiste già e ci sono nuovi documenti:
1. Carica `ph0_chunks` (parent chunk esistenti)
2. Calcola `nextDocIndex = max(docIndex da chunk esistenti) + 1`
3. Invia i soli nuovi documenti al worker comando `"chunkDocuments"` → riceve `{parents, childEntries}`
4. Unisce nuovi parent chunk a quelli esistenti
5. Ricostruisce **l'intero indice Lunr** da tutti i child chunk (vecchi + nuovi)
6. Salva tutto

---

## Fase 2 — Segmentazione Parent-Child

Eseguita da `rag_worker.js` → `_chunkDocument(text, docIndex)`.

Usa `compromise.js` per dividere il testo in frasi (NLP lato client).

### Configurazione

| Parametro | Default | Ruolo |
|-----------|---------|-------|
| `TARGET_PARENT_SIZE` | 1000 caratteri | Soglia dimensione Parent Chunk |
| `MIN_CHILD_LENGTH` | 15 caratteri | Lunghezza minima per includere un Child |

### Algoritmo

```
per ogni documento (docIndex = 0..N-1):
  frasi = nlp(testo).sentences()    ← compromise.js

  parentCorrente = ""
  frasiCorrenti = []

  per ogni frase in frasi:
    se len(parentCorrente) + len(frase) > TARGET_PARENT_SIZE
      E parentCorrente non vuota:
        finalizzaParent(docIndex, parentCorrente, frasiCorrenti)
        parentCorrente = frase
        frasiCorrenti = [frase]
    altrimenti:
      parentCorrente += " " + frase
      frasiCorrenti.push(frase)

  se parentCorrente non vuota:
    finalizzaParent(docIndex, parentCorrente, frasiCorrenti)  ← flush finale
```

### finalizzaParent()

```
pid = "d{docIndex}p{parentIdx++}"

1. Parent Chunk:
   { id: pid, text: testoCompleto, source: "doc_{docIndex}" }

2. Per ogni frase in frasi correnti:
     se len(frase) < 15 → skippa
     cid = "{pid}#{childIdx++}"
     meta = estraiMetadati(frase)
     indexEntries.push({ id: cid, body: frase, keywords, entities })
```

### ID Compositi

```
Parent ID:  d{doc}p{parent}      es. d0p5
Child ID:   {parent_id}#{child}  es. d0p5#3
```

---

## Fase 3 — Estrazione Metadati

Eseguita da `rag_worker.js` → `_processText(text)`.

Usa `compromise.js` per analisi NLP su ogni Child Chunk:

| Metadato | Fonte | Elaborazione |
|----------|-------|-------------|
| **Keywords** | `nouns()` + `verbs()` | lowercase, deduplicati, lunghezza ≥ 3 |
| **Entities** | `people()` + `places()` + `organizations()` | lowercase, deduplicati |

Keywords ed entities vengono concatenate al corpo del Child durante l'indicizzazione per migliorare la ricercabilità.

---

## Fase 4 — Indicizzazione Lunr BM25

Eseguita da `rag_worker.js` → `_buildIndex(indexEntries)`.

Configurazione Lunr:

```
lunr(function() {
  this.use(lunr.it)                     ← stemmer italiano
  this.ref("id")                        ← campo riferimento (Child ID)
  this.field("body")                    ← campo ricercabile

  per ogni entry:
    fullText = entry.body + " " + entry.keywords.join(" ") + " " + entry.entities.join(" ")
    this.add({ id: entry.id, body: fullText })
})
```

L'indice viene serializzato in JSON (`JSON.stringify(idx)`) per storage.

---

## Fase 5 — Persistenza su IndexedDB

Tabella `kvStore` del database `RagIndexDB_<userId>`:

| Chiave | Contenuto | Creato da |
|--------|-----------|-----------|
| `ph0_chunks` | `ParentChunk[]` — array di `{id, text, source}` | Full rebuild |
| `ph1_index` | `string` — indice Lunr serializzato (JSON) | Full rebuild |
| `kb_doclist` | `string[]` — nomi documenti processati | Full rebuild |
| `kb_childchunks` | `Object<docName, ChildChunk[]>` — per rebuild incrementali | Full rebuild / Incrementale |

---

## Prompt Utilizzati

**Nessun prompt LLM** — la pipeline di creazione KB è interamente locale:
- NLP con `compromise.js` per segmentazione frasi ed estrazione metadati
- Indicizzazione con `lunr.js` (BM25)
- Zero chiamate a provider LLM

---

## Parametri Configurabili

| Parametro | File | Default | Descrizione |
|-----------|------|---------|-------------|
| `TARGET_PARENT_SIZE` | `rag_worker.js:33` | 1000 | Caratteri target per Parent Chunk |
| `MIN_CHILD_LENGTH` | `rag_worker.js:34` | 15 | Caratteri minimi per includere Child |
