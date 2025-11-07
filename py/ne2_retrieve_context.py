#!/usr/bin/env python3
# coding: utf-8
"""
FASE 4: Ricerca Avanzata e Creazione Contesto Dinamico

Questo script implementa la fase di recupero ad ampio raggio (recall-oriented).
Utilizza un approccio di ricerca lessicale avanzato (BM25+ e Query Expansion)
e, soprattutto, implementa una logica di recupero dinamico per massimizzare
la quantità di informazioni potenzialmente pertinenti da passare alla successiva
fase di re-ranking con LLM.

LOGICA DI RECUPERO DINAMICO:
Invece di recuperare un numero fisso di chunk (es. top 5), questo script:
1. Calcola i punteggi di pertinenza per tutti i chunk del corpus.
2. Li ordina dal più pertinente al meno pertinente.
3. Scorre la lista e accumula i chunk uno per uno, sommando la lunghezza
   del loro testo.
4. Si ferma non appena si raggiunge una soglia massima di caratteri (es. 100k),
   garantendo che il contesto generato sia il più grande possibile pur
   rimanendo nei limiti della finestra di contesto dell'LLM di re-ranking.
"""
import argparse
import json
import math
from collections import Counter
from pathlib import Path

import spacy

from ualib.utils import load_file, save_file

# Carica un modello spaCy per l'italiano, disabilitando i componenti non necessari
# per migliorare le prestazioni, dato che ci servono solo tokenizzazione e lemmatizzazione.
try:
    nlp = spacy.load("it_core_news_sm", disable=["parser", "ner"])
except OSError:
    print("Modello spaCy 'it_core_news_sm' non trovato.")
    print("Esegui: python -m spacy download it_core_news_sm")
    exit(1)


def spacy_tokenize(text: str) -> list[str]:
    """
    Utilizza spaCy per una tokenizzazione e lemmatizzazione di alta qualità.
    - Converte in minuscolo.
    - Rimuove stop words, punteggiatura e spazi.
    - Restituisce i lemmi (forme base) delle parole.
    """
    doc = nlp(text.lower())
    tokens = [
        token.lemma_ for token in doc
        if not token.is_stop and not token.is_punct and not token.is_space and len(token.lemma_) > 2
    ]
    return tokens

# --- Parametri di Ricerca ---
# K1: Controlla la saturazione della frequenza del termine (TF). Valori più alti
#     significano che la frequenza di un termine in un documento deve essere
#     molto più alta per avere un impatto significativo sullo score.
K1 = 1.5
# B: Controlla l'impatto della lunghezza del documento. B=0.75 è un valore standard.
#    Se B=1, la normalizzazione della lunghezza è massima. Se B=0, non c'è normalizzazione.
B = 0.75
# DELTA: Componente aggiuntiva di BM25+ che garantisce un punteggio minimo
#        anche per termini con TF basso, evitando che vengano completamente ignorati.
DELTA = 1.0

# --- Parametri per Query Expansion ---
# QE_TOP_K_DOCS: Numero di documenti top da cui estrarre i termini per l'espansione.
QE_TOP_K_DOCS = 5
# QE_TOP_M_TERMS: Numero di termini migliori da aggiungere alla query originale.
QE_TOP_M_TERMS = 3
# QE_TERM_WEIGHT: Peso da assegnare ai termini aggiunti durante l'espansione.
#                 Un peso inferiore a 1.0 assicura che i termini originali
#                 della query rimangano più importanti.
QE_TERM_WEIGHT = 0.2

# --- COSTANTE PER IL CONTESTO DINAMICO ---
# Imposta la dimensione massima in caratteri del contesto da generare.
# Questo valore deve essere calibrato in base alla finestra di contesto
# del modello LLM che verrà utilizzato nella fase successiva.
MAX_CONTEXT_CHARS = 100000


def calculate_bm25_plus_scores(query_terms, inverted_index, documents, doc_lengths, avg_doc_length, num_docs):
    """
    Calcola i punteggi BM25+ per ogni documento (chunk) nel corpus.

    Args:
        query_terms (list): Lista di token della query (possono essere tuple (term, weight)).
        inverted_index (dict): L'indice invertito.
        documents (dict): Dizionario che mappa doc_id al testo del chunk.
        doc_lengths (dict): Dizionario che mappa doc_id alla lunghezza (in token) del chunk.
        avg_doc_length (float): Lunghezza media dei documenti nel corpus.
        num_docs (int): Numero totale di documenti.

    Returns:
        Counter: Un contatore con i punteggi BM25+ per ogni doc_id.
    """
    scores = Counter()
    # Standardizza la query in una lista di tuple (termine, peso)
    weighted_query = []
    for item in query_terms:
        if isinstance(item, tuple):
            weighted_query.append(item)
        else:
            # Assegna peso 1.0 ai termini della query originale
            weighted_query.append((item, 1.0))

    # Itera su ogni termine della query pesata
    for term, weight in weighted_query:
        if term not in inverted_index:
            continue  # Salta i termini non presenti nell'indice

        # Recupera la posting list (lista di doc_id che contengono il termine)
        posting_list = inverted_index[term]
        doc_freq = len(posting_list)

        # Calcola l'IDF (Inverse Document Frequency), che misura l'importanza di un termine.
        # Termini rari hanno un IDF più alto.
        idf = math.log(1 + (num_docs - doc_freq + 0.5) / (doc_freq + 0.5))

        # Itera su ogni documento che contiene il termine
        for doc_id in posting_list:
            doc_text = documents[doc_id]
            # Calcola il TF (Term Frequency) grezzo
            tf = doc_text.lower().split().count(term)
            doc_len = doc_lengths[doc_id]

            # Formula centrale di BM25 per calcolare il punteggio del termine nel documento
            numerator = tf * (K1 + 1)
            denominator = tf + K1 * (1 - B + B * (doc_len / avg_doc_length))
            term_score = idf * (numerator / denominator)

            # Applica il peso della query e il boost DELTA (specifico di BM25+)
            scores[doc_id] += weight * (term_score + DELTA)
    return scores


def get_expansion_terms(top_docs_content, original_query_tokens, inverted_index, num_docs):
    """
    Estrae termini pertinenti dai documenti con il punteggio più alto per espandere la query.
    Questo processo è noto come "pseudo relevance feedback".

    Args:
        top_docs_content (list): Lista dei testi dei documenti top.
        original_query_tokens (list): Token della query originale.
        inverted_index (dict): L'indice invertito.
        num_docs (int): Numero totale di documenti.

    Returns:
        list: Una lista dei migliori termini da aggiungere alla query.
    """
    term_candidates = Counter()
    # Raccoglie tutti i token dai documenti top
    for doc_text in top_docs_content:
        tokens = spacy_tokenize(doc_text)
        term_candidates.update(tokens)

    # Rimuove i termini già presenti nella query originale per evitare ridondanza
    for token in original_query_tokens:
        if token in term_candidates:
            del term_candidates[token]

    # Calcola un punteggio (TF*IDF) per ogni termine candidato
    term_scores = {}
    for term, tf in term_candidates.items():
        if term in inverted_index:
            doc_freq = len(inverted_index[term])
            idf = math.log(1 + (num_docs - doc_freq + 0.5) / (doc_freq + 0.5))
            term_scores[term] = tf * idf

    # Ordina i termini per punteggio e restituisce i migliori M
    sorted_terms = sorted(term_scores.items(),
                          key=lambda item: item[1], reverse=True)
    return [term for term, score in sorted_terms[:QE_TOP_M_TERMS]]


def retrieve_dynamic_context(query: str, index_file: str, output_file: str):
    """
    Orchestra l'intero processo di ricerca e creazione del contesto dinamico.
    """
    print(f"Caricamento dell'indice da: {index_file}")
    try:
        index_data = json.loads(load_file(index_file))
        documents = index_data["documents"]
        inverted_index = index_data["inverted_index"]
    except (json.JSONDecodeError, KeyError, FileNotFoundError) as e:
        print(
            f"Errore: Il file di indice '{index_file}' è corrotto o non trovato. {e}")
        return

    # Calcoli preliminari necessari per BM25
    num_docs = len(documents)
    doc_lengths = {doc_id: len(spacy_tokenize(text))
                   for doc_id, text in documents.items()}
    avg_doc_length = sum(doc_lengths.values()) / \
        num_docs if num_docs > 0 else 0
    print(f"Indice caricato: {num_docs} documenti.")

    # Normalizza e tokenizza la query dell'utente
    original_query_tokens = spacy_tokenize(query)
    print(f"Query originale tokenizzata: {original_query_tokens}")

    # --- FASE 1: Ricerca iniziale ---
    print("\n--- Passaggio 1: Ricerca iniziale con BM25+ ---")
    initial_scores = calculate_bm25_plus_scores(
        original_query_tokens, inverted_index, documents, doc_lengths, avg_doc_length, num_docs
    )

    # --- FASE 2: Espansione della query (se applicabile) ---
    expanded_query = original_query_tokens
    # Esegui l'espansione solo per query brevi, che beneficiano maggiormente dell'arricchimento
    if len(original_query_tokens) <= 3:
        print(f"\n--- Passaggio 2: Espansione della query ---")
        # Prendi i K documenti migliori dalla ricerca iniziale
        top_k_docs_initial = initial_scores.most_common(QE_TOP_K_DOCS)
        top_docs_content = [documents[doc_id]
                            for doc_id, score in top_k_docs_initial]
        # Estrai i termini di espansione
        expansion_terms = get_expansion_terms(
            top_docs_content, original_query_tokens, inverted_index, num_docs)
        print(f"Termini di espansione trovati: {expansion_terms}")
        # Crea la query espansa, aggiungendo i nuovi termini con un peso ridotto
        expanded_query = original_query_tokens + \
            [(term, QE_TERM_WEIGHT) for term in expansion_terms]
    else:
        print("\n--- Passaggio 2: Query Expansion saltata (query troppo lunga) ---")

    # --- FASE 3: Ricerca finale ---
    print("\n--- Passaggio 3: Ricerca finale con query espansa ---")
    final_scores = calculate_bm25_plus_scores(
        expanded_query, inverted_index, documents, doc_lengths, avg_doc_length, num_docs
    )

    # --- FASE 4: Costruzione del contesto dinamico ---
    print(
        f"\n--- Passaggio 4: Costruzione contesto dinamico (max {MAX_CONTEXT_CHARS} caratteri) ---")

    # Prendi TUTTI i chunk ordinati per punteggio, dal più al meno pertinente
    all_sorted_chunks = final_scores.most_common()

    context_blocks = []
    current_chars = 0
    final_chunk_count = 0

    # Itera sui chunk ordinati e accumulali fino a raggiungere il limite di caratteri
    for doc_id, score in all_sorted_chunks:
        chunk_text = documents.get(doc_id, "")
        chunk_len = len(chunk_text)

        # Condizione di arresto: se l'aggiunta del prossimo chunk supera il limite, fermati.
        # Si controlla anche che almeno un chunk sia stato aggiunto per evitare output vuoti.
        if current_chars + chunk_len > MAX_CONTEXT_CHARS and final_chunk_count > 0:
            print(
                f"Limite di {MAX_CONTEXT_CHARS} caratteri raggiunto. Interrompo l'accumulo.")
            break

        # Formatta il blocco di testo da includere nel contesto finale
        base_doc_name = doc_id.split('-')[0]
        block = f"--- Documento: {base_doc_name}, Chunk: {doc_id}, Score: {score:.4f} ---\n{chunk_text}"
        context_blocks.append(block)

        # Aggiorna i contatori
        current_chars += chunk_len
        final_chunk_count += 1

    print(
        f"Trovati e accumulati {final_chunk_count} chunk pertinenti ({current_chars} caratteri).")

    # Salva il contesto assemblato in un file di output
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    save_file(output_path, "\n\n".join(context_blocks))
    print(f"Contesto di ricerca dinamico salvato in: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Esegue una ricerca avanzata e costruisce un contesto di dimensioni dinamiche.")
    parser.add_argument("-q", "--query", required=True,
                        help="La query dell'utente.")
    parser.add_argument("-i", "--index_file", default="build/index.json",
                        help="Percorso del file JSON dell'indice.")
    parser.add_argument("-o", "--output_file", default="build/context.txt",
                        help="File di output per il contesto dinamico.")
    args = parser.parse_args()

    retrieve_dynamic_context(query=args.query,
                             index_file=args.index_file,
                             output_file=args.output_file)
