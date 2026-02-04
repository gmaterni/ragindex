/** @format */
"use strict";

// Costanti per le stringhe fisse
export const PROMPT_ANSWER = "# RISPOSTA";
export const PROMPT_CONTEXT = "# CONTESTO:";
export const PROMPT_INITIAL_QUESTION = "## DOMANDA INIZIALE:";

export const QUESTION_PREFIX = "question:";
export const ANSWER_PREFIX = "answer:";
export const ROLE_USER = "user";
export const ROLE_ASSISTANT = "assistant";
export const ROLE_SYSTEM = "system";

export const messages2html = (history) => {
    if (!history || !Array.isArray(history)) return "";
    const lst = [];
    for (const msg of history) {
        if (typeof msg !== 'object' || msg === null || !('role' in msg) || !('content' in msg)) {
            console.error("Malformed history item:", msg);
            continue;
        }
        const role = msg.role;
        let content = msg.content;
        let text = "";
        content = content.replace(/\n{2,}/g, "\n");
        if (role === ROLE_ASSISTANT) {
            // Aggiungere un punto e a capo dopo ogni frase per una migliore leggibilità
            content = content.replace(/\./g, ".\n").replace(/\n{2,}/g, "\n");
            text = `<div class="assistant"><b>Assistant:</b><br>${content}</div>`;
        } else if (role === ROLE_USER) {
            text = `<div class="user"><b>User:</b><br>${content}</div>`;
        } else if (role === ROLE_SYSTEM) {
            text = `<div class="system"><b>System:</b><br>${content}</div>`;
        } else {
            console.error("ERROR in role:", role);
            text = `<div>ERROR ROLE</div>`;
        }
        lst.push(text);
    }
    const html = lst.join("\n");
    return html;
};

export const messages2text = (history) => {
    if (!history || !Array.isArray(history)) return "";
    const lst = [];
    for (const msg of history) {
        if (typeof msg !== 'object' || msg === null || !('role' in msg) || !('content' in msg)) {
            console.error("Malformed history item:", msg);
            continue;
        }
        const role = msg.role;
        let content = msg.content;
        let text = "";
        content = content.replace(/\n{2,}/g, "\n");
        if (role === ROLE_ASSISTANT) {
            text = `Assistant:\n${content.trim()}\n`;
        } else if (role === ROLE_USER) {
            text = `User:\n${content.trim()}`;
        } else if (role === ROLE_SYSTEM) {
            text = `System:\n${content.trim()}`;
        } else {
            console.error("ERROR in role:", role);
            text = `ERROR ROLE`;
        }
        lst.push(text);
    }
    let text = lst.join("\n====================\n");
    text = text.replace(/\n{2,}/g, "\n");
    return text;
};

export const textFormatter = (txt) => {
    if (!txt) return "";
    let plainText = txt.replace(/<[^>]*>/g, "");
    let sentences = plainText.split(/([.!?:])(?=\s|$)/);
    let text = "";
    for (let i = 0; i < sentences.length; i += 2) {
        let sentence = sentences[i];
        let delimiter = sentences[i + 1] || "";
        if (sentence.trim().length > 0) {
            text += "  " + sentence.trim() + delimiter;
            // Aggiunge una nuova riga solo se non è l'ultima frase
            if (i < sentences.length - 2) {
                text += "\n";
            }
        }
    }
    // Sostituisce i pattern User: e Assistant: con formattazione speciale
    text = text.replace(/User:/g, "\n\nUSER:\n");
    text = text.replace(/Assistant:/g, "\n\nASSISTANT:\n");
    return text.trim();
};