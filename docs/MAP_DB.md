# Mappa dei Dati — IndexedDB e localStorage

Database: **RagIndexDB_`<userId>`** — istanza Dexie.js creata all'avvio.
Nome dinamico: `RagIndexDB_` + `WebId.get()`.

### WebId.get() — risoluzione userId

```
Ambiente locale con DISABLE_LOGIN_ON_LOCAL=true:
  → "user_local" (statico, da config.js)

Login Google effettuato (localStorage["user_web_id"] presente):
  → email utente (es. "mario.rossi@gmail.com")

Né locale né login (guest):
  → "ragindex_guest_<timestamp>"
```

**Due tabelle Dexie**: `kvStore` e `settings`.

---

## Tabella `kvStore` — chiave → valore JSON

| Chiave | Struttura | Descrizione | Ciclo di vita |
|--------|-----------|-------------|---------------|
| `ph0_chunks` | `Array<Chunk>` | Chunk della KB attiva. Ogni chunk: `{id, body, keywords?, entities?}` | Creato da Action 1 (Crea KB). Rimpiazzato a ogni rebuild della KB attiva. Cancellato su delete della KB o reset |
| `ph1_index` | `serializedIndex` (stringa JSON) | Indice Lunr BM25 serializzato della KB attiva | Stesso ciclo di `ph0_chunks` |
| `kb_doclist` | `Array<string>` | Nomi dei documenti processati nella KB attiva | Stesso ciclo |
| `kb_childchunks` | `Object<docName, Array<ChildChunk>>` | Child chunk per rebuild incrementale della KB attiva | Stesso ciclo |
| `ph2_context` | `string` | Contesto testuale selezionato per la conversazione attiva | Creato da Action 2 (Inizia Conversazione). Rimpiazzato a ogni nuova ricerca contesto. Cancellato da "Cancella Contesto" |
| `thread` | `Array<Message>` | Array messaggi della conversazione attiva. Ogni messaggio: `{role, content, timestamp?}` | Creato da Action 2. Accresciuto da Action 3 (Continua). Cancellato da "Cancella Conversazione" o "Cancella Contesto" |
| `rag_kb_<sanitizedName>` | `{chunks, serializedIndex}` | KB archiviata. `<sanitizedName>` = nome sanitizzato con `REGEX_NAME_CLEANER` | Creata da menu "Archivia KB". Rimossa da "Cancella KB". Pù KB possono coesistere |
| `rag_convo_<sanitizedName>` | `{context?, thread}` | Conversazione archiviata con contesto opzionale | Creata da menu "Archivia Conversazione". Rimossa dalla gestione conversazioni |
| `idoc_<docName>` | `string` | Contenuto testuale raw di un documento caricato. `<docName>` = nome file originale | Creato all'upload. Rimosso da "Elimina Documento" o menu "Gestisci Documenti" |

**Nota**: ph0_chunks, ph1_index, kb_doclist, kb_childchunks appartengono tutte alla **stessa KB attiva**. Il nome della KB attiva è in `settings:active_kb`.

---

## Tabella `settings` — chiave → valore stringa (JSON)

| Chiave | Struttura | Descrizione | Dove si scrive |
|--------|-----------|-------------|----------------|
| `theme` | `"dark"` \| `"light"` | Tema UI persistente | `app_ui.js:374` |
| `active_kb` | `string` | Nome sanitizzato della KB attualmente selezionata | `app_ui.js:442,509` |
| `llm_provider` | `{provider, model, ...}` | Configurazione provider LLM attivo | `llm_provider.js:loadConfig(), saveConfig()` |
| `api_keys` | `Object<provider, string>` | Mappa provider → chiave API. **Solo offuscate, non cifrate** | `key_retriever.js:211,308` |
| `docs` | `Array<DocDescriptor>` | Elenco documenti caricati. Ogni entry: `{name, size?, type?, date?}` | `docs_mgr.js:36,74,87` |
| `knbase_build_state` | `{status, docNames, currentDocIndex, currentChunkIndex}` | Stato della costruzione KB incrementale | `build_state_mgr.js:16,27` |
| `knbase_chunks_<docName>` | `Array<Chunk>` | Chunk risultati intermedi per un documento (temp build) | `build_state_mgr.js:46` |
| `knbase_doc_kb_<docName>` | `string` | KB parziale serializzata per un documento (temp build) | `build_state_mgr.js:57` |

**Nota**: `knbase_chunks_*` e `knbase_doc_kb_*` sono temporanee durante la build incrementale. Vengono cancellate da `BuildStateMgr.clearState()` insieme a `knbase_build_state`.

---

## localStorage

| Chiave | Valore | Origine | Note |
|--------|--------|---------|------|
| `user_web_id` | email utente | `login.html:43` — salvata dopo OAuth Google. Letta da `webuser_id.js:20` per costruire il nome del DB IndexedDB | In ambiente locale (`DISABLE_LOGIN_ON_LOCAL=true`) non viene mai scritta. `WebId.get()` restituisce direttamente `"user_local"`. Rimossa da `WebId.clear()` (logout) |
| *(less.js)* chiavi `<url>`, `<url>:timestamp`, `<url>:vars` | CSS compilato + metadati | `static/less/less.js` (locale, v4.2.1) | Cache automatica del compilatore LESS lato client. Non controllata dall'applicazione |

**`localStorage.clear()`** chiamato solo da `app_ui.js:613` (funzione `deleteAll()` / reset totale app).

---

## Relazioni tra i dati

```
docs (settings)
  ├── idoc_<name> (kvStore)        — contenuto raw per ogni documento

active_kb (settings)
  ├── ph0_chunks (kvStore)          — chunk KB attiva
  ├── ph1_index (kvStore)           — indice KB attiva
  ├── kb_doclist (kvStore)          — doc list KB attiva
  ├── kb_childchunks (kvStore)      — child chunk per rebuild incrementale
  └── thread (kvStore)              — conversazione attiva (usata insieme)

rag_kb_<name> (kvStore)            — backup/archiviazione di {ph0_chunks + ph1_index}
rag_convo_<name> (kvStore)        — backup/archiviazione di {context? + thread}

knbase_build_state (settings)      — stato build incrementale
  ├── knbase_chunks_<doc> (settings)   — chunk intermedi
  └── knbase_doc_kb_<doc> (settings)   — KB parziali
```

---

## Layer di accesso

```
┌─────────────────────────┐
│     App Code (ui, etc)  │
├─────────┬───────────────┤
│ kvStore │   settings    │
├─────────┴───────────────┤
│      DataRepository     │  — astrazione unificata (data_repository.js)
├─────────┬───────────────┤
│ idbMgr  │    UaDb       │  — API CRUD dirette su Dexie (idb_mgr.js / uadb.js)
├─────────┴───────────────┤
│       Dexie.js          │  — wrapper IndexedDB
├─────────────────────────┤
│       IndexedDB         │
└─────────────────────────┘
```

`DataRepository` è il layer consigliato per nuove operazioni (`saveDoc`, `getDoc`, `saveSetting`, `getSetting`).
Il codice legacy usa `idbMgr` e `UaDb` direttamente.

---

## Note operative

- **Backup/ripristino**: `backup_mgr.js` esporta/importa `rag_kb_*` (formato `{chunks, serializedIndex}`) e `rag_convo_*` (formato `{context?, thread}`) via file JSON.
- **Build incrementale KB**: usa `knbase_build_state` + `knbase_chunks_*` + `knbase_doc_kb_*` in `settings`. Se interrotta, i dati temporanei rimangono fino a `clearState()`.
- **Isolamento utenti**: ogni utente ha un database Dexie separato (`RagIndexDB_<userId>`), isolato per progettazione.
- **Nessuna migrazione**: schema Dexie a versione 2 con tabelle `kvStore` e `settings`. Non ci sono migrazioni attive nello schema.
