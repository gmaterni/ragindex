#!/usr/bin/env python3
# coding: utf-8
"""
FASE 2: Costruzione dell'Indice Invertito

Questo script è il cuore del nostro motore di ricerca lessicale. Il suo compito
è prendere i file di chunk consolidati (prodotti da ne0) e costruire un indice
invertito, che è la struttura dati fondamentale per una ricerca veloce basata
su termini.

Funzionamento:
1.  Scansiona la directory di input, dove ogni file `.txt` rappresenta un
    documento originale e contiene tutti i suoi chunk.
2.  Per ogni file, estrae i singoli chunk basandosi sui tag `<<<id=...>>>`.
3.  Per ogni chunk:
    a.  Crea un ID univoco (es. `nome_documento-001`).
    b.  Salva il testo grezzo del chunk in un dizionario `documents`.
    c.  Normalizza e tokenizza il testo del chunk (minuscolo, rimozione stop words, etc.).
    d.  Aggiorna l'indice invertito: per ogni token, aggiunge l'ID del chunk
        alla lista dei documenti che contengono quel token.
4.  Alla fine, salva due strutture dati in un unico file JSON:
    - `documents`: Un dizionario che mappa `doc_id` al testo del chunk.
    - `inverted_index`: Un dizionario che mappa ogni `token` a una lista di `doc_id`.

Questo indice permetterà di trovare rapidamente quali chunk sono rilevanti per
i termini presenti in una query di ricerca.
"""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

import spacy

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


def build_inverted_index(input_dir: str, output_file: str):
    """
    Scansiona i file di chunk consolidati, estrae testo e annotazioni,
    e costruisce un indice invertito e un dizionario di documenti.
    """
    inverted_index = defaultdict(list)
    documents = {}
    input_path = Path(input_dir)

    print(f"Inizio scansione e indicizzazione da: {input_dir}")

    chunk_files = list(input_path.glob('*.txt'))
    if not chunk_files:
        print(f"Attenzione: nessun file .txt trovato in '{input_dir}'.")
        return

    print(f"Trovati {len(chunk_files)} documenti da indicizzare.")

    # Pattern per catturare ID, testo del chunk e blocco annotazioni
    pattern = re.compile(r'<<<id=(\d+)>>>(.*?)<<<te>>>(.*?)<<<ae>>>', re.DOTALL)

    for file_path in chunk_files:
        print(f"Processo: {file_path.name}")
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Errore nella lettura del file {file_path}: {e}")
            continue

        doc_name = file_path.stem
        matches = list(pattern.finditer(content))
        if not matches:
            print(f"  Attenzione: nessun chunk/annotazione trovato in {file_path.name}")
            continue

        for match in matches:
            chunk_num = match.group(1).zfill(3)
            chunk_text = match.group(2).strip()
            annotation_block = match.group(3).strip()

            doc_id = f"{doc_name}-{chunk_num}"
            documents[doc_id] = chunk_text

            # Estrai KW e EN dal blocco di annotazione
            kws = re.search(r"KW: (.*?)", annotation_block)
            ens = re.search(r"EN: (.*?)", annotation_block)
            
            kw_text = kws.group(1) if kws else ""
            en_text = ens.group(1).replace("[nessuna]", "") if ens else ""

            # Combina testo, keywords ed entità per creare il "super-documento" da indicizzare
            full_text_to_index = f"{chunk_text} {kw_text} {en_text}"

            # Tokenizza il testo combinato e popola l'indice
            tokens = spacy_tokenize(full_text_to_index)
            for token in tokens:
                if doc_id not in inverted_index[token]:
                    inverted_index[token].append(doc_id)

    print(f"\nIndicizzazione completata. L'indice contiene {len(inverted_index)} termini unici.")

    output_data = {
        "documents": documents,
        "inverted_index": inverted_index
    }

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"Indice e documenti salvati con successo in: {output_file}")
    except Exception as e:
        print(f"Errore nel salvataggio dell'indice: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Costruisce un indice invertito dai file di chunk consolidati.")
    parser.add_argument("-i", "--input_dir",
                        required=True,
                        help="Directory di input contenente i file di chunk consolidati (output di ne0)."
                        )
    parser.add_argument("-o", "--output_file",
                        required=True,
                        help="File di output per l'indice JSON (es. build/index.json)."
                        )
    args = parser.parse_args()

    build_inverted_index(input_dir=args.input_dir,
                         output_file=args.output_file)
