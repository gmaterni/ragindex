"use strict";

importScripts(
    './services/vendor/compromise.js',
    './services/vendor/lunr.js',
    './services/vendor/lunr.stemmer.support.js',
    './services/vendor/lunr.it.js'
);

const workerLogic = {
    /**
     * Esegue la creazione della Knowledge Base (chunking e indicizzazione).
     */
    async createKnowledgeBase(documents) {
        // Fase 0: Chunking Gerarchico (Parent-Child)
        self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: `Fase 0: Segmentazione (Parent-Child)...` });
        
        let allParents = []; // Context Units (saranno salvati in IDB come 'chunks')
        let allIndexEntries = []; // Search Units (andranno in Lunr)

        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: ` -> Elaboro ${doc.name}` });
            
            const result = await this._chunkDocument(doc.text, i);
            allParents.push(...result.parents);
            allIndexEntries.push(...result.indexEntries);
        }

        // Fase 1: Indicizzazione
        self.postMessage({ status: 'progress', command: 'createKnowledgeBase', progress: `Fase 1: Indicizzazione (${allIndexEntries.length} items)...` });
        const index = this._buildIndex(allIndexEntries);
        const serializedIndex = JSON.stringify(index);

        // Restituiamo 'chunks' (che ora sono i Parent) per compatibilità con il resto del sistema che si aspetta 'chunks' per il contesto
        return { chunks: allParents, serializedIndex: serializedIndex };
    },


    async _chunkDocument(text, docIndex) {
        const parents = [];
        const indexEntries = [];
        
        // Uso compromise per dividere in frasi
        const sentences = self.nlp(text).sentences().out('array');
        
        let currentParentText = "";
        let currentParentSentences = [];
        let parentIdx = 0;

        const TARGET_PARENT_SIZE = 1000; // Dimensione target per il contesto

        // Funzione helper per chiudere un Parent
        const finalizeParent = async () => {
            const pid = `d${docIndex}p${parentIdx++}`;
            
            // 1. Creo il Parent (Contesto)
            parents.push({
                id: pid,
                text: currentParentText,
                source: `doc_${docIndex}` // Metadata utile per citazioni future
            });

            // 2. Creo i Children (Unità di Ricerca)
            let childIdx = 0;
            for (const sent of currentParentSentences) {
                // Filtro frasi troppo brevi che sporcano l'indice
                if (sent.length < 15) continue;

                const cid = `${pid}#${childIdx++}`; // ID Composito: ParentID#ChildID
                const meta = await this._processText(sent);
                
                indexEntries.push({
                    id: cid,
                    body: sent,
                    keywords: meta.keywords,
                    entities: meta.entities
                });
            }
        };

        for (const s of sentences) {
            // Logica di accumulo (Sliding Window semplice)
            if (currentParentText.length + s.length > TARGET_PARENT_SIZE && currentParentText.length > 0) {
                await finalizeParent();
                currentParentText = s;
                currentParentSentences = [s];
            } else {
                currentParentText += (currentParentText.length > 0 ? " " : "") + s;
                currentParentSentences.push(s);
            }
        }
        
        // Flush finale
        if (currentParentText.length > 0) {
            await finalizeParent();
        }

        return { parents, indexEntries };
    },

    async _processText(text) {
        const doc = self.nlp(text);
        // Estrazione light di metadati
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        // const adjectives = doc.adjectives().out('array'); // Rimosso per risparmiare spazio, verbi e nomi bastano spesso
        
        const keywords = [...new Set([...nouns, ...verbs])]
            .map(w => w.toLowerCase())
            .filter(w => w.length > 3);

        const people = doc.people().out('array');
        const places = doc.places().out('array');
        const orgs = doc.organizations().out('array');
        
        const entities = [...new Set([...people, ...places, ...orgs])]
            .map(e => e.toLowerCase());

        return { keywords, entities };
    },

    _buildIndex(indexEntries) {
        const idx = self.lunr(function () {
            this.use(self.lunr.it);
            this.ref('id');
            this.field('body');
            // this.field('keywords'); // Opzionale: boost sulle keywords esplicite
            // this.field('entities');

            indexEntries.forEach(entry => {
                // Indicizziamo tutto in 'body' per semplicità, dando peso alle keywords
                const fullText = `${entry.body} ${entry.keywords.join(" ")} ${entry.entities.join(" ")}`;
                this.add({ id: entry.id, body: fullText });
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