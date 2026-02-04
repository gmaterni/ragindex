# Architettura Storage (Dexie.js)

Questo documento descrive lo standard di archiviazione dati di RagIndex basato su **Dexie.js**, che ha sostituito la gestione mista tra `localStorage` e `idb-keyval`.
L'intera applicazione è **asincrona** e gestisce grandi quantità di dati senza bloccare il thread principale.

## 1. Stato della Migrazione
✅ **Completata**. Tutte le componenti (static2 ed extension) utilizzano Dexie.js per la persistenza.

## 2. Schema Database (RagIndexDB)
Il database IndexedDB è gestito in `js/services/idb_mgr.js` con lo schema seguente:

*   **`kvStore`**: Tabella per dati voluminosi. Chiave primaria: `id`.
    *   `PHASE0_CHUNKS`: Frammenti di testo (Parent).
    *   `PHASE1_INDEX`: Indice Lunr.js serializzato.
    *   `PHASE2_CONTEXT`: Ultimo contesto estratto.
    *   `KEY_THREAD`: Cronologia dei messaggi della conversazione attuale.
    *   `kb_*`: Knowledge Base archiviate.
    *   `convo_*`: Conversazioni archiviate.
*   **`settings`**: Tabella per configurazioni e preferenze. Chiave primaria: `id`.
    *   `api_keys`: Chiavi API crittografate/salvate.
    *   `theme`: Preferenza tema (light/dark).
    *   `active_kb_name`: Nome della KB attualmente caricata.
    *   `doc_*`: Contenuto dei singoli documenti caricati.

## 3. Componenti Chiave

### `idb_mgr.js` (Core)
Gestisce l'accesso diretto a IndexedDB. Fornisce metodi asincroni come `create`, `read`, `delete`, `selectKeys` e `clearAll`.

### `uadb.js` (Settings Wrapper)
Interfaccia semplificata per la tabella `settings`. Sostituisce l'uso di `localStorage`.
**Nota:** Ogni chiamata a `UaDb.read()` o `UaDb.save()` deve essere preceduta da `await`.

### `docs_mgr.js` (Documents)
Gestisce la persistenza dei documenti caricati dall'utente all'interno della tabella `settings`, utilizzando prefissi dedicati.

## 4. Best Practices
1.  **Sempre Async:** Non utilizzare mai storage sincrono nel thread principale.
2.  **Transazioni:** Dexie gestisce le transazioni automaticamente, ma per operazioni massive preferire l'uso del worker.
3.  **Pulizia Totale:** Il metodo `idbMgr.clearAll()` garantisce la rimozione di ogni dato sensibile o residuo di sessioni precedenti svuotando tutte le tabelle.
