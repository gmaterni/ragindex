# Specifiche Tecniche — RagIndex

> **Scopo:** Documento di specifiche per reimplementazione in un progetto con
> architettura, KB e metodo di costruzione contesto differenti.
> Ogni pipeline è isolata concettualmente: possono essere sostituite
> indipendentemente purché rispettino le interfacce definite.
>
> **Nota:** Le sezioni 2 (Pipeline Ingestione) e 3 (Pipeline Retrieval) sono
> superseded dai documenti dedicati `PIPELINE_CREA_KB.md` e
> `PIPELINE_CREA_CONTESTO.md`, che includono i prompt LLM effettivi.

---

## 1. Layout UI (replicabile)

### 1.1 Struttura DOM

```
body
├── #spinner              ← overlay modale (z-index 50000)
├── #spinner-wait         ← overlay attesa (z-index 50001)
├── .menu-h               ← barra orizzontale fissa in alto (4.5vh)
│   ├── #id-menu-btn      ← checkbox hidden per hamburger toggle
│   ├── [for="id-menu-btn"] ← icona ☰/✕ via CSS
│   ├── .head-wrapper     ← contenitore bottoni header
│   │   ├── #btn-help     ← pulsante "?"
│   │   ├── #btn-upload   ← pulsante upload (SVG icon)
│   │   ├── #active-kb-display ← nome KB attiva
│   │   ├── #btn-provider-settings ← pulsante "LLM"
│   │   ├── #active-model-display ← nome modello attivo
│   │   └── #id_log       ← pulsante log
│   ├── #btn-theme-toggle ← toggle tema chiaro/scuro
│   └── .menu-box         ← menu laterale (sliding, 20vw, left:-2000px default)
│       └── ul > li > a   ← voci menu
├── .container            ← area principale (flex column, height: calc(100vh - 4.5vh))
│   ├── .item.item1       ← area output (flex: 1)
│   │   └── .output-wrapper
│   │       └── .text-out ← scrollable, contiene .div-text con messaggi
│   └── .item.item2       ← area input (flex: 0 0 16vh)
│       ├── .input-wrapper
│       │   └── textarea.text-input ← input utente
│       ├── .input-context-actions  ← bottoni a destra input
│       └── .input-actions          ← bottoni azione (continue/start convo)
└── <script> vendor       ← compromise, marked, lunr + stemmer italiano
```

### 1.2 Comportamento menu laterale

Checkbox `#id-menu-btn:checked` + selettore `.menu-btn:checked ~ .menu-box`
sposta il pannello da `left: -2000px` a `left: 0` con transizione 0.3s.

All'apertura, `.container` riceve margine sinistro `@menu-width` (20vw).

### 1.3 LESS — file orchestratore

```
static/less/
├── style.less            ← import 14 moduli + regole globali
├── uadialog.less         ← stili finestre dialog (UaWindowAdm)
├── ualog3.less           ← stili finestra log
├── tooltip.less          ← stili tooltip
└── modules/
    ├── variables.less    ← font, z-index, colori dark/light
    ├── layout_base.less  ← gabbia verticale (.container → .item flex column)
    ├── layout.less       ← .item1 (output), .item2 (input) misure
    ├── components.less   ← menu laterale (.menu-box, .menu-icon hamburger)
    ├── upload.less       ← zona drop file
    ├── tree.less         ← albero provider/modelli
    ├── table.less        ← tabelle dati
    ├── delete.less       ← bottoni delete
    ├── actions.less      ← pulsanti azione input
    ├── spinner.less      ← overlay caricamento
    ├── apikeys.less      ← gestione chiavi API
    ├── help.less         ← pannello help
    ├── app_ui.less       ← stili UI applicativi
    └── themes.less       ← .apply-theme() mixin dark/light con 200+ variabili
```

### 1.4 Variabili LESS chiave

```
@fsize-out: 18px          ← font output
@fsize-inp: 18px          ← font input
@fsans: "Inter", ...      ← font stack
@menu-width: 20vw         ← larghezza menu laterale
@z-spinner: 50000         ← overlay modale
@z-menu-h: 10010          ← barra superiore
```

### 1.5 Messaggi nel thread

Ogni messaggio è un `<div>` con classe `.user`, `.assistant` o `.system`.
Markdown renderizzato da `marked.js` → HTML dentro `.div-text`.

```
.div-text
├── .user       ← margin-left: 12% (stretto a destra)
├── .assistant  ← margin-right: 12% (stretto a sinistra)
└── .system     ← margin: 5% (centrato, corsivo, opaco)
```

---

## 2. Pipeline di Ingestione (KB Construction)

### 2.1 Input

```
Array<{ name: string, text: string }>
```

Dove `name` è il nome file, `text` è il contenuto testuale grezzo già
estratto da TXT/PDF/DOCX/ODT e pulito.

### 2.2 Fase 0 — Segmentazione Gerarchica Parent-Child

Eseguita in un Web Worker per non bloccare la UI.

#### Algoritmo di chunking

```
CONFIG:
  TARGET_PARENT_SIZE = 1000  ← caratteri target per Parent Chunk
  MIN_CHILD_LENGTH   = 15    ← caratteri minimi per Child valido

per ogni documento (docIndex da 0 a N-1):
  sentences = splitSentences(testo)   ← NLP (es. compromise.js)

  parentCorrente = ""
  frasiCorrenti = []

  per ogni frase in sentences:
    se len(parentCorrente) + len(frase) > TARGET_PARENT_SIZE
      E parentCorrente != "":
        finalizzaParent(docIndex, parentCorrente, frasiCorrenti)
        parentCorrente = frase
        frasiCorrenti = [frase]
    altrimenti:
        parentCorrente.concat(frase)
        frasiCorrenti.push(frase)

  // flush finale
  se parentCorrente != "":
    finalizzaParent(docIndex, parentCorrente, frasiCorrenti)
```

#### finalizzaParent

```
pid = "d{docIndex}p{parentIdx}"
parentIdx++

1. Crea Parent Chunk:
   { id: pid, text: currentParentText, source: "doc_{docIndex}" }

2. Per ogni frase in currentParentSentences:
     se len(frase) < MIN_CHILD_LENGTH → skippa
     cid = "{pid}#{childIdx}"
     childIdx++
     meta = estraiMetadati(frase)     ← keywords (nomi+verbi), entities (NER)
     indexEntries.push({
       id: cid,
       body: frase,
       keywords: meta.keywords,
       entities: meta.entities,
     })
```

#### ID compositi

```
Parent ID:  d{doc}p{parent}      es. d0p5
Child ID:   {parent_id}#{child}  es. d0p5#3
```

### 2.3 Fase 1 — Indicizzazione (Lunr BM25)

```
_buildIndex(indexEntries):
  idx = lunr(function() {
    this.use(lunr.it)            ← stemmer italiano
    this.ref("id")               ← campo riferimento = Child ID
    this.field("body")           ← campo ricercabile

    per ogni entry in indexEntries:
      fullText = entry.body + " " + entry.keywords.join(" ") + " " + entry.entities.join(" ")
      this.add({ id: entry.id, body: fullText })
  })

  return JSON.stringify(idx)     ← serializzato per storage
```

### 2.4 Output della pipeline di ingestione

```
{
  chunks: [ ParentChunk ],       ← array di { id, text, source }
  serializedIndex: string,       ← Lunr index serializzato in JSON
  childEntries: [                ← per rebuild incrementale
    {
      docName: string,
      children: [ ChildChunk ],  ← { id, body, keywords, entities }
      docIndex: number
    }
  ]
}
```

### 2.5 Storage persistente (IndexedDB)

| Chiave | Contenuto |
|--------|-----------|
| `ph0_chunks` | `ParentChunk[]` |
| `ph1_index` | `string` (JSON serializzato) |
| `kb_doclist` | `string[]` nomi documenti |
| `kb_childchunks` | `{ [docName]: ChildChunk[] }` |

### 2.6 Costruzione incrementale

Quando si aggiungono nuovi documenti a una KB esistente:
1. Carica `ph0_chunks` esistenti
2. Calcola `nextDocIndex = max(docIndex esistenti) + 1`
3. Chunk solo i nuovi documenti (con `startDocIndex = nextDocIndex`)
4. Concatena parents nuovi a esistenti
5. Ricostruisce **l'intero indice Lunr** da TUTTI i child chunk (esistenti + nuovi)
6. Salva tutto

---

## 3. Pipeline di Retrieval (Context Construction)

### 3.1 Input

```
query: string            ← domanda utente
kbData: {
  index: string,         ← serializedIndex (JSON Lunr)
  chunks: ParentChunk[]  ← array Parent
}
thread: Message[]        ← cronologia conversazione (può essere vuoto)
```

### 3.2 Fase 0 — Distillazione Query (opzionale)

Se è la prima domanda del thread (`thread.length <= 1`), la query viene
distillata in termini di ricerca ottimali via chiamata LLM separata:

```
Payload LLM:
  model: <modello attivo>
  messages: [{
    role: "user",
    content: "# COMPITO\nAgisci come esperto IR. Estrai 5-8 parole chiave
              dalla domanda ottimizzate per BM25.\n# REGOLE\n1. Solo keywords
              separate da spazio.\n2. Non rispondere.\n3. No commenti.\n
              # DOMANDA\n{query}\n# PAROLE CHIAVE:"
  }]
  temperature: 0.1
  max_tokens: 50
```

Se la distillazione fallisce o non è prima domanda, usa `query` originale.

### 3.3 Fase 1 — Ricerca BM25

```
index = lunr.Index.load(JSON.parse(serializedIndex))
searchResults = index.search(searchTerms)
```

### 3.4 Fase 2 — Risoluzione Parent

```
parentId = result.ref.split("#")[0]  ← da Child ID a Parent ID
```

Mapping `Child ID → Parent ID`: ogni Child ha ID `d0p5#3`, lo split su `#`
dà `d0p5` = Parent ID.

De-duplicazione: `Set<usedParentIds>` evita di includere lo stesso Parent
più volte (anche se più Child dello stesso Parent hanno score alto).

### 3.5 Fase 3 — Costruzione contesto

```
MAX_CONTEXT_LENGTH = promptSize * 0.7   ← 70% della window size del modello

contesto = ""
per ogni risultato ordinato per score decrescente:
  parentId = ref.split("#")[0]
  se parentId non in usedParentIds:
    chunk = allChunks.find(c => c.id === parentId)
    snippet = "--- Context: {chunk.id} (Score: {score}) ---\n{chunk.text}\n\n"
    se len(contesto) + len(snippet) <= MAX_CONTEXT_LENGTH:
      contesto += snippet
    altrimenti: break
```

#### Calcolo promptSize

```
windowSize = modelData.windowSize         ← in kilotoken (dal file .txt modelli)
BYTES_PER_TOKEN = 3
PROMPT_OVERHEAD = 0.1                     ← 10% overhead
promptSizeByte = windowSize * 1024 * BYTES_PER_TOKEN * (1 + PROMPT_OVERHEAD)
```

### 3.6 Output della pipeline di retrieval

```
contesto: string   ← contesto formattato, vuoto se nessuna KB o non prima domanda
```

### 3.7 Generazione risposta LLM

La generazione non fa parte della pipeline di retrieval, ma la usa:

```
systemMessage = buildRagSystemMessage(contesto)   ← se contesto non vuoto
              = buildNoContextSystemMessage()      ← se contesto vuoto

messages = [
  { role: "system", content: systemMessage },
  ...history.slice(0, -1),                        ← cronologia senza ultima domanda
  { role: "user", content: "# Domanda\n{query}" } ← ultima domanda formattata
]

payload = {
  model: <modello attivo>,
  messages: messages,
  temperature: 0.7,
  max_tokens: 4000,
  random_seed: 42
}

response = client.sendRequest(payload, timeout=90)
```

---

## 4. Sistema di Retry

```
MAX_RETRIES = 3
RETRY_DELAY_MS = 5000
RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504]
REQUEST_TIMEOUT_SEC = 90

_sendRequest(client, payload):
  per attempt da 1 a MAX_RETRIES:
    rr = client.sendRequest(payload, REQUEST_TIMEOUT_SEC)
    se rr.ok → return rr
    se rr.error.code in RETRYABLE_STATUS_CODES:
      sleep(RETRY_DELAY_MS) e riprova
    altrimenti: return rr
```

Errori con `code: 499` (interruzione utente) vengono ignorati globalmente
da `window.onunhandledrejection` e non mostrati all'utente.

---

## 5. Gestione Token Limite

Il client base rileva errori 400 con pattern nel body:
```
"token limit" | "token exceeded" | "input too long"
| "context length" | "max tokens"
```

→ traduce in `type: "TokenLimitError"` con messaggio
`"Input troppo lungo - Superato il limite di token"`.

Questi errori NON sono retryable (status 400 non in lista). Vengono propagati
come `ERRORE CRITICO` all'utente via `alert()`.

---

## 6. Interfacce per reimplementazione

### 6.1 Interfaccia KB

```
Interfaccia KB {
  serializedIndex: string    ← indice serializzato (qualsiasi formato)
  chunks: ParentChunk[]      ← array di frammenti di contesto
}

Interfaccia ParentChunk {
  id: string                 ← identificatore univoco
  text: string               ← testo del frammento
  source?: string            ← metadata sorgente
}
```

Il sistema di retrieval chiama solo:
- `index.search(query)` → array di risultati con `{ ref, score }`
- `chunks.find(c => c.id === parentId)` → ParentChunk

### 6.2 Interfaccia Context Builder

```
Input:
  query: string              ← domanda utente
  kbData: {                  ← dati KB
    index: string,
    chunks: ParentChunk[]
  }
  thread?: Message[]         ← cronologia conversazione
  promptSizeBytes?: number   ← limite contesto in bytes

Output:
  context: string            ← contesto formattato
```

### 6.3 Punti di sostituzione

| Blocco | Può essere sostituito con | Condizione |
|--------|--------------------------|------------|
| Chunking (2.2) | Algoritmo diverso (es. sentence-window, semantic chunking) | Output deve produrre `{ parents: ParentChunk[], indexEntries: ChildChunk[] }` |
| NLP (2.2, _processText) | Libreria NLP diversa | Deve estrarre keywords e entities |
| Indicizzazione (2.3) | Vector DB (es. HNSW, FAISS) o indice diverso | Deve supportare `search(query)` → array `{ ref, score }` |
| Distillazione query (3.2) | Chiamata a LLM diverso o skipping | Opzionale |
| Costruzione contesto (3.5) | Reranking, MMR, compressione | Deve rispettare `MAX_CONTEXT_LENGTH` |
| Storage (2.5) | Qualsiasi DB (SQLite, file JSON, API remota) | Deve mantenere le chiavi di riferimento |
| LLM Client (3.7) | Qualsiasi provider LLM | Deve implementare `sendRequest(payload, timeout)` → `{ ok, data, error }` |
| Retry (4) | Strategia diversa (backoff esponenziale, circuit breaker) | Deve preservare 499 come codice di cancellazione |

---

## 7. Sequenza di avvio (init order)

```
wnds.init()                    ← inizializza sistema finestre flottanti
Commands.init()                ← prepara comandi menu
UaLog.setXY(40,6).setZ(111)   ← configura finestra log
AppMgr.initApp()
  ├── LlmProvider.init()
  │   ├── LlmProvider.loadModels()  ← fetch 6 file .txt da data/models/
  │   └── fetchApiKeys()            ← carica chiavi offuscate in IndexedDB
  └── AppMgr.initConfig()
      ├── LlmProvider.loadConfig()  ← ripristina da DB o DEFAULT_CONFIG
      └── LlmProvider.getClient()   ← crea istanza client LLM
          ├── getApiKey(provider)   ← recupera chiave da IndexedDB
          └── _createClientInstance() ← new XXXClient(apiKey)
TextInput.init()/TextOutput.init() ← prepara campi input/output
bindEventListener()                ← collega eventi DOM
showHtmlThread()                   ← carica cronologia da IndexedDB
getTheme()                         ← applica tema persistente
updateActiveKbDisplay()            ← mostra nome KB attiva
UaSender.init({workerUrl, userId}) ← configura telemetria opzionale
```

---

## 8. Provider LLM — Architettura

### 8.1 Provider supportati

```
gemini       → type: "gemini"   (API nativa Google, query string API key)
mistral      → type: "openai"   (API key in Authorization Bearer)
groq         → type: "openai"
openrouter   → type: "openai"
cerebras     → type: "openai"
siliconflow  → type: "openai"
```

### 8.2 Client — BaseClient

```
class BaseClient:
  constructor(apiKey, baseUrl)
  cancelRequest()           → setta AbortController, codice 499
  sendRequest(payload, timeout) → metodo astratto, da override nelle subclassi
  _fetch(url, payload, headers, timeout) → fetch POST con timeout e AbortController
  _handleHttpError(response) → pattern matching su errori 400+
  _handleNetworkError(error) → traduce AbortError/TypeError in errori standard
  _createResult(ok, response, data, error) → formato standardizzato
  _createError(message, type, code, details) → formato standardizzato
```

### 8.3 Configurazione modelli

I modelli per provider sono letti da file `.txt` in `static/data/models/`.
La lista dei provider da caricare proviene da `static/data/models/manifest.json`;
se il manifest manca o è vuoto, si fa fallback a `IMPLEMENTED_CLIENTS` in `key_retriever.js`
(whitelist dei 6 provider con client LLM implementato). `loadModels()` itera su questa lista
e, per ogni provider, tenta il fetch del `.txt`. Solo i provider con file `.txt` valido
(HTTP 200) compaiono nell'albero di selezione — aggiungi/rimuovi un file `.txt` + aggiorna
`manifest.json` e l'albero si aggiorna automaticamente, senza toccare codice.

Formato:
```
gemini-2.5-flash|1048576|10|8.08
          ↑ nome    ↑window  ↑?   ↑?
                    (token)
```

Solo `nome` e `windowSize` (primi due campi) sono usati dall'app.
`windowSize` viene convertito da token a kilotoken: `Math.round(windowSize / 1024)`.

### 8.4 Hot-swap

Quando l'utente aggiunge/cambia una chiave API via UI:
1. `key_retriever.js` salva la nuova chiave in IndexedDB
2. Chiama `LlmProvider.updateClient(provider)` → invalida `_activeClient`
3. Prossima richiesta LLM → `AppMgr.initConfig()` → ricarica tutto (senza cache)

---

## 9. Segnalazione Errori

| Errore | Codice | Comportamento |
|--------|--------|---------------|
| Interruzione utente | 499 | Ignorato globalmente |
| Timeout | 408 | Retry (max 3, delay 5s) |
| Errore server | 500,502,503,504 | Retry (max 3, delay 5s) |
| Token limit | 400 + pattern | `TokenLimitError`, mostrato a utente |
| Chiave mancante | — | Alert con nome provider |
| Rate limit | 429 | Non retryable, mostrato a utente |
