// KEYS - Centralized Storage Keys Management
// This file defines all storage keys used in the application
// to ensure consistency and maintainability

export const DATA_KEYS = {
    // ============================================
    // LOCAL STORAGE KEYS
    // Used for configuration and UI state persistence
    // ============================================

    /**
     * User session identifier and tracking information
     * Structure: { id, firstRequest, lastRequest, hostname, pathname }
     * @type {string}
     */
    KEY_WEB_ID: "web_id",

    /**
     * UI theme preference (light/dark)
     * @type {string}
     */
    KEY_THEME: "theme",

    /**
     * Selected LLM provider configuration
     * @type {string}
     */
    KEY_PROVIDER: "llm_provider",

    /**
     * API keys for various providers
     * @type {string}
     */
    KEY_API_KEYS: "api_keys",

    /**
     * List of loaded documents
     * Structure: Array of document objects
     * @type {string}
     */
    KEY_DOCS: "docs",

    /**
     * Individual document prefix
     * Used for storing individual document data
     * @type {string}
     */
    KEY_DOC_PRE: "idoc_",

    /**
     * Name of the currently active knowledge base
     * @type {string}
     */
    ACTIVE_KB_NAME: "active_kb",

    // ============================================
    // INDEXEDDB KEYS
    // Used for larger data structures and application state
    // ============================================

    /**
     * Processed document chunks
     * Structure: Array of chunk objects
     * @type {string}
     */
    PHASE0_CHUNKS: "ph0_chunks",

    /**
     * Search index created from chunks
     * Structure: Serialized index object
     * @type {string}
     */
    PHASE1_INDEX: "ph1_index",

    /**
     * Conversation context
     * Structure: String containing context text
     * @type {string}
     */
    PHASE2_CONTEXT: "ph2_context",

    /**
     * Active conversation thread
     * Structure: Array of message objects
     * @type {string}
     */
    KEY_THREAD: "thread",

    // ============================================
    // PREFIXES FOR NAMED SAVES
    // Used for organizing saved knowledge bases and conversations
    // ============================================

    /**
     * Knowledge Base prefix
     * Structure: { chunks, serializedIndex }
     * @type {string}
     */
    KEY_KB_PRE: "rag_kb_",

    /**
     * Conversation prefix
     * Structure: { context, thread }
     * @type {string}
     */
    KEY_CONVO_PRE: "rag_convo_",

    // ============================================
    // BUILD STATE KEYS
    // Used for knowledge base construction process
    // ============================================

    /**
     * Build state tracking
     * @type {string}
     */
    KEY_BUILD_STATE: "knbase_build_state",

    /**
     * Chunk results prefix
     * @type {string}
     */
    KEY_CHUNK_RES_PRE: "knbase_chunks_",

    /**
     * Document KB prefix
     * @type {string}
     */
    KEY_DOC_KB_PRE: "knbase_doc_kb_"
};

const KEY_DESCRIPTIONS = {
    [DATA_KEYS.PHASE0_CHUNKS]: "Knowledge Attiva (Chunks)",
    [DATA_KEYS.PHASE1_INDEX]: "Knowledge Attiva (Index)",
    [DATA_KEYS.PHASE2_CONTEXT]: "Contesto & Conversazione Attiva",
    [DATA_KEYS.KEY_THREAD]: "Conversazione Attiva",
    [DATA_KEYS.KEY_PROVIDER]: "Configurazione Provider LLM",
    [DATA_KEYS.KEY_THEME]: "Tema UI (dark/light)",
    [DATA_KEYS.KEY_DOCS]: "Elenco Documenti Caricati",
    [DATA_KEYS.KEY_API_KEYS]: "Chiavi API LLM",
    [DATA_KEYS.ACTIVE_KB_NAME]: "Nome KB Attiva",
    [DATA_KEYS.KEY_WEB_ID]: "ID Utente Web",
    [DATA_KEYS.KEY_BUILD_STATE]: "Stato Costruzione KB"
};

/**
 * Returns a human-readable description for a given storage key.
 * @param {string} key - The storage key to describe.
 * @returns {string} The description or "-" if not found.
 */
export const getDescriptionForKey = (key) => {
    if (KEY_DESCRIPTIONS[key]) {
        return KEY_DESCRIPTIONS[key];
    }
    if (key.startsWith(DATA_KEYS.KEY_KB_PRE)) {
        const name = key.slice(DATA_KEYS.KEY_KB_PRE.length);
        return `Knowledge Archiviata: ${name}`;
    }
    if (key.startsWith(DATA_KEYS.KEY_CONVO_PRE)) {
        const name = key.slice(DATA_KEYS.KEY_CONVO_PRE.length);
        return `Conversazione Archiviata: ${name}`;
    }
    if (key.startsWith(DATA_KEYS.KEY_DOC_PRE)) {
        const name = key.slice(DATA_KEYS.KEY_DOC_PRE.length);
        return `Documento Caricato: ${name}`;
    }
    if (key.startsWith(DATA_KEYS.KEY_CHUNK_RES_PRE)) {
        const name = key.slice(DATA_KEYS.KEY_CHUNK_RES_PRE.length);
        return `Build Temp (Chunks): ${name}`;
    }
    if (key.startsWith(DATA_KEYS.KEY_DOC_KB_PRE)) {
        const name = key.slice(DATA_KEYS.KEY_DOC_KB_PRE.length);
        return `Build Temp (KB): ${name}`;
    }

    return "-";
};
