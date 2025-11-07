#!/usr/bin/env python3
# coding: utf-8
"""
Questo script fornisce una funzione per controllare la validità dei chunk
contenuti in un file, secondo regole predefinite.
"""

import re
import argparse
from pathlib import Path

# Costanti per i limiti di parole nel testo di un chunk
MIN_WORDS_LIMIT = 50
MAX_WORDS_LIMIT = 100


def check_chunk(file_path) -> bool:
    """
    Verifica tre condizioni:
    1. Non ci sono chunk incompleti (con testo ma senza annotazione o viceversa).
    2. Il numero di parole nel testo di ogni chunk non è inferiore a MIN_WORDS_LIMIT.
    3. Il numero di parole nel testo di ogni chunk non è superiore a MAX_WORDS_LIMIT.
    ue se tutti i chunk sono validi, False altrimenti.
    """
    try:
        path = Path(file_path)
        llm_output_content = path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Errore  file {path.name}: {e}")
        return False
    # 1. Controllo per chunk incompleti (mancanza di testo o annotazione)
    text_ids = set(re.findall(r'<<<id=(\\d+)>>>', llm_output_content))
    annotation_ids = set(re.findall(r'<<<a=(\\d+)>>>', llm_output_content))
    if text_ids != annotation_ids:
        print(
            f"Trovati chunk incompleti. ID Testo: {sorted(list(text_ids))}, ID Annotazioni: {sorted(list(annotation_ids))}")
        return False
    if not text_ids:
        print("Nessun chunk trovato..")
        return True
    # 2. Controllo sulla lunghezza del testo di ogni chunk
    text_pattern = re.compile(r'<<<id=(\\d+)>>>(.*?)<<<te>>>', re.DOTALL)

    for match in text_pattern.finditer(llm_output_content):
        chunk_id = match.group(1)
        text_content = match.group(2).strip()
        word_count = len(text_content.split())

        if word_count < MIN_WORDS_LIMIT:
            print(f" Il chunk ID {chunk_id} ha {word_count} parole.")
            return False
        if word_count > MAX_WORDS_LIMIT:
            print(f" Il chunk ID {chunk_id} ha {word_count} parole).")
            return False
    print("Tutti i controlli  superati con successo.")
    return True


if __name__ == '__main__':
    # Esempio di come utilizzare la funzione da riga di comando per testare un file
    parser = argparse.ArgumentParser(
        description="Esegue il controllo di validità sui chunk contenuti in un file."
    )
    parser.add_argument(
        "-f", "--file_path",
        required=True,
        help="Percorso del file di testo contenente l'output dell'LLM da controllare."
    )
    args = parser.parse_args()
    is_valid = check_chunk(args.file_path)
    print(f"\n{'VALIDO' if is_valid else 'NON VALIDO'}")
