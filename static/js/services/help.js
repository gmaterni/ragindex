/** @format */
"use strict";

/**
 * HTML per la finestra di aiuto dei comandi (Help).
 * Descrive l'architettura, la logica di funzionamento e l'interfaccia.
 */
export const help0_html = `
<div class="text">
    <p class="center help-title">Elenco Comandi RagIndex</p>

    <p class="center help-subtitle">
        Passa il mouse su ogni comando per un aiuto contestuale.
    </p>

    <div>
        <strong class="help-section-title">Barra Superiore (Header)</strong>
        <div class="help-grid">
            <strong>Icona Menu</strong> <span>Apre il menu laterale con tutte le sezioni (KB, Chat, Dati, API Key, Logout).</span>
            <strong>? (Help)</strong> <span>Apre questa finestra con l'elenco completo dei comandi.</span>
            <strong>Upload</strong> <span>Carica file PDF, DOCX o TXT nella Knowledge Base.</span>
            <strong>LLM</strong> <span>Sceglie il provider AI (Gemini, Mistral, OpenRouter, ecc.) e il modello.</span>
            <strong>Log</strong> <span>Mostra la console tecnica con i messaggi di chunking, ricerca ed errori.</span>
            <strong>Tema</strong> <span>Alterna tra tema scuro e tema chiaro.</span>
        </div>
    </div>

    <hr>

    <div>
        <strong class="help-section-title">Pulsanti di Controllo</strong>
        <div class="help-grid">
            <strong>Cancella Input</strong> <span>Elimina il testo nella casella di input.</span>
            <strong>Copia Output</strong> <span>Copia la risposta dell'AI negli appunti.</span>
            <strong>Avvia (Giallo)</strong> <span>Cerca il contesto nei documenti e invia la prima domanda all'AI.</span>
            <strong>Continua (Verde)</strong> <span>Invia una nuova domanda mantenendo chat e contesto.</span>
        </div>
    </div>

    <hr>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; Informazioni</strong>
        <div class="help-grid">
            <strong>Quick Start</strong> <span>Guida operativa rapida su pipeline, memoria e comandi del menu.</span>
        </div>
    </div>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; Knowledge Base</strong>
        <div class="help-grid">
            <strong>Crea</strong> <span>Genera l'indice di ricerca Lunr BM25 dai documenti caricati.</span>
            <strong>Cancella</strong> <span>Elimina la Knowledge Base attiva e i suoi indici.</span>
            <strong>Archivia</strong> <span>Salva la KB corrente con un nome personalizzato per usi futuri.</span>
            <strong>Gestisci</strong> <span>Elenca, attiva, esporta o elimina le KB archiviate.</span>
            <strong>Ripristina</strong> <span>Carica una KB da un file di backup JSON.</span>
        </div>
    </div>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; Conversazione</strong>
        <div class="help-grid">
            <strong>Visualizza Contesto</strong> <span>Mostra il contenuto estratto usato dall'AI per rispondere.</span>
            <strong>Visualizza Conversazione</strong> <span>Mostra l'intero storico della chat in formato testo.</span>
            <strong>Cancella Contesto</strong> <span>Azzera contesto, prima domanda e tutta la conversazione.</span>
            <strong>Cancella Conversazione</strong> <span>Elimina solo i messaggi successivi alla prima domanda.</span>
            <strong>Archivia</strong> <span>Salva la cronologia della chat corrente con un nome personalizzato.</span>
            <strong>Gestisci</strong> <span>Elenca, attiva, esporta o elimina le conversazioni archiviate.</span>
            <strong>Ripristina</strong> <span>Carica una conversazione da un file di backup JSON.</span>
        </div>
    </div>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; Gestione Dati</strong>
        <div class="help-grid">
            <strong>Elenco Documenti</strong> <span>Mostra i file caricati con opzioni di visualizzazione ed eliminazione.</span>
            <strong>Dati Archiviati</strong> <span>Mostra tutti i dati in IndexedDB: chunk, indici, contesto e thread.</span>
            <strong>Reset</strong> <span>Cancella ogni dato: KB, contesto, conversazioni, documenti e chiavi.</span>
        </div>
    </div>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; API Key</strong>
        <div class="help-grid">
            <strong>API Keys Default</strong> <span>Ripristina le chiavi API predefinite dal file api_x.json.</span>
            <strong>Gestisci API Key</strong> <span>Aggiungi, attiva o elimina le tue chiavi API personali.</span>
        </div>
    </div>

    <div>
        <strong class="help-section-title">Menu Laterale &mdash; Sistema</strong>
        <div class="help-grid-last">
            <strong>Logout</strong> <span>Esci dall'applicazione e torna alla schermata di login.</span>
        </div>
    </div>
</div>
`;


/**
 * HTML per il QuickStart.
 * Guida passo-passo al flusso completo.
 */
export const help2_html = `
<div class="text">
    <p class="center help-title">Guida Passo-Passo</p>

    <div>
        <strong class="help-phase-1">Fase 1 &mdash; Caricare i Documenti</strong>
        <p>Premi il pulsante <strong>Upload</strong> (icona nuvola) nella barra superiore. Puoi caricare file PDF, DOCX e TXT, anche pi&ugrave; alla volta. I file vengono elaborati subito nel browser.</p>
    </div>

    <div>
        <strong class="help-phase-1">Fase 2 &mdash; Creare la Knowledge Base</strong>
        <p>Apri il <strong>menu laterale</strong> (icona hamburger in alto a sinistra) e vai su <strong>Knowledge Base &gt; Crea</strong>. Avvia l'indicizzazione: il sistema esegue il chunking Parent-Child e crea l'indice Lunr BM25 sui tuoi documenti.</p>
        <p><em>Nota:</em> Dopo ogni nuovo caricamento devi rieseguire questo passaggio per aggiornare l'indice.</p>
    </div>

    <div>
        <strong class="help-phase-2">Fase 3 &mdash; Avviare la Conversazione</strong>
        <p>Premi il pulsante giallo <strong>Avvia Conversazione</strong>. Il sistema cerca nella KB i frammenti pi&ugrave; rilevanti per la tua domanda, li inietta nel prompt e interroga l'AI. Questa &egrave; la prima risposta.</p>
    </div>

    <div>
        <strong class="help-phase-3">Fase 4 &mdash; Continuare il Dialogo</strong>
        <p>Per ogni domanda successiva premi il pulsante verde <strong>Continua Dialogo</strong>. La cronologia della chat e il contesto estratto vengono mantenuti.</p>
    </div>

    <hr>

    <p class="center help-title">Gestione &mdash; Menu Laterale</p>

    <div>
        <strong>Knowledge Base</strong>
        <ul>
            <li><strong>Archivia</strong>: Salva la KB corrente con un nome per riutilizzarla in futuro.</li>
            <li><strong>Gestisci</strong>: Elenca, attiva, esporta (backup JSON) o elimina le KB archiviate.</li>
            <li><strong>Ripristina</strong>: Carica una KB da un file JSON salvato in precedenza.</li>
            <li><strong>Cancella</strong>: Elimina la KB attiva e i suoi indici.</li>
        </ul>
    </div>

    <div>
        <strong>Conversazione</strong>
        <ul>
            <li><strong>Visualizza Contesto</strong>: Mostra i frammenti di documento usati dall'AI per la risposta.</li>
            <li><strong>Visualizza Conversazione</strong>: Mostra l'intero storico della chat in formato testo.</li>
            <li><strong>Cancella Contesto</strong>: Azzera tutto (contesto, prima domanda, cronologia).</li>
            <li><strong>Cancella Conversazione</strong>: Elimina solo i messaggi successivi alla prima domanda.</li>
            <li><strong>Archivia / Gestisci / Ripristina</strong>: Come per la KB, per salvare e riprendere chat.</li>
        </ul>
    </div>

    <div>
        <strong>Gestione Dati</strong>
        <ul>
            <li><strong>Elenco Documenti</strong>: Vedi e cancella i file caricati.</li>
            <li><strong>Dati Archiviati</strong>: Mostra tutto ci&ograve; che c'&egrave; in IndexedDB.</li>
            <li><strong>Reset</strong>: Elimina ogni dato (KB, chat, documenti, chiavi). L'app torna allo stato iniziale.</li>
        </ul>
    </div>

    <div>
        <strong>API Key</strong>
        <ul>
            <li><strong>API Keys Default</strong>: Ripristina le chiavi predefinite da <code>api_x.json</code>.</li>
            <li><strong>Gestisci API Key</strong>: Aggiungi, attiva o elimina le tue chiavi personali.</li>
        </ul>
    </div>

    <div>
        <strong>Sistema</strong>
        <ul>
            <li><strong>Logout</strong>: Esci e torna alla schermata di login.</li>
        </ul>
    </div>
</div>
`;
