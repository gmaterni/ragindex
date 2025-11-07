/** @format */
"use strict";

import nlp from "../services/vendor/compromise.js";
import * as lunr from "../services/vendor/lunr.js";
import "../services/vendor/lunr.stemmer.support.js";
import "../services/vendor/lunr.it.js";

export const newRagEngine = {
    async ne0_chunkAndAnnotate(text) {
        const chunks = [];
        const sentences = nlp(text).sentences().out('array');

        let currentChunkText = "";
        let chunkIdCounter = 0;

        const MIN_CHUNK_SIZE = 300; // Caratteri minimi per un chunk
        const MAX_CHUNK_SIZE = 1500; // Caratteri massimi per un chunk

        for (const sentence of sentences) {
            if (currentChunkText.length + sentence.length + 1 > MAX_CHUNK_SIZE && currentChunkText.length >= MIN_CHUNK_SIZE) {
                // Se l'aggiunta della frase supera la dimensione massima e il chunk corrente è già abbastanza grande,
                // finalizza il chunk corrente e inizia uno nuovo.
                chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
                currentChunkText = sentence;
            } else {
                // Altrimenti, aggiungi la frase al chunk corrente.
                currentChunkText += (currentChunkText.length > 0 ? " " : "") + sentence;
            }
        }

        // Aggiungi l'ultimo chunk se non vuoto
        if (currentChunkText.length > 0) {
            chunks.push(await this._processChunk(currentChunkText, chunkIdCounter++));
        }

        return chunks;
    },

    async _processChunk(chunkText, id) {
        const doc = nlp(chunkText);

        // Estrazione Keywords (Nomi, Verbi, Aggettivi)
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        const adjectives = doc.adjectives().out('array');
        const keywords = [...new Set([...nouns, ...verbs, ...adjectives])]
            .map(word => word.toLowerCase())
            .filter(word => word.length > 2); // Filtra parole troppo corte

        // Estrazione Entità (Persone, Luoghi, Organizzazioni)
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
        const idx = lunr(function () {
            this.use(lunr.it); // Abilita il supporto per la lingua italiana
            this.ref('id');
            this.field('body');

            chunks.forEach(chunk => {
                const fullText = `${chunk.text} ${chunk.keywords.join(" ")} ${chunk.entities.join(" ")}`;
                this.add({ id: chunk.id, body: fullText });
            });
        });
        return idx;
    },

    ne2_search(index, query) {
        return index.search(query);
    },

    // --- Blocco di test temporaneo per ne0_chunkAndAnnotate ---
    (async () => {
        const testText = `Aaron Swartz è stato un programmatore, scrittore, attivista politico e organizzatore di Internet. Nato a Chicago, Illinois, ha contribuito allo sviluppo del formato di feed web RSS e del linguaggio di markup Markdown. È stato anche co-fondatore di Reddit. La sua vita è stata segnata da un forte impegno per la libertà dell'informazione e l'accesso aperto alla conoscenza. Ha fondato Infogami, una società di software, e ha lavorato con Tim Berners-Lee al World Wide Web Consortium.`;
        console.log("--- Inizio test ne0_chunkAndAnnotate ---");
        try {
            const chunks = await newRagEngine.ne0_chunkAndAnnotate(testText);
            console.log("Chunk generati:", chunks);
            if (chunks.length > 0) {
                console.assert(chunks[0].id === "chunk-000", "ID del primo chunk non corretto");
                console.assert(chunks[0].text.length > 0, "Testo del chunk vuoto");
                console.assert(Array.isArray(chunks[0].keywords), "Keywords non è un array");
                console.assert(Array.isArray(chunks[0].entities), "Entities non è un array");
                console.log("Test ne0_chunkAndAnnotate superato con successo!");
            } else {
                console.error("Nessun chunk generato.");
            }
        } catch (error) {
            console.error("Errore durante il test di ne0_chunkAndAnnotate:", error);
        }
        console.log("--- Fine test ne0_chunkAndAnnotate ---");
    })();
    // --- Fine blocco di test temporaneo ---
    }
};

