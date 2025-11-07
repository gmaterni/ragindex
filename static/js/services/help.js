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
        <strong>TD (Tipo Documento)</strong>
        <p>Permette di selezionare il tipo di documento che si sta analizzando, per ottimizzare l'estrazione delle informazioni.</p>
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
        <p>Cancella la cronologia della conversazione attiva. Non cancella il Contesto né la Knowledge Base.</p>
    </div>
    <div>
        <strong>Nuovo Contesto & Conversazione</strong>
        <p>Cancella il Contesto e la cronologia della conversazione attiva, permettendo di iniziare una nuova analisi da zero.</p>
    </div>

    <hr>

    <!-- Pulsanti di Input -->
    <p class="center">Pulsanti di Input (in basso a destra)</p>
    <div>
        <strong>Pulsante 1 (send0)</strong>
        <p>
            <strong>Creazione Knowledge Base:</strong> Avvia il processo principale di analisi dei documenti caricati per creare una "Knowledge Base" unificata.
        </p>
    </div>
    <div>
        <strong>Pulsante 2 (send1)</strong>
        <p>
            <strong>Creazione Contesto:</strong> Usa la domanda nell'input per estrarre le informazioni pertinenti dalla "Knowledge Base" e creare un "Contesto" specifico.
        </p>
    </div>
    <div>
                    <strong>Pulsante 3 (send2 / Invio)</strong>
                <p>
                    <strong>Conversazione:</strong> Invia la domanda all'LLM usando il "Contesto" creato per continuare o iniziare una conversazione.
                </p>
            </div>
            <div>
                <strong>Cancella Input</strong>
                <p>Cancella il testo inserito nel campo di input.</p>
            </div>
    <hr>

    <!-- Menu Laterale -->
    <p class="center">Menu Laterale</p>
    <div>
        <strong>Informazioni Generali</strong>
        <ul>
            <li><strong>README:</strong> Mostra la documentazione tecnica approfondita.</li>
            <li><strong>QUICKSTART:</strong> Guida rapida all'utilizzo dell'applicazione.</li>
        </ul>
    </div>
    <div>
        <strong>Documenti</strong>
        <ul>
            <li><strong>Elenco Documenti:</strong> Mostra i documenti caricati. Puoi visualizzarli o cancellarli.</li>
            <li><strong>Documenti di esempio:</strong> Carica file di testo di esempio per provare subito l'applicazione.</li>
        </ul>
    </div>
    <div>
        <strong>Configurazione</strong>
        <ul>
            <li><strong>Configurazione:</strong> Mostra la configurazione corrente del Provider LLM e del Tipo Documento selezionato.</li>
            <li><strong>Calcolo Richieste:</strong> Calcola e mostra il numero di parti in cui verranno suddivisi i documenti caricati per la creazione della Knowledge Base, utile per stimare le richieste all'LLM.</li>
        </ul>
    </div>
    <div>
        <strong>Knowledge Base (KnBase)</strong>
        <ul>
            <li><strong>Visualizza:</strong> Mostra la Knowledge Base attuale.</li>
            <li><strong>Archivia:</strong> Salva la Knowledge Base attuale con un nome.</li>
            <li><strong>Elenco:</strong> Carica o elimina le Knowledge Base salvate.</li>
        </ul>
    </div>
    <div>
        <strong>Contesto</strong>
        <ul>
            <li><strong>Visualizza:</strong> Mostra il Contesto attuale.</li>
            <li><strong>Archivia:</strong> Salva il Contesto attuale con un nome.</li>
            <li><strong>Elenco:</strong> Carica o elimina i Contesti salvati.</li>
            <li><strong>Domanda iniziale:</strong> Mostra la domanda utilizzata per creare il Contesto corrente.</li>
            <li><strong>Risposta:</strong> Mostra la risposta generata dall'LLM basata sul Contesto.</li>
        </ul>
    </div>
    <div>
        <strong>Conversazione</strong>
        <ul>
            <li><strong>Visualizza:</strong> Mostra l'intera cronologia della conversazione corrente.</li>
            <li><strong>Archivia:</strong> Salva la conversazione corrente con un nome.</li>
            <li><strong>Elenco:</strong> Carica o elimina le conversazioni archiviate.</li>
        </ul>
    </div>
    <div>
        <strong>Gestione Dati</strong>
        <ul>
            <li><strong>Elenco Dati:</strong> Mostra un riepilogo di tutti i dati salvati nell'applicazione (Knowledge Base, Contesti, Conversazioni, configurazioni).</li>
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

2. Augmentation: Successivamente, il modello integra le informazioni recuperate con eventuali risposte accumulate in precedenza, estraendo nuove informazioni rilevanti e organizzandole in un elenco coerente, evitando ridondanze.

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
    <p class="center">Quickstart: Scenari di Utilizzo</p>
    <p>
        Questa guida ti mostra come usare ragtext in tre scenari principali.
    </p>

    <!-- SCENARIO 1 -->
    <div>
        <strong>Scenario 1: Inizio da Zero</strong>
        <p>
            Parti dai tuoi documenti per creare una nuova Knowledge Base e iniziare una conversazione.
        </p>
        <ol>
            <li><strong>Carica Documenti:</strong> Usa <strong>"Documenti di esempio"</strong> dal menu o <strong>"Upload file"</strong> per caricare i tuoi file.</li>
            <li><strong>Crea Knowledge Base:</strong> Clicca il pulsante <strong>(1)</strong> per analizzare i documenti e creare la <em>Knowledge Base</em>. Al termine, puoi salvarla usando il menu <strong>Knowledge Base > Archivia</strong>.</li>
            <li><strong>Crea Contesto:</strong> Scrivi una domanda specifica nel campo di input e clicca il pulsante <strong>(2)</strong>. Questo estrae le informazioni pertinenti dalla Knowledge Base e crea un <em>Contesto</em>.</li>
            <li><strong>Conversa:</strong> Fai la stessa domanda (o una simile) e premi <strong>Invio</strong> (o il pulsante <strong>(3)</strong>) per avviare la conversazione basata sul Contesto appena creato.</li>
        </ol>
    </div>

    <hr>

    <!-- SCENARIO 2 -->
    <div>
        <strong>Scenario 2: Inizio da una Knowledge Base Esistente</strong>
        <p>
            Usa una <em>Knowledge Base</em> che hai già salvato per iniziare una nuova indagine, senza ri-analizzare i documenti.
        </p>
        <ol>
            <li><strong>Carica Knowledge Base:</strong>
                <ul>
                    <li>Vai nel menu laterale a <strong>Knowledge Base > Elenco</strong>.</li>
                    <li>Trova la base dati che ti interessa e clicca su <strong>"Carica"</strong>.</li>
                </ul>
            </li>
            <li><strong>Crea Contesto:</strong> Scrivi una <strong>nuova domanda</strong> nel campo di input e clicca il pulsante <strong>(2)</strong> per creare un nuovo <em>Contesto</em> specifico per questa domanda.</li>
            <li><strong>Conversa:</strong> Premi <strong>Invio</strong> (o il pulsante <strong>(3)</strong>) per avviare la conversazione.</li>
        </ol>
    </div>

    <hr>

    <!-- SCENARIO 3 -->
    <div>
        <strong>Scenario 3: Inizio da un Contesto Esistente</strong>
        <p>
            Riprendi una conversazione precedente partendo da un <em>Contesto</em> che hai già salvato.
        </p>
        <ol>
            <li><strong>Carica Contesto:</strong>
                <ul>
                    <li>Vai nel menu laterale a <strong>Contesto > Elenco</strong>.</li>
                    <li>Trova il contesto che ti interessa e clicca su <strong>"Carica"</strong>.</li>
                </ul>
            </li>
            <li><strong>Continua la Conversazione:</strong> Scrivi una domanda di approfondimento nel campo di input e premi <strong>Invio</strong> (o il pulsante <strong>(3)</strong>) per continuare la conversazione associata a quel contesto.</li>
        </ol>
    </div>
</div>
`;