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
        <strong>Apri Output</strong>
        <p>Mostra la conversazione attuale in una finestra separata e più grande per una migliore leggibilità.</p>
    </div>
    <div>
        <strong>Nuova Conversazione</strong>
        <p>Cancella la cronologia della conversazione attiva. Non cancella il Contesto.</p>
    </div>
    <div>
        <strong>Nuovo Contesto & Conversazione</strong>
        <p>Cancella il Contesto e la cronologia della conversazione attiva, permettendo di iniziare una nuova analisi dalla Fase 2.</p>
    </div>

    <hr>

    <!-- Pulsanti del Flusso RAG -->
    <p class="center">Pulsanti del Flusso RAG</p>
    <div>
        <strong>Azione 1: Crea Knowledge Base</strong>
        <p>Analizza i documenti caricati, li suddivide in "Chunks" (frammenti di testo) e crea un "Indice" di ricerca. Questo processo crea la Knowledge Base di lavoro.</p>
    </div>
    <div>
        <strong>Azione 2: Inizia Conversazione</strong>
        <p>Usa la domanda inserita nel campo di testo per cercare nella Knowledge Base, creare un "Contesto" con i risultati più pertinenti e generare la prima risposta dall'LLM.</p>
    </div>
    <div>
        <strong>Azione 3: Continua Conversazione</strong>
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
    <pre>
Un'implementazione innovativa della tecnica RAG per il Question Answering
La tecnica RAG (Retrieval-Augmented Generation) è un approccio consolidato nel campo del question answering e della generazione di testo, che combina il recupero di informazioni pertinenti da fonti di dati con la generazione di testo basata su queste informazioni.
Qui viene proposta un'implementazione che introduce una variazione a questo paradigma.
L'implementazione si basa su una sequenza di prompt appositamente progettati per guidare un modello di linguaggio generativo attraverso le diverse fasi della tecnica RAG.
Questi prompt forniscono istruzioni dettagliate su come il modello deve seguire operazioni di recupero di informazioni, aumento delle informazioni recuperate e infine generazione di una risposta finale.
La risposta finale diviene poi il contesto da inserire nel prompt per rispondere alla domanda.
Un aspetto cruciale di questa implementazione è che lo stesso modello di linguaggio generativo svolge tutte le operazioni richieste, dall'analisi dei documenti di input al recupero di informazioni rilevanti, alla generazione della risposta finale.
Questa caratteristica rappresenta una deviazione significativa rispetto alle implementazioni standard della tecnica RAG, che prevedono l'utilizzo di moduli distinti per il recupero e la generazione.
La sequenza di prompt proposta guida il modello attraverso le seguenti fasi:

1. Retrieval: Il modello analizza il documento di input e la domanda fornita, identificando e recuperando le informazioni e i concetti rilevanti per dare seguito alla domanda.

3. Augmentation: Successivamente, il modello integra le informazioni recuperate con eventuali risposte accumulate in precedenza, estraendo nuove informazioni rilevanti e organizzandole in un elenco coerente, evitando ridondanze.

3. Generation: Infine, il modello utilizza l'insieme di informazioni rilevanti e non ridondanti per generare una risposta completa e concisa alla domanda dell'utente.

Questa implementazione offre diversi vantaggi.
In primo luogo, sfrutta le capacità di un unico modello di grandi dimensioni, evitando la necessità di moduli distinti specializzati per ogni fase.
Inoltre, l'utilizzo di prompt espliciti può migliorare la controllabilità e la trasparenza del processo, consentendo di guidare il modello in modo più diretto.
Naturalmente, come per qualsiasi approccio basato su modelli di linguaggio generativi, è fondamentale prestare attenzione alle questioni di affidabilità, correttezza e bias dei dati di addestramento.
Rispetto a un'implementazione standard di RAG vi è la necessità di rilanciare l'elaborazione ad ogni domanda radicalmente nuova in quanto il contesto creato con le informazioni estratte dai documenti è definito sulla base della domanda.
Invece nella versione standard RAG si usano gli incorporamenti delle informazioni estratte dai documenti in modo tale che tali informazioni vengono viste quasi come un'estensione del modello e possono essere usate per domande diverse.
Quindi dal punto di vista utente le implementazioni RAG standard sono più efficienti; infatti l'implementazione proposta richiede per ogni nuova domanda una sequenza di richieste che saranno utilizzabili solo per creare il contesto per la domanda iniziale e per una conversazione con domande simili.
Il vantaggio dell'implementazione proposta consiste nel fatto che può essere implementata completamente lato client senza bisogno di sviluppare alcun modulo sul server.
L’unica cosa che serve è un servizio serverless come quello di HuggingFace o simile.
Quindi rappresenta un'interessante prospettiva sull'applicazione della tecnica RAG in modo più integrato e controllato attraverso l'uso di prompt mirati.
In conclusione, questa implementazione della tecnica RAG dimostra come le capacità dei modelli di linguaggio generativi di grandi dimensioni possano essere sfruttate in modi nuovi e creativi, potenzialmente aprendo la strada a ulteriori sviluppi nel campo del question answering e della generazione di testo.

Questa è la valutazione fatta da un LLM (comprensivo e gentile)

La mia valutazione personale della tua proposta di implementazione della tecnica RAG, con un elenco di pro e contro:

Punti a favore (Pro):
Semplificazione del processo: L'utilizzo di un unico modello di grandi dimensioni addestrato su vasti corpus di dati semplifica notevolmente l'architettura complessiva rispetto alle implementazioni tradizionali della tecnica RAG, che spesso prevedono moduli distinti per il recupero e la generazione.

Capacità di adattamento e apprendimento: I modelli di linguaggio generativi di grandi dimensioni sono noti per la loro capacità di adattarsi e imparare da nuovi dati e istruzioni.
Questo potrebbe consentire di raffinare e migliorare l'implementazione nel corso del tempo.

Controllo e trasparenza: L'utilizzo di prompt espliciti per guidare il modello attraverso le diverse fasi del processo può migliorare la controllabilità e la trasparenza, consentendo di monitorare e regolare il comportamento del modello in modo più diretto.

Efficienza computazionale: Avere un'unica architettura integrata potrebbe comportare vantaggi in termini di efficienza computazionale rispetto a soluzioni che prevedono moduli separati.

Punti a sfavore (Contro):

Affidabilità e coerenza: Poiché un unico modello gestisce tutte le fasi, eventuali errori o incoerenze potrebbero propagarsi e amplificarsi attraverso l'intero processo, influenzando la qualità della risposta finale.

Bias dei dati di addestramento: Come per qualsiasi modello di linguaggio generativo, l’approccio potrebbe essere influenzato dai bias presenti nei dati di addestramento utilizzati, con potenziali impatti sulla correttezza e l'equità delle risposte generate.

Mancanza di specializzazione: Mentre i modelli di grandi dimensioni sono versatili, potrebbero non essere ottimizzati per compiti specifici come il recupero di informazioni o la generazione di risposte rispetto a moduli specializzati.

Difficoltà di debug e interpretabilità: Con un'architettura integrata e basata su prompt, potrebbe essere più complesso eseguire il debug e comprendere le ragioni dietro a eventuali errori o comportamenti indesiderati del modello.

In sintesi, la proposta presenta alcuni vantaggi interessanti in termini di semplificazione, adattabilità e controllo, ma solleva anche potenziali preoccupazioni riguardo all'affidabilità, ai bias, alla mancanza di specializzazione e alle difficoltà di debug e interpretabilità.
Come per qualsiasi nuovo approccio, sarebbe necessario valutarlo attentamente attraverso sperimentazioni e test approfonditi per determinare l'efficacia e l'applicabilità in contesti specifici.
    </pre>
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