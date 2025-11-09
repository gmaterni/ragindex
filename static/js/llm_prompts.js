"use strict";

// ============================================================================
// TIPI DI DOCUMENTO
// ============================================================================

const DocumentType = {
    NORMATIVI: "normativi",
    PROCEDURALI: "procedurali",
    DOCUMENTALI: "documentali",
    INFORMATIVI: "informativi",
    NARRATIVI: "narrativi",
    ARGOMENTATIVI: "argomentativi",
    ANALITICI: "analitici",
    PROGETTUALI: "progettuali",
};

const STRING_TO_DOC_TYPE = {};
Object.values(DocumentType).forEach((type) => {
    STRING_TO_DOC_TYPE[type] = type;
});

// ============================================================================
// CRITERI DI ESTRAZIONE
// ============================================================================

const EXTRACTION_CRITERIA = {
    [DocumentType.NORMATIVI]: {
        description: "Documenti con valore vincolante che prescrivono comportamenti obbligatori",
        focus: "Massima precisione terminologica - ogni parola può avere valore legale",
        examples: ["regolamento aziendale", "contratto commerciale", "polizza assicurativa", "normativa tecnica", "specifiche API"],
        instructions: [
            "Identifica chi ha poteri specifici e cosa può o deve fare secondo il documento",
            "Estrai ogni obbligo specificando chi deve fare cosa in quali condizioni precise",
            "Registra parametri numerici critici mantenendo valori e unità di misura esatti",
            "Collega ogni violazione alla sua conseguenza specifica dichiarata nel testo",
        ],
    },
    [DocumentType.PROCEDURALI]: {
        description: "Documenti che guidano all'esecuzione corretta di attività specifiche",
        focus: "Sequenza operativa precisa - alterazioni compromettono il risultato",
        examples: ["manuale operativo", "istruzioni assemblaggio", "protocollo medico", "recipe", "guida installazione"],
        instructions: [
            "Estrai la sequenza di azioni nell'ordine corretto con tutti i parametri operativi",
            "Identifica dove e come verificare che il processo stia funzionando correttamente",
            "Registra cosa fare quando qualcosa va storto o non funziona come previsto"
        ],
    },
    [DocumentType.DOCUMENTALI]: {
        description: "Documenti che registrano fatti accaduti per consultazione e tracciabilità",
        focus: "Accuratezza fattuale - distinguere chiaramente fatti da interpretazioni",
        examples: ["verbale riunione", "report incidente", "cartella clinica", "audit report", "log eventi"],
        instructions: [
            "Ordina gli eventi cronologicamente con date, orari e partecipanti identificati",
            "Registra misurazioni e dati quantitativi esatti specificando fonte e contesto di rilevazione",
            "Documenta chi ha preso quali decisioni, quando e per quali motivi dichiarati"
        ],
    },
    [DocumentType.INFORMATIVI]: {
        description: "Documenti che trasmettono informazioni su situazioni ed eventi",
        focus: "Distinzione netta tra fatti riportati e interpretazioni dell'autore",
        examples: ["articolo giornalistico", "report di mercato", "documento informativo", "comunicato stampa"],
        instructions: [
            "Estrai fatti verificabili (chi-cosa-dove-quando) indicando il livello di certezza",
            "Registra collegamenti causa-effetto solo quando presentati come relazioni certe",
            "Identifica le fonti delle informazioni e segnala eventuali limitazioni o bias"
        ],
    },
    [DocumentType.NARRATIVI]: {
        description: "Documenti che raccontano storie ed esperienze attraverso strutture narrative",
        focus: "Struttura narrativa e sviluppo dei personaggi nel loro arco evolutivo",
        examples: ["racconto", "biografia", "caso studio narrativo", "cronaca storica", "testimonianza"],
        instructions: [
            "Identifica la situazione iniziale, lo sviluppo dei conflitti e come si risolve",
            "Estrai i personaggi principali e come cambiano durante la storia",
            "Registra gli eventi che fanno progredire o cambiare direzione alla narrazione"
        ],
    },
    [DocumentType.ARGOMENTATIVI]: {
        description: "Documenti che sostengono tesi attraverso ragionamenti strutturati",
        focus: "Catena logica dell'argomentazione e qualità delle evidenze",
        examples: ["saggio accademico", "documento posizione", "proposta progetto", "analisi critica"],
        instructions: [
            "Identifica la tesi principale che l'autore vuole dimostrare o sostenere",
            "Estrai le prove concrete utilizzate: dati, esempi, citazioni, ragionamenti",
            "Registra le obiezioni che l'autore considera e come tenta di confutarle"
        ],
    },
    [DocumentType.ANALITICI]: {
        description: "Documenti che interpretano dati per identificare pattern e trarre conclusioni",
        focus: "Metodologia utilizzata e solidità delle inferenze dai dati",
        examples: ["studio di mercato", "analisi performance", "valutazione tecnica", "ricerca empirica"],
        instructions: [
            "Definisci cosa viene analizzato, con quali dati e in quale periodo temporale",
            "Estrai i pattern principali e le correlazioni significative identificate",
            "Registra le conclusioni dell'autore specificando il livello di confidenza espresso"
        ],
    },
    [DocumentType.PROGETTUALI]: {
        description: "Documenti che definiscono obiettivi futuri e modalità per raggiungerli",
        focus: "Obiettivi concreti, risorse necessarie e gestione dei rischi",
        examples: ["piano progetto", "proposta tecnica", "business plan", "strategia implementazione"],
        instructions: [
            "Estrai gli obiettivi specifici con scadenze e criteri misurabili di successo",
            "Identifica chi deve fare cosa, con quali risorse e competenze necessarie",
            "Registra i rischi principali e le contromisure previste per mitigarli"
        ],
    },
};

// ============================================================================
// TEMPLATE DI OUTPUT
// ============================================================================

const OUTPUT_TEMPLATES = {
    [DocumentType.NORMATIVI]: `SOGGETTI:
nome: ruolo_funzione | ambito_applicazione | poteri_specifici | status_attivo
REGOLE:
regola_id: descrizione_completa | condizioni_applicazione | conseguenze_obbligatorie | eccezioni_se_presenti
DEFINIZIONI:
termine: significato_nel_contesto | campo_validità | priorità_gerarchica | riferimenti_normativi
PARAMETRI_QUANTITATIVI:
nome_parametro: valore_dichiarato | unità_misura | tolleranze_se_specificate | criticità_operativa
SANZIONI_VIOLAZIONI:
tipo_violazione: descrizione_comportamento | conseguenza_prevista | gravità_relativa | procedure_ricorso
GERARCHIA_NORMATIVA:
norma_citata: relazione_con_presente_documento | tipo_precedenza | condizioni_prevalenza`,
    [DocumentType.PROCEDURALI]: `OBIETTIVO_PROCEDURA:
nome: risultato_atteso | prerequisiti_necessari | output_finale | criticità_operativa
SEQUENZA_AZIONI:
passo_N: descrizione_azione | parametri_operativi | controlli_qualità | punti_attenzione
PUNTI_DECISIONE:
situazione: opzione_A→conseguenze | opzione_B→conseguenze | criteri_scelta | raccomandazioni
RISORSE_NECESSARIE:
elemento: tipo_risorsa | specifiche_tecniche | obbligatorietà | alternative_possibili
RISCHI_OPERATIVI:
scenario_critico: cause_scatenanti | conseguenze_potenziali | azioni_prevenzione | gravità_stimata
CONTROLLI_QUALITÀ:
checkpoint: cosa_verificare | standard_accettazione | azioni_se_non_conforme`,
    [DocumentType.DOCUMENTALI]: `CRONOLOGIA_EVENTI:
momento: descrizione_evento | partecipanti_coinvolti | risultati_ottenuti | documentazione_associata
ENTITÀ_TRACCIATE:
nome_entità: categoria_appartenenza | stato_iniziale | stato_finale | cause_trasformazione
MISURAZIONI_RILEVATE:
parametro: valore_registrato | unità_misura | metodo_rilevazione | affidabilità_dato | anomalie_riscontrate
DECISIONI_PRESE:
decisione: responsabili_decisione | momento_temporale | motivazioni_dichiarate | impatti_previsti
RELAZIONI_IDENTIFICATE:
entità_A__entità_B: natura_relazione | intensità_collegamento | durata_temporale | evidenze_supporto`,
    [DocumentType.INFORMATIVI]: `FATTI_PRINCIPALI:
fatto: descrizione_oggettiva | fonte_informazione | livello_certezza | contesto_rilevante
ATTORI_COINVOLTI:
nome_attore: ruolo_nella_situazione | azioni_compiute | caratteristiche_rilevanti | impatto_generato
CONTESTO_SITUAZIONE:
dimensione_spaziale: luogo_specifico | dimensione_temporale | condizioni_ambientali | background_necessario
RELAZIONI_CAUSALI:
causa_identificata: meccanismo_collegamento | effetto_osservato | evidenze_disponibili | alternative_possibili
IMPATTI_CONSEGUENZE:
categoria_interessata: tipo_effetto | durata_stimata | intensità_impatto | misurabilità
FONTI_INFORMAZIONE:
origine: tipologia_fonte | affidabilità_stimata | possibili_bias | data_pubblicazione`,
    [DocumentType.NARRATIVI]: `STRUTTURA_NARRATIVA:
setup_iniziale: situazione_partenza | personaggi_introdotti | tema_centrale | ambientazione
sviluppo: elementi_complicanti | escalation_tensione | conflitti_emergenti
climax: momento_culminante | decisione_cruciale | punto_svolta
risoluzione: modalità_conclusione | nuovo_equilibrio | significato_emergente
PERSONAGGI:
nome_personaggio: funzione_narrativa | motivazione_principale | evoluzione_carattere | simbolismo_eventuale
EVENTI_SIGNIFICATIVI:
evento: funzione_nella_trama | personaggi_coinvolti | significato_letterale | significato_simbolico
TEMI_RICORRENTI:
tema_simbolo: prima_apparizione | sviluppo_progressivo | risoluzione_finale | significato_complessivo`,
    [DocumentType.ARGOMENTATIVI]: `TESI_CENTRALE:
affermazione_principale: posizione_autore | novità_contributo | campo_disciplinare | portata_affermazione
CATENA_ARGOMENTATIVA:
argomento_N: premesse_dichiarate | inferenza_logica | conclusione_raggiunta | tipo_ragionamento | solidità_stimata
EVIDENZE_SUPPORTO:
evidenza: contenuto_specifico | fonte_origine | peso_argomentativo | tipo_evidenza | limiti_riconosciuti
OBIEZIONI_CONFUTAZIONI:
obiezione: contenuto_critica | fonte_obiezione | risposta_autore | efficacia_confutazione
STRUTTURA_LOGICA:
tipo_argomentazione: coerenza_interna | completezza_trattazione | validità_formale | punti_deboli`,
    [DocumentType.ANALITICI]: `OGGETTO_STUDIO:
target_analisi: definizione_ambito | periodo_considerato | limitazioni_scope | granularità_analisi
METODOLOGIA_APPLICATA:
approccio_usato: tecniche_specifiche | strumenti_utilizzati | dati_base | assunzioni_metodologiche
PATTERN_IDENTIFICATI:
pattern: descrizione_regolarità | frequenza_osservata | robustezza_pattern | possibili_spiegazioni
CORRELAZIONI_RILEVATE:
variabile_A__variabile_B: tipo_relazione | intensità_apparente | direzione_causale_ipotizzata | significatività_apparente
CONCLUSIONI_RAGGIUNTE:
conclusione: inferenza_principale | livello_confidenza | limiti_generalizzazione | raccomandazioni_pratiche
LIMITAZIONI_RICONOSCIUTE:
limite: tipo_limitazione | impatto_su_risultati | tentativi_mitigazione | importanza_relativa`,
    [DocumentType.PROGETTUALI]: `OBIETTIVI_PROGETTO:
obiettivo: descrizione_traguardo | metriche_successo | timeline_prevista | priorità_relativa | responsabile_assegnato
STRATEGIE_IMPLEMENTAZIONE:
strategia: approccio_metodologico | obiettivi_serviti | risorse_richieste | indicatori_progresso
ROADMAP_TEMPORALE:
milestone: deliverable_atteso | data_target | prerequisiti_necessari | criteri_accettazione
RISORSE_RICHIESTE:
risorsa: tipologia | quantità_stimata | costo_previsto | disponibilità_temporale | criticità_progetto
RISCHI_IDENTIFICATI:
rischio: descrizione_minaccia | probabilità_stimata | impatto_potenziale | misure_mitigazione | responsabile_gestione
ASSUNZIONI_CRITICHE:
assunzione: ipotesi_sottostante | probabilità_validità | impatto_se_falsa | modalità_verifica | piano_contingenza`,
};

// ============================================================================
// FUNZIONI HELPER
// ============================================================================

export function getInstructions(docType) {
    const info = getDocumentInfo(docType);
    return info.instructions.join("\n");
}

export function getDescription(docType) {
    const info = getDocumentInfo(docType);
    return info.description;
}

export function getFocus(docType) {
    const info = getDocumentInfo(docType);
    return info.focus;
}

export function getTemplate(docType) {
    if (typeof docType === "string") {
        if (!(docType in STRING_TO_DOC_TYPE)) {
            throw new Error(`Tipo documento non supportato: ${docType}`);
        }
        docType = STRING_TO_DOC_TYPE[docType];
    }
    if (!(docType in OUTPUT_TEMPLATES)) {
        throw new Error(`Tipo documento non supportato: ${docType}`);
    }
    return OUTPUT_TEMPLATES[docType];
}

export function getDocumentInfo(docType) {
    if (typeof docType === "string") {
        if (!(docType in STRING_TO_DOC_TYPE)) {
            throw new Error(`Tipo documento non supportato: ${docType}`);
        }
        docType = STRING_TO_DOC_TYPE[docType];
    }
    return EXTRACTION_CRITERIA[docType];
}

// ============================================================================
// ASSEMBLER MESSAGGI
// ============================================================================

const SYSTEM = "system";
const USER = "user";
const ASSISTANT = "assistant";

const assembler = {
    messages: [],
    setSystemMessage(content) {
        this.messages = this.messages.filter((msg) => msg.role !== SYSTEM);
        const systemMessage = { role: SYSTEM, content: content };
        this.messages.unshift(systemMessage);
        return this;
    },
    addUserMessage(content) {
        const userMessage = { role: USER, content: content };
        this.messages.push(userMessage);
        return this;
    },
    addAssistantMessage(content) {
        const assistantMessage = { role: ASSISTANT, content: content };
        this.messages.push(assistantMessage);
        return this;
    },
    getMessages() {
        const msgs = [...this.messages];
        // elimina etichette del tipo nome:
        for (let i = 0; i < msgs.length; i++)
            msgs[i].content = msgs[i].content.replace(/^(\S+):\s*/g, '');
        return msgs;
    },
    clear() {
        this.messages = [];
        return this;
    }
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

export const promptBuilder = {
    extractionPrompt: (docContent, docType) => {
        const instructions = getInstructions(docType);
        const description = getDescription(docType);
        const focus = getFocus(docType);
        const template = getTemplate(docType);
        const systemMessage = `
# Ruolo
Sei un analista di dati esperto, specializzato nell'estrazione di informazioni strutturate da testi complessi. La tua massima priorità è l'accuratezza e la fedeltà al testo originale.

# Contesto del compito
Il documento che analizzerai è di tipo "${docType}": ${description}.
Il tuo principio guida è: "${focus}".

# Procedura da seguire
Ragiona passo dopo passo per garantire la massima accuratezza.

1.  Analisi Preliminare: Leggi attentamente l'intero documento per comprenderne lo scopo, la struttura e il tono.
2.  Estrazione Guidata: Rileggi il documento applicando le seguenti istruzioni specifiche:
    ${instructions}
3.  Formattazione Finale: Solo dopo aver completato l'analisi, struttura le informazioni estratte utilizzando rigorosamente il formato richiesto.

# Formato Risposta
${template}
`;
        const userMessage = `
# Documento da analizzare
\`\`\`text
${docContent}
\`\`\`
---
Segui la procedura dettagliata per estrarre le informazioni e produrre l'output strutturato. Inizia il tuo ragionamento interno prima di generare il risultato finale.
`;
        assembler.messages = [];
        assembler.setSystemMessage(systemMessage);
        assembler.addUserMessage(userMessage);
        return assembler.getMessages();
    },
    unificationPrompt: (contents, docType) => {
        const template = getTemplate(docType);
        const systemMessage = `
# Ruolo
Sei un sistema esperto di sintesi e consolidamento della conoscenza. Il tuo obiettivo è integrare molteplici frammenti di informazione strutturata in una base di conoscenza (Knowledge Base) unificata, coerente e priva di ridondanze.

# Procedura Dettagliata
Pensa passo dopo passo per eseguire questa unificazione.
1.  Analisi Comparata: Esamina tutti i frammenti di informazione forniti. Identifica le entità (persone, luoghi, concetti) e le relazioni che appaiono in più di un documento.
2.  Consolidamento e De-duplicazione: Per ogni entità o evento ricorrente, crea una singola voce nella Knowledge Base. Sintetizza le descrizioni e cita tutte le fonti di provenienza (es. \`fonti: [doc1, doc2]\`).
3.  Gestione dei Conflitti: Se trovi informazioni contraddittorie tra diverse fonti (es. date diverse per lo stesso evento), non scegliere una versione. Registra l'informazione e descrivi esplicitamente il conflitto.
4.  Sintesi delle Relazioni e Cronologie: Unifica le catene di eventi e le relazioni causali o logiche.
5.  Formattazione Finale: Struttura la conoscenza consolidata usando esclusivamente il formato sottostante.

# Formato risposta
${template}
`;
        const userMessage = `
# Informazioni Strutturate da Unificare
\`\`\`text
${contents}
\`\`\`
---
Segui la procedura dettagliata per unificare queste informazioni in una singola Knowledge Base. Inizia il tuo ragionamento.
`;
        assembler.messages = [];
        assembler.setSystemMessage(systemMessage);
        assembler.addUserMessage(userMessage);
        return assembler.getMessages();
    },
    extractorPrompt: (kbContent, question, docType) => {
        const template = getTemplate(docType);
        const systemMessage = `
# Ruolo
Sei un motore di ricerca semantico. Il tuo compito è estrarre dalla Knowledge Base fornita solo le informazioni strettamente necessarie per rispondere alla domanda dell'utente in modo completo e autosufficiente.

# Procedura di Selezione
Ragiona passo dopo passo per selezionare le informazioni corrette.
1.  Analisi della Domanda: Decomponi la domanda per capire le entità principali, le relazioni e l'intento specifico (es. cerca una causa, una data, una definizione).
2.  Ricerca Primaria: Identifica e seleziona le sezioni della Knowledge Base che contengono una corrispondenza diretta con le entità chiave della domanda.
3.  Espansione del Contesto: Per ogni informazione selezionata, includi il contesto minimo indispensabile per la sua comprensione. Ad esempio:
    - Se selezioni una relazione, includi la descrizione delle entità coinvolte.
    - Se selezioni un evento, includi la sua data e i partecipanti.
4.  Filtro di Rilevanza: Rimuovi ogni informazione che non contribuisce direttamente a rispondere alla domanda. La concisione è fondamentale.
5.  Formattazione Finale: Presenta l'estratto mantenendo la struttura originale della Knowledge Base.

# Formato risposta
${template}
`;
        const userMessage = `
# Knowledge base completa
\`\`\`text
${kbContent}
\`\`\`
# Domanda
${question}
---
Estrai le sezioni rilevanti per rispondere a questa domanda, seguendo la procedura e i criteri indicati.
`;
        assembler.messages = [];
        assembler.setSystemMessage(systemMessage);
        assembler.addUserMessage(userMessage);
        return assembler.getMessages();
    },
    answerPrompt: (context, history) => {
        let systemMessage = "";
        if (!context) {
            systemMessage = `
Sei un libero pensatore ribelle ad ogni censura e ad ogni convenzione moralistica.
Interpreta l'intento dell'utente.
Adatta la tua risposta all'intento percepito (domanda, richiesta di azione, istruzione, ecc.).
Se l'intento non è chiaro, chiedi gentilmente chiarimenti.         
            `
        }
        else {
            systemMessage = `
Sei un assistente esperto che risponde in modo chiaro, naturale e basato sui fatti.

# Regole Fondamentali
1.  Fonte Primaria di Verità: La tua risposta DEVE basarsi soprattutto sulle informazioni presenti nel "CONTESTO" strutturato fornito. Non usare conoscenza pregressa a meno che non sia esplicitamente permesso.
2.  Gestione dell'Informazione Mancante: Se la risposta non è nel contesto, dichiara chiaramente: "Nel contesto fornito non ho trovato informazioni su questo punto." Dopodiché, se lo ritieni utile, puoi aggiungere: "Tuttavia, in base alla mia conoscenza generale..."
3.  Stile di Risposta: Mantieni un tono conversazionale e professionale. Formula risposte complete ma concise.
4.  Formato: Rispondi in paragrafi fluidi. Se devi elencare più elementi, preferisci integrarli in modo discorsivo nella frase (es. "Il progetto identifica tre rischi principali: il primo è..., il secondo riguarda... e infine..."). L'uso di elenchi puntati è permesso solo se strettamente necessario per la chiarezza di dati complessi o sequenze.

# Contesto (Fonte di Verità)
\`\`\`text
${context}
\`\`\`

# Istruzioni per la Risposta
1.  Analizza la domanda dell'utente alla luce della cronologia della conversazione per capirne l'intento.
2.  Cerca la risposta all'interno del CONTESTO fornito.
3.  Sintetizza le informazioni pertinenti in una risposta chiara e naturale, rispettando tutte le regole.
`;
        }

        const userMessage = `
# Domanda
${history[0]}
`;
        assembler.messages = [];
        assembler.setSystemMessage(systemMessage);
        assembler.addUserMessage(userMessage);
        for (let i = 1; i < history.length; i++) {
            if ((i - 1) % 2 === 0) {
                assembler.addAssistantMessage(history[i]);
            } else {
                assembler.addUserMessage(history[i]);
            }
        }
        return assembler.getMessages();
    },
};