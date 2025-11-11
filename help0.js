
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
            Il cuore di questa implementazione RAG risiede nella rinuncia consapevole ai modelli di embedding. Invece di trasformare i documenti in vettori numerici che catturano il significato, il sistema costruisce un <strong>indice di ricerca testuale (full-text)</strong>.
        </p>
        <p>
            La fase di "Retrieval" non cerca quindi la "vicinanza concettuale", ma la <strong>presenza e rilevanza di parole chiave</strong>. Il "contesto" fornito al modello linguistico (LLM) non è frutto di una comprensione semantica del corpus, ma di una rapida ed efficiente identificazione dei passaggi testualmente più pertinenti.
        </p>
    </div>

    <div>
        <strong>Vantaggi di questo Paradigma</strong>
        <ul>
            <li><strong>Autonomia e Privacy del Client:</strong> L'assenza di modelli di embedding, spesso di grandi dimensioni e ospitati su server, rende l'architettura estremamente leggera e autonoma. L'indicizzazione e la ricerca avvengono nel browser, garantendo che i dati grezzi non lascino mai il dispositivo dell'utente.</li>
            <li><strong>Efficienza in Ambiente Browser:</strong> La creazione di un indice lessicale è un'operazione computazionalmente molto più snella rispetto alla generazione di embeddings per l'intero corpus. Questo rende il sistema reattivo e praticabile anche su macchine con risorse limitate, un vincolo fondamentale per le applicazioni web client-side.</li>
            <li><strong>Interpretabilità del "Retrieval":</strong> I risultati di una ricerca lessicale sono direttamente interpretabili: i documenti vengono recuperati perché contengono le parole della query. Questo contrasta con la natura "black box" della ricerca per similarità vettoriale, dove il motivo della pertinenza è meno esplicito.</li>
        </ul>
    </div>

    <div>
        <strong>Svantaggi e Compromessi Teorici</strong>
        <ul>
            <li><strong>Mancanza di Comprensione Concettuale:</strong> Il limite principale è l'incapacità di cogliere sinonimi, parafrasi o relazioni concettuali. Una query come "il futuro dell'umanità" potrebbe non trovare un testo che parla di "prospettive per la specie umana" se le parole chiave non si sovrappongono.</li>
            <li><strong>Dipendenza dalla Qualità della Query:</strong> L'efficacia della ricerca è strettamente legata alla scelta delle parole nella domanda dell'utente. Richiede all'utente di formulare query che contengano termini probabilmente presenti nei documenti di origine.</li>
        </ul>
    </div>

    <div>
        <strong>Conclusione: Un RAG Pragmatico per il Client-Side</strong>
        <p>
            Questo approccio rappresenta una visione pragmatica del RAG, ottimizzata per l'ambiente browser. Sacrifica la potenza della ricerca semantica in favore di privacy, velocità e leggerezza. Dimostra come i principi del RAG possano essere adattati a contesti con vincoli specifici, offrendo una soluzione funzionale che bilancia capacità e risorse disponibili, affidando al solo LLM finale il compito di "comprendere" semanticamente il contesto lessicalmente recuperato.
        </p>
    </div>
</div>
`;
