/** @format */

"use strict";

export function splitText(text, minChunkSize, maxChunkSize) {

  function findSplitPoint(segment, minSize, maxSize) {
    if (segment.length <= maxSize) {
      return segment.length;
    }

    // Cerca punteggiatura forte nel range consentito
    let candidate = segment.lastIndexOf(".", maxSize);
    if (candidate < minSize) candidate = -1;

    if (candidate === -1) {
      candidate = segment.lastIndexOf("?", maxSize);
      if (candidate < minSize) candidate = -1;
    }

    if (candidate === -1) {
      candidate = segment.lastIndexOf("!", maxSize);
      if (candidate < minSize) candidate = -1;
    }

    if (candidate !== -1) {
      return candidate + 1; // includo il carattere di punteggiatura
    }

    // fallback: ultima parola intera prima del max
    candidate = segment.lastIndexOf(" ", maxSize);
    if (candidate < minSize) candidate = -1;

    if (candidate === -1) {
      return maxSize;
    }

    return candidate;
  }

  const chunks = [];
  let start = 0;
  const n = text.length;

  while (start < n) {
    const remaining = text.substring(start);

    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining.trim());
      break;
    }

    const splitIdx = findSplitPoint(remaining, minChunkSize, maxChunkSize);
    chunks.push(remaining.substring(0, splitIdx).trim());
    start += splitIdx;
  }

  // gestione ultimo chunk troppo corto
  if (chunks.length > 1 && chunks[chunks.length - 1].length < minChunkSize) {
    const last = chunks.pop();
    const prev = chunks.pop();
    const combined = (prev + " " + last).trim();
    const mid = Math.floor(combined.length / 2);

    // cerca punteggiatura vicino al centro
    let leftSplit = Math.max(combined.lastIndexOf(".", mid), combined.lastIndexOf("?", mid), combined.lastIndexOf("!", mid));

    if (leftSplit === -1) {
      leftSplit = combined.lastIndexOf(" ", mid);
    }

    if (leftSplit === -1) {
      leftSplit = mid;
    }

    const chunk1 = combined.substring(0, leftSplit + 1).trim();
    const chunk2 = combined.substring(leftSplit + 1).trim();

    if (chunk1 && chunk2) {
      chunks.push(chunk1, chunk2);
    } else {
      chunks.push(combined);
    }
  }

  return chunks;
}
