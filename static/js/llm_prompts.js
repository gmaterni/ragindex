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


export const promptBuilder = {
    answerPrompt: (context, history) => {
        let systemMessage = "";
        const previousConversation = history.slice(0, -1); // All messages except the last (current user query)
        const currentUserQuery = history[history.length - 1].content; // The current user query

        if (!context) {
            systemMessage = `
# RUOLO
Sei un assistente utile e creativo. Rispondi alle domande dell'utente in modo pertinente, anche se non hai un contesto specifico. Se l'intento non è chiaro, chiedi gentilmente chiarimenti.

# Cronologia Conversazione Precedente
${previousConversation.length > 0 ? previousConversation.map(msg => `${msg.role}: ${msg.content}`).join('\n') : "Nessuna cronologia precedente."}
            `;
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

# Contesto (Fonte Primaria)
\`\`\`text
${context}
\`\`\`

# Cronologia Conversazione Precedente
${previousConversation.length > 0 ? previousConversation.map(msg => `${msg.role}: ${msg.content}`).join('\n') : "Nessuna cronologia precedente."}

# Istruzioni per la Risposta
1. Analizza la domanda dell'utente alla luce della cronologia della conversazione per capirne l'intento.
2. Cerca PRIMA la risposta all'interno del CONTESTO fornito.
3. Se il contesto è sufficiente, formula la risposta basandoti esclusivamente su di esso.
4. Se il contesto è incompleto o mancante:
   - Segnala esplicitamente quali informazioni mancano nel contesto
   - Integra con conoscenza pregressa quando utile, indicando chiaramente che stai facendo riferimento a informazioni esterne al contesto
5. Sintetizza le informazioni in una risposta chiara e naturale, rispettando tutte le regole.
`;
        }
        assembler.messages = [];
        assembler.setSystemMessage(systemMessage);
        assembler.addUserMessage(currentUserQuery);
        return assembler.getMessages();
    },
};