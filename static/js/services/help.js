/** @format */
"use strict";

export const help0_html = `
<div class="text">
    <p class="center">Istruzioni Comandi</p>

    <!-- Barra Superiore -->
    <p class="center">Barra Superiore</p>
    <div>
        <strong>Menu Laterale (icona hamburger)</strong>
        <p>Apre e chiude il menu laterale con i comandi principali.</p>
    </div>
    <div>
        <strong>? (Help)</strong>
        <p>Mostra questa finestra con la descrizione dei comandi.</p>
    </div>
    <div>
        <strong>Upload file</strong>
        <p>Apre la finestra per caricare uno o più documenti (PDF, DOCX, TXT) dal tuo computer.</p>
    </div>
    <div>
        <strong>LLM (Provider/Modello)</strong>
        <p>Apre il menu per scegliere il provider AI (es. Gemini, Mistral) e il modello specifico da usare.</p>
    </div>
    <div>
        <strong>Log</strong>
        <p>Attiva o disattiva la finestra di log, utile per vedere le fasi del processo RAG in tempo reale.</p>
    </div>
    <div>
        <strong>Tema (Sole/Luna)</strong>
        <p>Passa dal tema scuro a quello chiaro.</p>
    </div>

    <hr>

    <!-- Comandi Finestra di Output -->
    <p class="center">Comandi Finestra di Output (in alto a destra)</p>
    <div>
        <strong>Copia Output</strong>
        <p>Copia l'intero contenuto della finestra di output negli appunti.</p>
    </div>

    <div>
        <strong>Nuova Conversazione</strong>
        <p>Cancella la cronologia della conversazione attiva. Non cancella il Contesto.</p>
    </div>
    <div>
        <strong>Nuovo Contesto & Conversazione</strong>
        <p>Cancella il Contesto e la cronologia della conversazione attiva.</p>
    </div>

    <hr>

    <!-- Pulsanti del Flusso RAG -->
    <p class="center">Pulsanti del Flusso RAG</p>
    <div>
        <strong>Crea Knowledge Base</strong>
        <p>Analizza i documenti caricati, li suddivide in "Chunks" (frammenti di testo) e crea un "Indice" di ricerca. Questo processo crea la Knowledge di lavoro.</p>
    </div>
    <div>
        <strong>Inizia Conversazione</strong>
        <p>Usa la domanda inserita nel campo di input per cercare nella Knowledge, creare un "Contesto" con i risultati più pertinenti e generare la prima risposta dall'LLM.</p>
    </div>
    <div>
        <strong>Continua Conversazione</strong>
        <p>Invia la nuova domanda e la cronologia della conversazione (con il contesto originale) all'LLM per generare una risposta e continuare il dialogo.</p>
    </div>
    <div>
        <strong>Cancella Input</strong>
        <p>Cancella il testo inserito nel campo di input.</p>
    </div>
    <hr>

    <!-- Menu Laterale -->
    <p class="center">Menu Laterale</p>
    <div>
        <strong>Informazioni</strong>
        <ul>
            <li><strong>README:</strong> Mostra la documentazione tecnica approfondita.</li>
            <li><strong>Quick Start:</strong> Guida rapida all'utilizzo dell'applicazione.</li>
            <li><strong>Configurazione:</strong> Mostra la configurazione corrente del Provider LLM.</li>
        </ul>
    </div>
    <div>
        <strong>Knowledge Base</strong>
        <ul>
            <li><strong>Archivia:</strong> Salva la Knowledge Base di lavoro corrente con un nome.</li>
            <li><strong>Gestisci:</strong> Mostra, carica o elimina le Knowledge Base archiviate.</li>
        </ul>
    </div>
    <div>
        <strong>Conversazione</strong>
        <ul>
            <li><strong>Visualizza:</strong> Mostra l'intera cronologia della conversazione corrente (solo domande e risposte).</li>
            <li><strong>Archivia:</strong> Salva la conversazione attiva (contesto + cronologia) con un nome.</li>
            <li><strong>Gestisci:</strong> Mostra, carica o elimina le conversazioni archiviate.</li>
            <li><strong>Visualizza Contesto:</strong> Mostra il contesto di ricerca attivo in una finestra separata.</li>
        </ul>
    </div>
    <div>
        <strong>Documenti</strong>
        <ul>
            <li><strong>Elenco Documenti:</strong> Mostra i documenti caricati. Puoi visualizzarli o cancellarli.</li>
            <li><strong>Documenti Esempio:</strong> Carica file di testo di esempio per provare subito l'applicazione.</li>
        </ul>
    </div>
    <div>
        <strong>Gestione Dati</strong>
        <ul>
            <li><strong>Elenco Dati Archiviati:</strong> Mostra un riepilogo di tutti i dati salvati nell'applicazione (Knowledge Base e Conversazioni).</li>
            <li><strong>Cancella Dati:</strong> Permette di cancellare selettivamente o totalmente i dati salvati.</li>
        </ul>
    </div>
</div>
`;


export const help1_html = `
<div class="text">
    <p class="center">Un Paradigma RAG Alternativo: La Scelta Lessicale</p>
    <p>
        L'approccio RAG (Retrieval-Augmented Generation) standard si fonda sull'uso di <strong>embeddings</strong> per rappresentare e ricercare informazioni in base al loro significato semantico. RagIndex esplora un paradigma alternativo, sostituendo la ricerca semantica con una <strong>ricerca lessicale</strong>, eseguita interamente lato client.
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




export const help2_html = `
<div class="text">
    <p class="center">Quickstart: Il Flusso di Lavoro a 3 Azioni</p>
    <p>
        Questa guida ti mostra come usare l'applicazione seguendo il flusso di lavoro a 3 azioni.
    </p>

    <!-- Azione 1 -->
    <div>
        <strong>Azione 1: Crea Knowledge Base</strong>
        <p>
            Prepara i tuoi documenti per la ricerca.
        </p>
        <ol>
            <li><strong>Carica Documenti:</strong> Usa <strong>"Documenti Esempio"</strong> dal menu laterale o il pulsante <strong>"Upload file"</strong> nella barra superiore per caricare i tuoi file (PDF, DOCX, TXT).</li>
            <li><strong>Esegui Azione 1:</strong> Clicca il pulsante <span style="color: red; font-weight: bold;">(1)</span>. L'applicazione segmenterà i documenti in "Chunks" e creerà un "Indice" di ricerca. Questi due elementi formano la tua Knowledge Base di lavoro.</li>
            <li><strong>(Opzionale) Archivia Knowledge Base:</strong> Dal menu laterale, vai su <strong>Knowledge Base > Archivia</strong> per salvare la KB di lavoro con un nome.</li>
        </ol>
    </div>

    <hr>

    <!-- Azione 2 -->
    <div>
        <strong>Azione 2: Inizia Conversazione</strong>
        <p>
            Avvia una nuova conversazione utilizzando la Knowledge Base creata.
        </p>
        <ol>
            <li><strong>Scrivi la Query:</strong> Inserisci la tua domanda nel campo di testo in basso.</li>
            <li><strong>Esegui Azione 2:</strong> Clicca il pulsante <span style="color: orange; font-weight: bold;">(2)</span>. L'applicazione userà la tua query per cercare nella Knowledge Base, costruire un "Contesto" con le informazioni più pertinenti e generare la prima risposta dall'LLM.</li>
            <li><strong>(Opzionale) Visualizza Contesto:</strong> Dal menu laterale, vai su <strong>Conversazione > Visualizza Contesto</strong> per vedere il contesto generato.</li>
            <li><strong>(Opzionale) Archivia Conversazione:</strong> Dal menu laterale, vai su <strong>Conversazione > Archivia</strong> per salvare la conversazione (contesto + cronologia) con un nome.</li>
        </ol>
    </div>

    <hr>

    <!-- Azione 3 -->
    <div>
        <strong>Azione 3: Continua Conversazione</strong>
        <p>
            Prosegui il dialogo con l'LLM, mantenendo il filo del discorso.
        </p>
        <ol>
            <li><strong>Scrivi la Nuova Query:</strong> Inserisci la tua domanda di approfondimento nel campo di testo.</li>
            <li><strong>Esegui Azione 3:</strong> Clicca il pulsante <span style="color: green; font-weight: bold;">(3)</span>. L'LLM utilizzerà il contesto originale e l'intera cronologia della conversazione per formulare una nuova risposta.</li>
        </ol>
    </div>

    <hr>

    <!-- Gestione Dati -->
    <div>
        <strong>Gestione Dati Archiviati</strong>
        <p>
            Puoi gestire le Knowledge Base e le Conversazioni che hai archiviato.
        </p>
        <ul>
            <li>Dal menu laterale, vai su <strong>Knowledge Base > Gestisci</strong> per caricare o eliminare le KB salvate.</li>
            <li>Dal menu laterale, vai su <strong>Conversazione > Gestisci</strong> per caricare o eliminare le conversazioni salvate.</li>
            <li>Per una panoramica completa e la cancellazione selettiva di tutti i dati, usa <strong>Gestione Dati > Elenco Dati Archiviati</strong> e <strong>Cancella Dati</strong>.</li>
        </ul>
    </div>
</div>
`;