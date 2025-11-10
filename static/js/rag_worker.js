"use strict";

try {
    importScripts(
        './services/vendor/compromise.js',
        './services/vendor/lunr.js',
        './services/vendor/lunr.stemmer.support.js',
        './services/vendor/lunr.it.js'
    );
} catch (e) {
    console.error("Worker: Errore durante l'importazione degli script.", e);
}

const workerLogic = {
    /**
     * Esegue la creazione della Knowledge Base (chunking e indicizzazione).
     */
    async createKnowledgeBase(documents) {
        // Fase 0: Chunking
        self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: `Fase 0: Inizio segmentazione...` });
        let allChunks = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: ` -> Elaboro ${doc.name}` });
            const docChunks = await this._chunkDocument(doc.text, i);
            allChunks.push(...docChunks);
        }

        // Fase 1: Indicizzazione
        self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: `Fase 1: Inizio indicizzazione...` });
        const index = this._buildIndex(allChunks);
        const serializedIndex = JSON.stringify(index);

        return { chunks: allChunks, serializedIndex: serializedIndex };
    },


    async _chunkDocument(text, docIndex) {
        const chunks = [];
        const sentences = self.nlp(text).sentences().out('array');
        let currentChunkText = "";
        let chunkIdCounter = 0;

        const MIN_CHUNK_SIZE = 300;
        const MAX_CHUNK_SIZE = 1500;

        for (const sentence of sentences) {
            if (currentChunkText.length + sentence.length + 1 > MAX_CHUNK_SIZE && currentChunkText.length >= MIN_CHUNK_SIZE) {
                chunks.push(await this._processChunk(currentChunkText, docIndex, chunkIdCounter++));
                currentChunkText = sentence;
            } else {
                currentChunkText += (currentChunkText.length > 0 ? " " : "") + sentence;
            }
        }

        if (currentChunkText.length > 0) {
            chunks.push(await this._processChunk(currentChunkText, docIndex, chunkIdCounter++));
        }
        return chunks;
    },

    async _processChunk(chunkText, docIndex, chunkIndex) {
        const doc = self.nlp(chunkText);
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        const adjectives = doc.adjectives().out('array');
        const keywords = [...new Set([...nouns, ...verbs, ...adjectives])]
            .map(word => word.toLowerCase())
            .filter(word => word.length > 2);

        const people = doc.people().out('array');
        const places = doc.places().out('array');
        const organizations = doc.organizations().out('array');
        const entities = [...new Set([...people, ...places, ...organizations])]
            .map(entity => entity.toLowerCase());

        return {
            id: `doc${docIndex}-chunk${chunkIndex}`,
            text: chunkText,
            keywords: keywords,
            entities: entities,
        };
    },

    _buildIndex(chunks) {
        const idx = self.lunr(function () {
            this.use(self.lunr.it);
            this.ref('id');
            this.field('body');

            chunks.forEach(chunk => {
                const fullText = `${chunk.text} ${chunk.keywords.join(" ")} ${chunk.entities.join(" ")}`;
                this.add({ id: chunk.id, body: fullText });
            });
        });
        return idx;
    },
};

// Listener principale per i messaggi dal thread principale
self.onmessage = async function (e) {
    const { command, data } = e.data;

    try {
        let result;
        switch (command) {
            case 'createKnowledgeBase':
                result = await workerLogic.createKnowledgeBase(data);
                break;
            default:
                throw new Error(`Comando non riconosciuto per il worker: ${command}`);
        }
        self.postMessage({ status: 'complete', command, result });
    } catch (error) {
        self.postMessage({ status: 'error', command, error: error.message });
    }
};