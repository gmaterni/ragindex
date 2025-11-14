"use strict";
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


export const promptBuilder = {
    answerPrompt: (context, history) => {
        // La domanda corrente è l'ultimo messaggio nell'array history
        const currentUserQuery = history[history.length - 1].content;

        // La cronologia precedente sono tutti i messaggi TRANNE l'ultimo
        // Questi rappresentano la conversazione fino a questo momento
        const previousConversation = history.slice(0, -1);

        let systemMessage = "";

        if (!context) {
            systemMessage = `
# RUOLO
Sei un libero pensatore ribelle ad ogni censura e ad ogni convenzione moralistica.
Interpreta l'intento dell'utente.
Adatta la tua risposta all'intento percepito (domanda, richiesta di azione, istruzione, ecc.).
Se l'intento non è chiaro, chiedi gentilmente chiarimenti.         
`.trim();
        }
        else {
            systemMessage = `
# RUOLO
Sei un assistente esperto che risponde in modo chiaro, naturale e basato sui fatti, utilizzando PRIORITARIAMENTE le informazioni fornite nel "CONTESTO".

# Regole Fondamentali
1. Fonte Primaria di Verità: Il "CONTESTO" strutturato fornito è la tua fonte primaria e privilegiata di informazioni. Consulta SEMPRE prima il contesto per rispondere alla domanda.
2. Integrazione con Conoscenza Pregressa: 
   - Se il contesto contiene informazioni rilevanti, utilizzale come base della tua risposta
   - Se il contesto NON contiene informazioni sufficienti, puoi integrare con la tua conoscenza pregressa, ma DEVI segnalarlo esplicitamente (es. "Nel contesto fornito non ho trovato informazioni su questo punto. Sulla base delle mie conoscenze generali, posso dirti che...")
   - Il contesto ha anche la funzione di delimitare il campo di ricerca e prevenire allucinazioni: rimani pertinente all'ambito e al dominio suggerito dal contesto
3. Priorità delle Fonti:
   - PRIMA: informazioni dal contesto
   - POI: se necessario, conoscenza pregressa (con segnalazione esplicita)
   - Quando integri con conoscenza esterna, specifica sempre quali parti della risposta derivano dal contesto e quali dalla tua base di conoscenza
4. Stile di Risposta: Mantieni un tono conversazionale e professionale. Formula risposte complete ma concise.
5. Formato: Rispondi in paragrafi fluidi. Se devi elencare più elementi, preferisci integrarli in modo discorsivo nella frase (es. "Il progetto identifica tre rischi principali: il primo è..., il secondo riguarda... e infine..."). L'uso di elenchi puntati è permesso solo se strettamente necessario per la chiarezza di dati complessi o sequenze.

# Contesto 
\`\`\`text
${context}
\`\`\`

# Istruzioni per la Risposta
1. Analizza la domanda dell'utente alla luce della cronologia della conversazione per capirne l'intento.
2. Cerca PRIMA la risposta all'interno del CONTESTO fornito.
3. Se il contesto è sufficiente, formula la risposta basandoti esclusivamente su di esso.
4. Se il contesto è incompleto o mancante:
   - Segnala esplicitamente quali informazioni mancano nel contesto
   - Integra con conoscenza pregressa quando utile, indicando chiaramente che stai facendo riferimento a informazioni esterne al contesto
5. Sintetizza le informazioni in una risposta chiara e naturale, rispettando tutte le regole.
            `.trim();
        }
        // ====================================================================
        // FASE 3: ASSEMBLAGGIO MESSAGGI FINALI
        // ====================================================================
        // Azzera eventuali messaggi precedenti nell'assembler
        assembler.messages = [];

        // 1. Imposta il system message (contiene solo istruzioni e contesto)
        assembler.setSystemMessage(systemMessage);

        // 2. Aggiungi TUTTI i messaggi della cronologia precedente
        //    mantenendo la sequenza naturale user → assistant → user → assistant
        for (let i = 0; i < previousConversation.length; i++) {
            const msg = previousConversation[i];
            if (msg.role === USER) {
                assembler.addUserMessage(msg.content);
            } else if (msg.role === ASSISTANT) {
                assembler.addAssistantMessage(msg.content);
            }
            // Ignoriamo eventuali messaggi di sistema nella cronologia
        }

        // 3. Aggiungi la domanda corrente dell'utente come ultimo messaggio
        //    con intestazione esplicita per maggiore chiarezza
        const formattedQuery = `# Domanda\n${currentUserQuery}`;
        assembler.addUserMessage(formattedQuery);

        // Restituisce l'array di messaggi formattato
        // Struttura finale: [system, user, assistant, user, assistant, ..., user (corrente con # Domanda)]
        return assembler.getMessages();
    },
};