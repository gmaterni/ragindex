export const DATA_KEYS = {
    // Inter-phase data products for pedagogical flow
    PHASE0_CHUNKS: "phase0_chunks",
    PHASE1_INDEX: "phase1_index",
    PHASE2_CONTEXT: "phase2_context",
    PHASE2_QUERY: "phase2_query",

    // Prefissi per salvataggi nominati in IndexedDB
    KEY_KB_PRE: "ua-rag-kb-",        // Knowledge Base (chunks + index)
    KEY_CONVO_PRE: "ua-rag-convo-",  // Conversazione (context + thread)
    KEY_THREAD_PRE: "keythr_",       // Vecchio archivio thread, da mantenere per migrazione

    // localStorage
    KEY_THEME: "ua_theme",
    KEY_PROVIDER: "llm_provider",
    KEY_DOCS: "docs_list",
    KEY_THREAD: "thread"
};
