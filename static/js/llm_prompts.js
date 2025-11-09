"use strict";

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
2.  Consolidamento e De-duplicazione: Per ogni entità o evento ricorrente, crea una singola voce nella Knowledge Base. Sintetizza le descrizioni e cita tutte le fonti di provenienza (es. 
    fonti: [doc1, doc2]
    ).
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