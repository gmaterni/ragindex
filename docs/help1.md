
Istruzioni Comandi


Barra Superiore

    Menu Laterale (icona hamburger)
    Apre e chiude il menu laterale con i comandi principali.


    ? (Help)
    Mostra questa finestra con la descrizione dei comandi.


    Upload file
    Apre la finestra per caricare uno o più documenti (PDF, DOCX, TXT) dal tuo computer.


    LLM (Provider/Modello)
    Apre il menu per scegliere il provider AI (es. Gemini, Mistral) e il modello specifico da usare.


    Log
    Attiva o disattiva la finestra di log, utile per vedere le fasi del processo RAG in tempo reale.


    Tema (Sole/Luna)
    Passa dal tema scuro a quello chiaro.





Comandi Finestra di Output (in alto a destra)

    Copia Output
    Copia l'intero contenuto della finestra di output negli appunti.


    Apri Output
    Mostra la conversazione attuale in una finestra separata e più grande per una migliore leggibilità.


    Nuova Conversazione
    Cancella la cronologia della conversazione attiva. Non cancella il Contesto.


    Nuovo Contesto & Conversazione
    Cancella il Contesto e la cronologia della conversazione attiva, permettendo di iniziare una nuova analisi dalla Fase 2.





Pulsanti del Flusso RAG

    Azione 1: Crea Knowledge Base
    Analizza i documenti caricati, li suddivide in "Chunks" (frammenti di testo) e crea un "Indice" di ricerca. Questo processo crea la Knowledge Base di lavoro.


    Azione 2: Inizia Conversazione
    Usa la domanda inserita nel campo di testo per cercare nella Knowledge Base, creare un "Contesto" con i risultati più pertinenti e generare la prima risposta dall'LLM.


    Azione 3: Continua Conversazione
    Invia la nuova domanda e la cronologia della conversazione (con il contesto originale) all'LLM per generare una risposta e continuare il dialogo.


    Cancella Input
    Cancella il testo inserito nel campo di input.




Menu Laterale

    Informazioni
    
        README: Mostra la documentazione tecnica approfondita.
        Quick Start: Guida rapida all'utilizzo dell'applicazione.
        Configurazione: Mostra la configurazione corrente del Provider LLM.
    


    Knowledge Base
    
        Archivia: Salva la Knowledge Base di lavoro corrente con un nome.
        Gestisci: Mostra, carica o elimina le Knowledge Base archiviate.
    


    Conversazione
    
        Visualizza: Mostra l'intera cronologia della conversazione corrente (solo domande e risposte).
        Archivia: Salva la conversazione attiva (contesto + cronologia) con un nome.
        Gestisci: Mostra, carica o elimina le conversazioni archiviate.
        Visualizza Contesto: Mostra il contesto di ricerca attivo in una finestra separata.
    


    Documenti
    
        Elenco Documenti: Mostra i documenti caricati. Puoi visualizzarli o cancellarli.
        Documenti Esempio: Carica file di testo di esempio per provare subito l'applicazione.
    


    Gestione Dati
    
        Elenco Dati Archiviati: Mostra un riepilogo di tutti i dati salvati nell'applicazione (Knowledge Base e Conversazioni).
        Cancella Dati: Permette di cancellare selettivamente o totalmente i dati salvati.
    

