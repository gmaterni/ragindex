/** @format */
"use strict";

/**
 * HTML per la finestra di aiuto dei comandi (Help).
 * Descrive le funzionalità dell'interfaccia e dei pulsanti principali.
 */
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
        <p>Cancella la cronologia della conversazione attiva. Mantiene il Contesto attuale per permettere di ricominciare a parlare degli stessi argomenti.</p>
    </div>
    <div>
        <strong>Nuovo Contesto & Conversazione</strong>
        <p>Resetta completamente la sessione di lavoro: cancella il Contesto estratto e la cronologia della conversazione attiva.</p>
    </div>

    <hr>

    <!-- Pulsanti del Flusso RAG -->
    <p class="center">Pulsanti del Flusso RAG</p>
    <div>
        <strong>Crea Knowledge Base</strong>
        <p>Analizza i documenti caricati, li suddivide in "Chunks" e crea un "Indice" di ricerca. Questo processo genera la Knowledge di lavoro corrente.</p>
    </div>
    <div>
        <strong>Inizia Conversazione</strong>
        <p>Usa la domanda per cercare nella Knowledge Base attiva, estrae un "Contesto" pertinente e avvia il dialogo con l'LLM.</p>
    </div>
    <div>
        <strong>Continua Conversazione</strong>
        <p>Prosegue il dialogo inviando all'LLM la nuova domanda insieme alla cronologia precedente e al contesto già identificato.</p>
    </div>
    <div>
        <strong>Cancella Input</strong>
        <p>Svuota rapidamente il campo di inserimento testo.</p>
    </div>
    <hr>

    <!-- Menu Laterale -->
    <p class="center">Menu Laterale</p>
    <div>
        <strong>Informazioni</strong>
        <ul>
            <li><strong>README:</strong> Approfondimento tecnico sul funzionamento del sistema.</li>
            <li><strong>Quick Start:</strong> Guida rapida ai 3 passi fondamentali.</li>
            <li><strong>Configurazione:</strong> Dettagli tecnici sul modello AI in uso.</li>
        </ul>
    </div>
    <div>
        <strong>Knowledge Base</strong>
        <ul>
            <li><strong>Archivia:</strong> Salva permanentemente la KB di lavoro corrente assegnandole un nome.</li>
            <li><strong>Gestisci:</strong> Elenco delle KB salvate per caricamento o eliminazione.</li>
        </ul>
    </div>
    <div>
        <strong>Conversazione</strong>
        <ul>
            <li><strong>Visualizza:</strong> Mostra la cronologia testuale del dialogo corrente.</li>
            <li><strong>Archivia:</strong> Salva la sessione attiva (Contesto + Cronologia) per usi futuri.</li>
            <li><strong>Gestisci:</strong> Elenco delle conversazioni salvate.</li>
            <li><strong>Visualizza Contesto:</strong> Mostra i frammenti di testo estratti dalla KB che l'AI sta usando per rispondere.</li>
        </ul>
    </div>
    <div>
        <strong>Documenti</strong>
        <ul>
            <li><strong>Elenco Documenti:</strong> Gestione dei file caricati in memoria (LocalStorage).</li>
            <li><strong>Documenti Esempio:</strong> Carica rapidamente testi predefiniti per testare il sistema.</li>
        </ul>
    </div>
    <div>
        <strong>Gestione Dati</strong>
        <ul>
            <li><strong>Elenco Dati Archiviati:</strong> Panoramica tecnica di tutte le chiavi e dimensioni dei dati salvati.</li>
            <li><strong>Cancella Dati:</strong> Strumento per la pulizia selettiva o totale dello storage del browser.</li>
        </ul>
    </div>
    <div>
        <strong>Gestione API Key</strong>
        <ul>
            <li><strong>Privacy e Sicurezza:</strong> Le tue chiavi API sono memorizzate esclusivamente nel database <strong>IndexedDB</strong> del tuo browser. Non vengono mai inviate a server intermedi; la comunicazione avviene direttamente tra il tuo browser e il provider AI (Google, Mistral, OpenRouter).</li>
            <li><strong>Multi-Key Support:</strong> Puoi salvare più chiavi per lo stesso provider (es. "Personale", "Lavoro") e passare dall'una all'altra istantaneamente selezionando il relativo indicatore di stato (pallino) nella tabella delle chiavi.</li>
            <li><strong>Esportazione/Importazione:</strong> Il sistema permette di gestire le chiavi in modo granulare, con la possibilità di visualizzare, eliminare o aggiornare ogni singola entry.</li>
        </ul>
    </div>
    <div>
        <strong>Sessione</strong>
        <ul>
            <li><strong>Logout:</strong> Termina la sessione utente e torna alla pagina di login.</li>
        </ul>
    </div>
</div>
`;


/**
 * HTML per il README tecnico.
 * Spiega la filosofia del progetto e l'uso di BM25 invece degli embeddings.
 */
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
            <li><strong>Efficienza in Ambiente Browser:</strong> La creazione di un indice BM25 è un'operazione computazionalmente molto più snella rispetto alla generazione di embeddings per l'intero corpus. Questo rende il sistema reattivo e praticabile anche su macchine con risorse limitate.</li>
            <li><strong>Interpretabilità del "Retrieval":</strong> I risultati sono direttamente interpretabili: i documenti vengono recuperati in base alla presenza e rarità delle parole della query.</li>
            <li><strong>Precisione Lessicale:</strong> BM25 eccelle nel trovare corrispondenze esatte, ideale per query tecniche, nomi propri o codici specifici.</li>
        </ul>
    </div>

    <div>
        <strong>Svantaggi e Compromessi Teorici</strong>
        <ul>
            <li><strong>Mancanza di Comprensione Concettuale:</strong> Il sistema non coglie sinonimi o relazioni concettuali senza sovrapposizione di termini (es. non collega "auto" a "veicolo" se non esplicitamente presenti).</li>
            <li><strong>Dipendenza dalla Qualità della Query:</strong> L'effettività della ricerca è legata alla scelta delle parole nella domanda, che dovrebbero riflettere il linguaggio usato nei documenti.</li>
        </ul>
    </div>

    <div>
        <strong>Conclusione: Un RAG Pragmatico per il Client-Side</strong>
        <p>
            RagIndex sacrifica la potenza della ricerca semantica in favore di privacy, velocità e leggerezza. Affida al solo LLM finale il compito di "comprendere" il significato del contesto recuperato lessicalmente, dimostrando come i principi del RAG possano essere adattati a contesti con risorse limitate senza rinunciare alla precisione.
        </p>
    </div>
</div>
`;




/**
 * HTML per il QuickStart.
 * Guida l'utente attraverso il flusso operativo 1-2-3.
 */
export const help2_html = `
<div class="text">
    <p class="center">Guida Rapida: Il Flusso di Lavoro in 3 Azioni</p>
    <p>
        RagIndex segue un flusso lineare e intuitivo basato su tre fasi numerate. Ecco come procedere:
    </p>

    <div class="step">
        <strong style="color: #ff5252;">(1) Fase 1: Creazione Knowledge Base (KB)</strong>
        <p>In questa fase il sistema analizza i tuoi documenti e crea l'indice di ricerca.</p>
        <ul>
            <li><strong>Input:</strong> Carica i file (PDF, TXT, DOCX) con l'icona <strong>Nuvola</strong> oppure usa <strong>"Documenti Esempio"</strong> nel menu.</li>
            <li><strong>Azione:</strong> Clicca il pulsante rosso <span style="font-weight: bold;">(1)</span>.</li>
            <li><strong>Risultato:</strong> Vedrai lo stato di avanzamento nel Log. Una volta terminato, il sistema è pronto a rispondere ai tuoi documenti.</li>
        </ul>
    </div>

    <hr>

    <div class="step">
        <strong style="color: #ffb74d;">(2) Fase 2: Inizia Conversazione</strong>
        <p>In questa fase il sistema estrae il contesto pertinente alla tua domanda.</p>
        <ul>
            <li><strong>Input:</strong> Scrivi la tua domanda nel campo di testo in basso.</li>
            <li><strong>Azione:</strong> Clicca il pulsante arancione <span style="font-weight: bold;">(2)</span> (o premi Invio).</li>
            <li><strong>Risultato:</strong> Il sistema cercherà i frammenti più rilevanti nella KB e li invierà all'AI per generare la risposta.</li>
        </ul>
    </div>

    <hr>

    <div class="step">
        <strong style="color: #81c784;">(3) Fase 3: Continua Conversazione</strong>
        <p>In questa fase puoi approfondire l'argomento senza perdere il filo del discorso.</p>
        <ul>
            <li><strong>Input:</strong> Scrivi nuove domande di approfondimento (es: "Dimmi di più su questo punto").</li>
            <li><strong>Azione:</strong> Clicca il pulsante verde <span style="font-weight: bold;">(3)</span>.</li>
            <li><strong>Risultato:</strong> L'AI risponderà basandosi sulla storia della chat e sul contesto già identificato nella fase 2.</li>
        </ul>
    </div>

    <hr>

    <div>
        <strong>Nota Importante sulle API Key</strong>
        <p>Assicurati di aver configurato almeno una chiave in <strong>Menu > Gestisci API Key</strong> prima di iniziare. La chiave è salvata localmente nel tuo browser per garantirti la massima privacy.</p>
    </div>
</div>
`;