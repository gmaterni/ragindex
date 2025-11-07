/** @format */
"use strict";
// Normalizza in NFKD e rimuove caratteri non ASCII
// const normalizeNfkd = (text) => {
//   return text.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
// };

// Rimuove tag e caratteri speciali
const removeTag = (txt) => {
  return txt.replace(/<<<|>>>|<<|>>|#/g, "");
};

// Rimuove link web HTTP/HTTPS, file locali, markdown e HTML
const removeLinks = (doc) => {
  return doc.replace(/https?:\/\/\S+|file:\/\/\/[^\s]+|\[([^\]]+)\]\([^)]+\)|<a\s+(?:[^>]*?\s+)?href="[^"]*"[^>]*>([^<]+)<\/a>/g, "").trim();
};

// Pulizia testo
const cleanText = (text) => {
  text = text.replace(/`/g, ""); // Rimuove i backtick
  text = text.replace(/(\w+)-\s*\n(\w+)/g, "$1$2"); // Unisce parole divise
  text = text.replace(/[\u00AD\u200B\u200C\u200D\u2060\uFEFF\u0008]/g, ""); // Caratteri non stampabili
  text = text.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\t\r\f\v]/g, " "); // Spazi strani
  text = text.replace(/\\([nrtfb])/g, "$1"); // Escape comuni
  text = text.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/g, "$1"); // Unicode
  text = text.replace(/\\([a-zA-Z]:\\|\\\\[a-zA-Z0-9_]+\\)/g, "\\$1"); // Path
  text = text.replace(/\\/g, ""); // Altri backslash
  text = text.replace(/(.)\1{3,}/g, ""); // Ripetizioni
  text = text.replace(/[“”]/g, '"'); // Virgolette
  text = text.replace(/[’‘‚‛]/g, "'"); // Apostrofi
  text = text.replace(/ +([.,;:!?])/g, "$1"); // Spazi prima di punteggiatura
  text = text.replace(/\s+/g, " "); // Spazi multipli
  text = text.normalize("NFC"); // Normalizzazione NFC
  return text.trim();
};


// export function cleanDocLines(text) {
//   text = removeTag(text);
//   text = removeLinks(text);
//   text = cleanText(text);
//   const pattern = /(?<!\b\w\.)(?<!\b\w\w\.)(?<!\b\w\w\w\.)(?<=[.!?])(?=\s+[A-Z])/;
//   let lines = text.split(pattern);
//   lines = lines.map((s) => s.trim()).filter((s) => s.length > 0);
//   return lines;
// }

export function cleanDoc(text) {
  text = removeTag(text);
  text = removeLinks(text);
  text = cleanText(text);
  const pattern = /(?<!\b\w\.)(?<!\b\w\w\.)(?<!\b\w\w\w\.)(?<=[.!?])(?=\s+[A-Z])/;
  let lines = text.split(pattern);
  lines = lines.map((s) => s.trim()).filter((s) => s.length > 0);
  return lines.join("\n");
}
