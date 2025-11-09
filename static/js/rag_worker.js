/**
 * @file rag_worker.js
 * @description Web Worker per eseguire le operazioni pesanti della pipeline RAG in un thread separato,
 * mantenendo l'interfaccia utente reattiva.
 */
"use strict";

// Importa le librerie necessarie. Vengono caricate una sola volta all'avvio del worker.
// I percorsi sono relativi alla posizione del file worker.
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

// Oggetto che contiene la logica di business (spostata qui da rag_engine.js)
const workerLogic = {
    async processDocumentsForPhase0(documents) {
        let allChunks = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            // Invia un messaggio di progresso al thread principale (opzionale ma utile)
            self.postMessage({ status: 'progress', command: 'phase0', progress: ` Elaborazione documento ${i + 1}/${documents.length}: ${doc.name}` });
            
            const docChunks = await this.ne0_chunkAndAnnotate(doc.text);
            
            docChunks.forEach((chunk, index) => {
                chunk.id = `doc${i}-chunk${index}`;
            });
            
            allChunks.push(...docChunks);

            // Cede il controllo per mantenere il worker reattivo (anche se non strettamente necessario nel worker)
            await new Promise(resolve => setTimeout(resolve, 0)); 
        }
        return allChunks;
    },

    async ne0_chunkAndAnnotate(text) {
        const chunks = [];
        const sentences = self.nlp(text).sentences().out('array');
        let currentChunkText = "";
        let chunkIdCounter = 0;

        const MIN_CHUNK_SIZE = 300;
        const MAX_CHUNK_SIZE = 1500;

        for (const sentence of sentences) {
            if (currentChunkText.length + sentence.length + 1 > MAX_CHUNK_SIZE && currentChunkText.length >= MIN_CHUNK_SIZE) {
                chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
                currentChunkText = sentence;
            } else {
                currentChunkText += (currentChunkText.length > 0 ? " " : "") + sentence;
            }
        }

        if (currentChunkText.length > 0) {
            chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
        }
        return chunks;
    },

    async _processChunk(chunkText, id) {
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
            id: `chunk-${String(id).padStart(3, '0')}`,
            text: chunkText,
            keywords: keywords,
            entities: entities,
        };
    },

    ne1_buildIndex(chunks) {
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

    ne2_search(serializedIndex, query) {
        if (!serializedIndex) {
            throw new Error("Indice serializzato non fornito a ne2_search.");
        }
        const index = self.lunr.Index.load(JSON.parse(serializedIndex));
        return index.search(query);
    },
};

// Listener principale per i messaggi dal thread principale
self.onmessage = async function(e) {
    const { command, data } = e.data;

    try {
        let result;
        switch (command) {
            case 'phase0':
                result = await workerLogic.processDocumentsForPhase0(data);
                break;
            case 'phase1':
                result = workerLogic.ne1_buildIndex(data);
                break;
            case 'phase2':
                result = workerLogic.ne2_search(data.serializedIndex, data.query);
                break;
            default:
                throw new Error(`Comando non riconosciuto per il worker: ${command}`);
        }
        // Invia il risultato al thread principale
        self.postMessage({ status: 'complete', command, result });
    } catch (error) {
        // Invia l'errore al thread principale
        self.postMessage({ status: 'error', command, error: error.message });
    }
};