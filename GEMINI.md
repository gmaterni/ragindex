# RagIndex: Context & Instructions (Stato Finale)

Progetto **RagIndex**, un'applicazione web per la Generazione Aumentata da Recupero (RAG) **100% client-side**. Tutta la logica di elaborazione dati avviene nel browser dell'utente.

## Architettura e Tecnologie
- **UI**: VanJS (Framework reattivo ultra-leggero) in `static/js/app_ui.js`.
- **Database Locale**: Dexie.js (IndexedDB) per la persistenza di documenti e indici.
- **Motore RAG**: Lunr.js per la ricerca lessicale (BM25), eseguito in un Web Worker (`static/js/rag_worker.js`).
- **Pulizia Testo**: Logica verificata in `static/js/services/text_cleaner.js` (gestione spazi, link, tag e abbreviazioni).
- **Client LLM**: Integrazione diretta via REST API per Gemini, Mistral e OpenRouter.

## Struttura delle Directory
- `/static`: Contiene l'applicazione web completa, verificata e conforme alle `docs/BEST_PRACTICES_JS.md`.
- `/static/tests`: Suite di test unitari per la logica di business (`test_text_cleaner.js`).
- `/docs`: Documentazione tecnica sull'architettura e la pipeline RAG.
- `/data_src`: Esempi di documenti per la Knowledge Base.
- `/bin`: Script minimi per la build (`comprjs.sh`, `comprcss.sh`), il deployment (`surge_update.sh`) e la validazione dei dati (`validate_kb.sh`).

## Validazione e Test
Il progetto include una suite di test eseguibile in due modi:
1. **Browser**: Apri `static/tests/index.html`.
2. **Terminale (Node.js)**: 
   ```bash
   echo '{"type": "module"}' > static/package.json && node -e "import('./static/tests/test_text_cleaner.js').then(m => m.runAllTests())" && rm static/package.json
   ```

## Note di Sviluppo
- **Best Practices**: Ogni `return` deve restituire una variabile nominata. Usare sempre `async/await` e funzioni arrow.
- **Sicurezza**: Nessun token o chiave API deve essere salvato nel codice; vengono memorizzati esclusivamente nell'IndexedDB locale dell'utente.
