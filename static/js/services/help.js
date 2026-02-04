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
            <li><strong>Gestisci API Key:</strong> Apre il pannello avanzato per la gestione delle chiavi AI. Puoi aggiungere più chiavi per ogni provider, assegnare nomi mnemonici (es. "Lavoro", "Personale"), visualizzare le chiavi esistenti e selezionare quale impostare come "Attiva" per le tue conversazioni.</li>
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
    <p class="center">Quickstart: Il Flusso di Lavoro a 3 Azioni</p>
    <p>
        Segui questi tre passi per interagire con i tuoi documenti in pochi secondi.
    </p>

    <!-- Configurazione -->
    <div>
        <strong>0. Configurazione delle API Key (Preliminare)</strong>
        <p>Prima di iniziare, assicurati di aver configurato una chiave API valida per il provider che desideri utilizzare.</p>
        <ul>
            <li>Apri il <strong>Menu Laterale</strong> (icona hamburger in alto a sinistra).</li>
            <li>Seleziona <strong>Gestisci API Key</strong>.</li>
            <li>Scegli il provider (es. Gemini, Groq, Mistral), assegna un nome alla chiave e incolla il codice segreto.</li>
            <li>Clicca <strong>Aggiungi</strong>. La chiave apparirà nella tabella sottostante.</li>
            <li>Assicurati che il selettore (pallino) sia attivo sulla chiave che intendi usare.</li>
        </ul>
    </div>

    <hr>

    <!-- Azione 1 -->
    <div>
        <strong>1. Crea Knowledge Base (Azione 1)</strong>
        <p>Trasforma i documenti in una base di conoscenza interrogabile.</p>
        <ol>
            <li><strong>Carica i file:</strong> Usa il pulsante <strong>"Upload file"</strong> (icona nuvola) o scegli <strong>"Documenti Esempio"</strong> dal menu.</li>
            <li><strong>Elabora:</strong> Clicca il pulsante rosso <span style="color: #ff5252; font-weight: bold;">(1)</span>. Il sistema genererà i frammenti (chunks) e l'indice di ricerca in IndexedDB.</li>
        </ol>
    </div>

    <hr>

    <!-- Azione 2 -->
    <div>
        <strong>2. Inizia Conversazione (Azione 2)</strong>
        <p>Estrai il contesto e ottieni la prima risposta.</p>
        <ol>
            <li><strong>Chiedi:</strong> Scrivi la tua domanda nel campo di input in basso.</li>
            <li><strong>Ricerca:</strong> Clicca il pulsante arancione <span style="color: #ffb74d; font-weight: bold;">(2)</span> o premi <strong>Invio</strong>. Il sistema cercherà i pezzi di testo più rilevanti e li invierà all'AI.</li>
        </ol>
    </div>

    <hr>

    <!-- Azione 3 -->
    <div>
        <strong>3. Continua Conversazione (Azione 3)</strong>
        <p>Approfondisci l'argomento mantenendo il contesto.</p>
        <ol>
            <li><strong>Dialoga:</strong> Scrivi nuove domande di approfondimento.</li>
            <li><strong>Risposta:</strong> Clicca il pulsante verde <span style="color: #81c784; font-weight: bold;">(3)</span>. L'AI risponderà tenendo conto di tutto quello che vi siete detti e del contesto già estratto.</li>
        </ol>
    </div>

    <hr>

    <div>
        <strong>Suggerimenti per la Gestione</strong>
        <ul>
            <li>Usa il <strong>Menu Laterale</strong> per archiviare KB o Conversazioni: verranno salvate permanentemente nel browser.</li>
            <li>Puoi ispezionare i frammenti di testo recuperati cliccando su <strong>Conversazione > Visualizza Contesto</strong>.</li>
            <li>La sezione <strong>Gestione Dati > Elenco Dati Archiviati</strong> ti permette di monitorare lo spazio occupato in IndexedDB.</li>
        </ul>
    </div>
</div>
`;