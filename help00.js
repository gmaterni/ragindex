export const help1_html = `
<div class="text">
    <p class="center">Un Paradigma RAG Alternativo: La Scelta Lessicale</p>
    <p>
        L'approccio RAG (Retrieval-Augmented Generation) standard si fonda sull'uso di <strong>embeddings</strong> per rappresentare e ricercare informazioni in base al loro significato semantico. Questa applicazione esplora un paradigma alternativo, sostituendo la ricerca semantica con una <strong>ricerca lessicale</strong>, eseguita interamente lato client.
    </p>
    <p>
        Questa scelta non è solo un dettaglio implementativo, ma una decisione architetturale con profonde implicazioni teoriche e pratiche.
    </p>

    <hr>

    <div>
        <strong>Il Principio Fondamentale: Sostituire il Semantico con il Lessicale</strong>
        <p>
            Il cuore di questa implementazione RAG risiede nella rinuncia consapevole ai modelli di embedding. Invece di trasformare i documenti in vettori numerici che catturano il significato, il sistema costruisce un <strong>indice di ricerca basato su BM25</strong>.
        </p>
        <p>
            BM25 (Best Matching 25) è un algoritmo di ranking probabilistico che valuta la rilevanza dei documenti in base alla <strong>frequenza e distribuzione dei termini</strong>. A differenza di una semplice ricerca full-text, BM25 considera fattori come la rarità di una parola nel corpus (maggiore peso ai termini distintivi) e la lunghezza dei documenti (normalizzando i punteggi per evitare penalizzazioni).
        </p>
        <p>
            La fase di "Retrieval" non cerca quindi la "vicinanza concettuale", ma calcola un <strong>punteggio di rilevanza lessicale</strong> per ogni chunk di testo. Il "contesto" fornito al modello linguistico (LLM) non è frutto di una comprensione semantica del corpus, ma di una ricerca testuale sofisticata che identifica i passaggi statisticamente più pertinenti alla query.
        </p>
    </div>

    <div>
        <strong>Vantaggi di questo Paradigma</strong>
        <ul>
            <li><strong>Autonomia e Privacy del Client:</strong> L'assenza di modelli di embedding, spesso di grandi dimensioni e ospitati su server, rende l'architettura estremamente leggera e autonoma. L'indicizzazione BM25 e la ricerca avvengono nel browser, garantendo che i dati grezzi non lascino mai il dispositivo dell'utente.</li>
            <li><strong>Efficienza in Ambiente Browser:</strong> La creazione di un indice BM25 è un'operazione computazionalmente molto più snella rispetto alla generazione di embeddings per l'intero corpus. Questo rende il sistema reattivo e praticabile anche su macchine con risorse limitate, un vincolo fondamentale per le applicazioni web client-side.</li>
            <li><strong>Interpretabilità del "Retrieval":</strong> I risultati di una ricerca BM25 sono direttamente interpretabili: i documenti vengono recuperati e classificati in base alla presenza, frequenza e rarità delle parole della query. Questo contrasta con la natura "black box" della ricerca per similarità vettoriale, dove il motivo della pertinenza è meno esplicito.</li>
            <li><strong>Precisione Lessicale:</strong> BM25 eccelle nel trovare documenti che contengono esattamente i termini ricercati, rendendolo ideale per query tecniche, nomi propri o terminologia specifica dove la corrispondenza esatta è cruciale.</li>
        </ul>
    </div>

    <div>
        <strong>Svantaggi e Compromessi Teorici</strong>
        <ul>
            <li><strong>Mancanza di Comprensione Concettuale:</strong> Il limite principale è l'incapacità di cogliere sinonimi, parafrasi o relazioni concettuali. Una query come "il futuro dell'umanità" potrebbe non trovare un testo che parla di "prospettive per la specie umana" se le parole chiave non si sovrappongono, anche se BM25 può attenuare questo problema dando peso ai termini correlati presenti.</li>
            <li><strong>Dipendenza dalla Qualità della Query:</strong> L'efficacia della ricerca è strettamente legata alla scelta delle parole nella domanda dell'utente. Richiede all'utente di formulare query che contengano termini probabilmente presenti nei documenti di origine, anche se l'algoritmo BM25 è più robusto di una semplice ricerca per parole chiave grazie alla sua capacità di pesare l'importanza relativa dei termini.</li>
        </ul>
    </div>

    <div>
        <strong>Conclusione: Un RAG Pragmatico per il Client-Side</strong>
        <p>
            Questo approccio rappresenta una visione pragmatica del RAG, ottimizzata per l'ambiente browser. Sacrifica la potenza della ricerca semantica in favore di privacy, velocità e leggerezza, sfruttando al contempo la sofisticazione dell'algoritmo BM25 per ottenere risultati di ranking superiori rispetto a una semplice ricerca testuale. Dimostra come i principi del RAG possano essere adattati a contesti con vincoli specifici, offrendo una soluzione funzionale che bilancia capacità e risorse disponibili, affidando al solo LLM finale il compito di "comprendere" semanticamente il contesto lessicalmente recuperato.
        </p>
    </div>
</div>
`;
