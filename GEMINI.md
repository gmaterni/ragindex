# RagIndex - Project Overview

RagIndex is a 100% client-side Retrieval-Augmented Generation (RAG) application. It allows users to index documents and perform queries against them using various LLM providers (Gemini, Groq, Mistral), all within the browser's environment to ensure privacy.

## Main Technologies
- **Frontend:** Vanilla JS with [VanJS](https://vanjs.org/) for reactive UI components and [Dexie.js](https://dexie.org/) for IndexedDB management.
- **Styling:** LESS (compiled in-browser using `less.js`).
- **RAG Engine:**
    - **Search Index:** [Lunr.js](https://lunrjs.com/) for lexical search.
    - **Processing:** Web Workers for chunking and indexing to avoid blocking the main thread.
    - **Natural Language:** [compromise.js](https://github.com/spencermountain/compromise) for basic NLP tasks.
- **API Clients:** Custom clients for Gemini, Groq, and Mistral located in `static/js/llmclient/`.

## Architecture
- **Presentation Layer:** `static/index.html` and LESS files in `static/less/`.
- **Controller Layer:** `static/js/app.js` and `static/js/app_ui.js`.
- **RAG Orchestrator:** `static/js/rag_engine.js`.
- **Background Worker:** `static/js/rag_worker.js`.
- **Services:** Modular services for database (`uadb.js`), logging (`ualog3.js`), and API key management (`key_retriever.js`).

## Building and Running
The project is a static web application and does not require a build step.
- **To run:** Use any static web server (e.g., `python3 -m http.server` or VS Code Live Server) in the project root.
- **Access:** Navigate to `http://localhost:PORT/index.html` (which links to the static version) or directly to `static/index.html`.
- **Styles:** Edits to `.less` files are reflected on page reload as they are compiled in-browser.

## Development Conventions
- **ES Modules:** The project uses native ES modules (`import`/`export`).
- **State Management:** Reactive state is managed using VanJS (`van.state`).
- **Database:** Persistent storage for documents, knowledge bases, and configurations is handled via IndexedDB (abstracted by `UaDb` using Dexie).
- **API Keys:** Keys are managed via `key_retriever.js`. They can be pre-loaded from `static/data/api_keys.json` but are primarily stored and managed in IndexedDB. The system supports multiple keys per provider with an "Active" selection mechanism.

## Key Files
- `static/index.html`: Main entry point for the application.
- `static/js/app.js`: Main application initialization logic.
- `static/js/services/key_retriever.js`: Centralized manager for multi-provider API keys (UI and Logic).
- `static/data/api_keys.json`: Optional seed file for default API keys.
- `static/js/rag_engine.js`: Core RAG logic (retrieval and LLM integration).
- `static/js/rag_worker.js`: Handles document processing in the background.
