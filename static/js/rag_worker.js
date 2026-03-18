/**
 * @fileoverview rag_worker.js - Web Worker per elaborazione RAG
 * @description Esegue chunking e indicizzazione in background senza bloccare la UI.
 *              Utilizza Compromise.js per NLP e Lunr.js per indicizzazione.
 * @module services/worker/rag_worker
 */
"use strict";

// Import script nel contesto worker
/* eslint-disable no-undef */
importScripts(
    './services/vendor/compromise.js',
    './services/vendor/lunr.js',
    './services/vendor/lunr.stemmer.support.js',
    './services/vendor/lunr.it.js'
);

// ============================================================================
// VARIABILI PRIVATE
// ============================================================================

/**
 * Configurazione chunking.
 */
const _CONFIG = {
    TARGET_PARENT_SIZE: 1000,  // Dimensione target per Parent Chunk
    MIN_CHILD_LENGTH: 15       // Lunghezza minima per Child Chunk
};

// ============================================================================
// FUNZIONI PRIVATE - WorkerLogic
// ============================================================================

/**
 * Estrae metadati (keywords ed entità) da un testo.
 * @param {string} text - Testo da analizzare
 * @returns {Object} Oggetto con keywords ed entities
 * @private
 */
const _processText = (text) => {
    const doc = self.nlp(text);

    // Estrazione parti del discorso
    const nouns = doc.nouns().out("array");
    const verbs = doc.verbs().out("array");

    // Parole chiave (nomi + verbi, lowercase, lunghezza > 3)
    const keywords = [...new Set([...nouns, ...verbs])]
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 3);

    // Named Entity Recognition
    const people = doc.people().out("array");
    const places = doc.places().out("array");
    const orgs = doc.organizations().out("array");

    const entities = [...new Set([...people, ...places, ...orgs])]
        .map((e) => e.toLowerCase());

    const result = { keywords, entities };
    return result;
};

/**
 * Costruisce indice Lunr da un array di entry.
 * @param {Array} indexEntries - Array di {id, body, keywords, entities}
 * @returns {Object} Indice Lunr serializzabile
 * @private
 */
const _buildIndex = (indexEntries) => {
    const idx = self.lunr(function () {
        // Configura lingua italiana
        this.use(self.lunr.it);

        // Campo di riferimento (ID)
        this.ref("id");

        // Campo principale per ricerca
        this.field("body");

        // Aggiunge ogni entry all'indice
        indexEntries.forEach((entry) => {
            // Unisce corpo, keywords ed entities in un unico testo
            const fullText = `${entry.body} ${entry.keywords.join(" ")} ${entry.entities.join(" ")}`;
            this.add({ id: entry.id, body: fullText });
        });
    });

    return idx;
};

/**
 * Esegue chunking gerarchico Parent-Child su un documento.
 * @param {string} text - Testo del documento
 * @param {number} docIndex - Indice del documento (per ID univoci)
 * @returns {Object} {parents: [], indexEntries: []}
 * @private
 */
const _chunkDocument = async (text, docIndex) => {
    const parents = [];
    const indexEntries = [];

    // Usa compromise per dividere in frasi
    const sentences = self.nlp(text).sentences().out("array");

    let currentParentText = "";
    let currentParentSentences = [];
    let parentIdx = 0;

    /**
     * Finalizza un Parent Chunk e crea i relativi Children.
     * @returns {void}
     */
    const finalizeParent = async () => {
        const pid = `d${docIndex}p${parentIdx++}`;

        // 1. Creo il Parent (Contesto)
        parents.push({
            id: pid,
            text: currentParentText,
            source: `doc_${docIndex}` // Metadata per citazioni future
        });

        // 2. Creo i Children (Unità di Ricerca)
        let childIdx = 0;

        for (const sent of currentParentSentences) {
            // Filtro frasi troppo brevi che sporcano l'indice
            if (sent.length < _CONFIG.MIN_CHILD_LENGTH) {
                continue;
            }

            const cid = `${pid}#${childIdx++}`; // ID Composito: ParentID#ChildID
            const meta = _processText(sent);

            indexEntries.push({
                id: cid,
                body: sent,
                keywords: meta.keywords,
                entities: meta.entities
            });
        }
    };

    // Accumulo frasi in Parent (sliding window)
    for (const s of sentences) {
        const shouldFinalize = currentParentText.length > 0 &&
            currentParentText.length + s.length > _CONFIG.TARGET_PARENT_SIZE;

        if (shouldFinalize) {
            await finalizeParent();
            currentParentText = s;
            currentParentSentences = [s];
        } else {
            const separator = currentParentText.length > 0 ? " " : "";
            currentParentText += separator + s;
            currentParentSentences.push(s);
        }
    }

    // Flush finale
    if (currentParentText.length > 0) {
        await finalizeParent();
    }

    const result = { parents, indexEntries };
    return result;
};

/**
 * Crea Knowledge Base da un array di documenti.
 * @param {Array} documents - Array di {name, text}
 * @returns {Object} {chunks: [], serializedIndex: ""}
 * @private
 */
const _createKnowledgeBase = async (documents) => {
    // Fase 0: Chunking Gerarchico (Parent-Child)
    self.postMessage({
        status: "progress",
        command: "createKnowledgeBase",
        progress: "Fase 0: Segmentazione (Parent-Child)..."
    });

    let allParents = [];
    let allIndexEntries = [];

    // Elabora ogni documento
    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];

        self.postMessage({
            status: "progress",
            command: "createKnowledgeBase",
            progress: ` -> Elaboro ${doc.name}`
        });

        const result = await _chunkDocument(doc.text, i);
        allParents.push(...result.parents);
        allIndexEntries.push(...result.indexEntries);
    }

    // Fase 1: Indicizzazione
    self.postMessage({
        status: "progress",
        command: "createKnowledgeBase",
        progress: `Fase 1: Indicizzazione (${allIndexEntries.length} items)...`
    });

    const index = _buildIndex(allIndexEntries);
    const serializedIndex = JSON.stringify(index);

    // Restituisce chunks (Parent) e indice serializzato
    const result = {
        chunks: allParents,
        serializedIndex: serializedIndex
    };

    return result;
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Gestisce i messaggi in arrivo dal thread principale.
 */
self.onmessage = async (e) => {
    const { command, data } = e.data;

    try {
        let result = null;

        switch (command) {
            case "createKnowledgeBase":
                result = await _createKnowledgeBase(data);
                break;

            default:
                throw new Error(`Comando non riconosciuto per il worker: ${command}`);
        }

        self.postMessage({
            status: "complete",
            command: command,
            result: result
        });

    } catch (error) {
        self.postMessage({
            status: "error",
            command: command,
            error: error.message
        });
    }
};
