#!/usr/bin/env python3
# coding: utf-8
"""
Analizza i file di chunk e annotazioni per fornire statistiche sulle dimensioni.

Questo script scansiona una directory contenente file di testo, dove ogni file
contiene una serie di chunk strutturati con il loro testo e le relative annotazioni.
Per ogni file, calcola e stampa la lunghezza del testo e dell'annotazione di ogni
chunk, e alla fine elenca i 5 chunk con il testo più lungo.
"""
import argparse
import re
from pathlib import Path


def analyze_chunk_file(file_path: Path):
    """
    Analizza un singolo file, estraendo e calcolando le dimensioni dei chunk
    e delle annotazioni, e identificando i chunk incompleti.
    """
    print(f"\n{file_path.name}")
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Errore durante la lettura del file {file_path.name}: {e}")
        return

    # 1. Trova tutti i blocchi di testo e di annotazione separatamente
    text_pattern = re.compile(r'<<<id=(\d+)>>>(.*?)<<<te>>>', re.DOTALL)
    annotation_pattern = re.compile(r'<<<a=(\d+)>>>(.*?)<<<ae>>>', re.DOTALL)

    text_chunks = {m.group(1): m.group(2).strip()
                   for m in text_pattern.finditer(content)}
    annotation_chunks = {m.group(1): m.group(2).strip()
                         for m in annotation_pattern.finditer(content)}

    text_ids = set(text_chunks.keys())
    annotation_ids = set(annotation_chunks.keys())

    # 2. Identifica chunk completi e incompleti
    complete_ids = sorted(list(text_ids.intersection(annotation_ids)), key=int)
    text_only_ids = sorted(list(text_ids - annotation_ids), key=int)
    annotation_only_ids = sorted(list(annotation_ids - text_ids), key=int)

    if not text_chunks and not annotation_chunks:
        print("Nessun chunk o annotazione trovati nel formato atteso.")
        return

    # 3. Calcola le statistiche per i chunk completi
    chunk_stats = []
    print(f"Trovati {len(complete_ids)} chunk.")

    for chunk_id in complete_ids:
        text_content = text_chunks[chunk_id]
        annotation_content = annotation_chunks[chunk_id]

        chunk_stats.append({
            "id": chunk_id,
            "text_len_chars": len(text_content),
            "annotation_len_chars": len(annotation_content),
            "text_len_words": len(text_content.split()),
            "annotation_len_words": len(annotation_content.split())
        })

    if not chunk_stats:
        print("*** Nessun chunk completo da analizzare. ERROR")
    else:
        # 4. Mostra i 5 più grandi e i 5 più piccoli
        sorted_chunks_desc = sorted(
            chunk_stats, key=lambda x: x['text_len_chars'], reverse=True)
        
        print("--- 5 Chunk più grandi")
        print("ID | Testo (car/p)      | Annotazione (car/p)")
        print("---|--------------------|---------------------")
        for chunk in sorted_chunks_desc[:5]:
            print(
                f"{chunk['id']:>2} | {chunk['text_len_chars']:<4} ({chunk['text_len_words']:<3})        | {chunk['annotation_len_chars']:<4} ({chunk['annotation_len_words']:<3})")

        sorted_chunks_asc = sorted(chunk_stats, key=lambda x: x['text_len_chars'])
        print("--- 5 Chunk più piccoli")
        print("ID | Testo (car/p)      | Annotazione (car/p)")
        print("---|--------------------|---------------------")
        for chunk in sorted_chunks_asc[:5]:
            print(
                f"{chunk['id']:>2} | {chunk['text_len_chars']:<4} ({chunk['text_len_words']:<3})        | {chunk['annotation_len_chars']:<4} ({chunk['annotation_len_words']:<3})")

    # 5. Mostra i chunk incompleti
    if text_only_ids or annotation_only_ids:
        print("*** Rilevati Chunk Incompleti ERROR")
        if text_only_ids:
            print(f"solo testo : {', '.join(text_only_ids)}")
        if annotation_only_ids:
            print(f"solo annotazione: {', '.join(annotation_only_ids)}")


def analyze_chunks_in_directory(directory: str):
    """
    Scansiona una directory e analizza ogni file .txt trovato.
    """
    input_path = Path(directory)
    if not input_path.is_dir():
        print(
            f"Errore: La directory '{directory}' non esiste o non è una directory.")
        return

    print(f"Scansione della directory: {input_path}")

    text_files = list(input_path.glob('*.txt'))
    if not text_files:
        print("Nessun file .txt trovato nella directory.")
        return

    for file_path in sorted(text_files):
        analyze_chunk_file(file_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Analizza i file di chunk e annotazioni in una directory."
    )
    parser.add_argument(
        "-i", "--input_dir",
        required=True,
        help="Directory contenente i file .txt da analizzare."
    )
    args = parser.parse_args()

    analyze_chunks_in_directory(args.input_dir)
