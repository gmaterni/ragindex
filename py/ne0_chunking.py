#!/usr/bin/env python3
# coding: utf-8
"""
FASE 0: Chunking dei Documenti Sorgente con spaCy

Versione modificata che usa spaCy invece dell'LLM per creare chunk semantici.
Utilizza l'analisi sintattica per identificare proposizioni complete e coerenti.

Funzionamento:
1. Scansiona la directory di input per i file di testo
2. Pre-processa il testo per migliorare la segmentazione
3. Usa spaCy per dividere in frasi e proposizioni
4. Raggruppa le proposizioni in chunk semanticamente coerenti
5. Salva i risultati mantenendo lo stesso formato di output
"""
import argparse
import logging
import re
from pathlib import Path

import spacy
from spacy.lang.it import Italian

from text_cleaner import clean_doc
from ualib.calc_time_func import calc_time_func
from ualib.utils import load_file, save_file

logger = logging.getLogger(__name__)

# --- Configurazione del Logging ---
log_dir = Path("./log")
log_dir.mkdir(exist_ok=True)
error_log_file = log_dir / "ne0a_chunking_spacy_error.log"

logger.setLevel(logging.INFO)

error_handler = logging.FileHandler(error_log_file)
error_handler.setLevel(logging.ERROR)
error_formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s')
error_handler.setFormatter(error_formatter)
logger.addHandler(error_handler)
# --- Fine Configurazione Logging ---

# Parametri per il chunking semantico
MIN_CHUNK_CHARS = 100  # Minimo caratteri per chunk
MAX_CHUNK_CHARS = 1500  # Massimo caratteri per chunk
TARGET_CHUNK_CHARS = 500  # Dimensione target ideale

print("\n==========================")
print("Chunking con spaCy")
print(
    f"chunk size: {MIN_CHUNK_CHARS}-{MAX_CHUNK_CHARS} (target: {TARGET_CHUNK_CHARS})")
print("==========================\n")

try:
    nlp = spacy.load("it_core_news_lg")
    print("Modello spaCy 'it_core_news_lg' caricato con successo.\n")
except OSError:
    print("Modello 'it_core_news_lg' non trovato. Provo con 'it_core_news_sm'...")
    print("ERRORE: Nessun modello spaCy italiano trovato.")
    print("Installa con: python -m spacy download it_core_news_lg")
    exit(1)


def prepare_text_for_spacy(text: str) -> str:
    """
    Pre-processa il testo per migliorare la segmentazione di spaCy.

    Operazioni:
    - Normalizza spazi multipli
    - Sistema punteggiatura problematica
    - Protegge abbreviazioni comuni
    - Sistema elenchi puntati e numerati
    - Migliora la gestione di virgolette e parentesi
    """

    # Rimuovi spazi multipli e normalizza
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

    # Proteggi abbreviazioni comuni italiane
    abbreviations = [
        r'\bdr\.', r'\bprof\.', r'\bing\.', r'\bavv\.',
        r'\bsig\.', r'\bart\.', r'\bcap\.', r'\becc\.',
        r'\betc\.', r'\bes\.', r'\bcfr\.', r'\bp\.es\.',
        r'\bvol\.', r'\bpag\.', r'\bp\.', r'\bpp\.',
        r'\bn\.', r'\bvs\.', r'\bcc\.'
    ]
    for abbr in abbreviations:
        text = re.sub(abbr, lambda m: m.group(0).replace(
            '.', '<DOT>'), text, flags=re.IGNORECASE)

    # Sistema punti dopo numeri (es: "1. punto" -> mantieni come lista)
    text = re.sub(r'(\d+)\.\s+([A-Z])', r'\1<DOT> \2', text)

    # Sistema punti elenco che potrebbero confondere il sentence splitter
    text = re.sub(r'^\s*[•\-\*]\s+', '• ', text, flags=re.MULTILINE)

    # Aggiungi spazio dopo punto se manca (es: "parola.Altra" -> "parola. Altra")
    text = re.sub(r'\.([A-Z])', r'. \1', text)

    # Sistema virgolette e parentesi che potrebbero interrompere frasi
    text = re.sub(r'\s+"([^"]+)"\s+', r' "\1" ', text)

    # Sistema doppi spazi creati dalle sostituzioni
    text = re.sub(r'  +', ' ', text)

    return text.strip()


def restore_protected_dots(text: str) -> str:
    """Ripristina i punti protetti nelle abbreviazioni."""
    return text.replace('<DOT>', '.')


def is_sentence_boundary(token) -> bool:
    """
    Determina se un token rappresenta un confine di frase significativo.
    """
    # Confini forti
    if token.is_sent_start:
        return True

    # Punteggiatura forte
    if token.text in ['.', '!', '?', '...', '…']:
        return True

    # Punto e virgola può essere confine
    if token.text == ';':
        # Solo se seguito da maiuscola o inizio di nuova idea
        next_token = token.nbor(1) if token.i < len(token.doc) - 1 else None
        if next_token and (next_token.is_sent_start or next_token.text[0].isupper()):
            return True

    return False


@calc_time_func
def extract_semantic_chunks(text: str) -> list[str]:
    """
    Estrae chunk semanticamente coerenti dal testo usando spaCy.

    Strategia:
    1. Divide in frasi con spaCy
    2. Raggruppa frasi consecutive fino a raggiungere dimensione target
    3. Non spezza mai una frase a metà
    4. Cerca di mantenere coerenza tematica
    """

    # Pre-processa il testo
    prepared_text = prepare_text_for_spacy(text)

    # Analizza con spaCy
    doc = nlp(prepared_text)

    chunks = []
    current_chunk = []
    current_length = 0

    for sent in doc.sents:
        sent_text = sent.text.strip()

        if not sent_text:
            continue

        sent_length = len(sent_text)

        # Se la frase da sola supera il massimo, la salviamo come chunk separato
        if sent_length > MAX_CHUNK_CHARS:
            # Salva il chunk corrente se non vuoto
            if current_chunk:
                chunk_text = ' '.join(current_chunk)
                chunks.append(restore_protected_dots(chunk_text))
                current_chunk = []
                current_length = 0

            # Salva la frase lunga come chunk separato
            chunks.append(restore_protected_dots(sent_text))
            continue

        # Se aggiungendo questa frase superiamo il massimo
        if current_length + sent_length > MAX_CHUNK_CHARS:
            # Salva il chunk corrente
            if current_chunk:
                chunk_text = ' '.join(current_chunk)
                chunks.append(restore_protected_dots(chunk_text))

            # Inizia nuovo chunk con questa frase
            current_chunk = [sent_text]
            current_length = sent_length
        else:
            # Aggiungi la frase al chunk corrente
            current_chunk.append(sent_text)
            current_length += sent_length + 1  # +1 per lo spazio

            # Se abbiamo raggiunto una buona dimensione, possiamo chiudere
            if current_length >= TARGET_CHUNK_CHARS:
                chunk_text = ' '.join(current_chunk)
                chunks.append(restore_protected_dots(chunk_text))
                current_chunk = []
                current_length = 0

    # Salva l'ultimo chunk se presente
    if current_chunk:
        chunk_text = ' '.join(current_chunk)
        chunks.append(restore_protected_dots(chunk_text))

    # Filtra chunk troppo corti (probabilmente frammenti)
    chunks = [c for c in chunks if len(c) >= MIN_CHUNK_CHARS]

    return chunks


def extract_annotations(chunk_text: str, nlp_model) -> tuple[list[str], list[str]]:
    """
    Estrae keywords ed entità da un chunk usando analisi linguistica.
    """
    doc = nlp_model(chunk_text[:1500])  # Limita per performance

    keywords = []
    entities = []

    # Estrai Entità Nominate
    for ent in doc.ents:
        if len(ent.text) > 2:  # Filtra entità troppo corte
            entities.append(ent.text.strip())

    # Estrai Keywords (sostantivi, verbi, aggettivi)
    for token in doc:
        if token.pos_ in ["NOUN", "VERB", "ADJ"] and not token.is_stop and len(token.lemma_) > 2:
            keywords.append(token.lemma_.lower())

    # Rimuovi duplicati mantenendo ordine
    seen_kw = set()
    unique_keywords = [kw for kw in keywords if not (
        kw in seen_kw or seen_kw.add(kw))]

    seen_en = set()
    unique_entities = [en for en in entities if not (
        en in seen_en or seen_en.add(en))]

    return unique_keywords[:15], unique_entities[:5]


def format_chunks_output(chunks: list[str]) -> str:
    """
    Formatta i chunk nel formato richiesto, includendo Keywords ed Entità.
    """
    output_lines = []

    for i, chunk in enumerate(chunks, start=1):
        chunk_id = str(i).zfill(3)

        # Estrai annotazioni (Keywords ed Entità)
        keywords, entities = extract_annotations(chunk, nlp)

        kw_line = "KW: " + ", ".join(keywords) if keywords else "KW: "
        en_line = "EN: " + ", ".join(entities) if entities else "EN: [nessuna]"

        # Formatta il chunk
        output_lines.append(f"<<<id={chunk_id}>>>")
        output_lines.append(chunk)
        output_lines.append("<<<te>>>")
        output_lines.append(f"<<<a={chunk_id}>>>")
        output_lines.append(kw_line)
        output_lines.append(en_line)
        output_lines.append("<<<ae>>>")

        # Aggiungi riga vuota tra chunk (tranne l'ultimo)
        if i < len(chunks):
            output_lines.append("")

    return "\n".join(output_lines)


def get_source_files(directory: str) -> list[Path]:
    """Scansiona la directory di input e restituisce una lista di file di testo."""
    d = Path(directory)

    if not d.is_dir():
        print(f"Errore: La directory di input '{directory}' non esiste.")
        return []

    return [p for p in d.iterdir() if p.is_file()]


@calc_time_func
def chunk_source_documents(input_dir: str, output_dir: str):
    """
    Processa i documenti nella directory di input e crea chunk semantici.
    """
    source_files = get_source_files(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for input_path in source_files:
        doc_name = input_path.stem
        output_file = output_path / f"{doc_name}.txt"

        if output_file.exists():
            print(f"Documento {doc_name} già processato. Salto.")
            continue

        print(f"Processo del documento: {input_path.name}")

        text = load_file(input_path)
        text = clean_doc(text)

        try:
            # Estrai chunk semantici con spaCy dall'intero documento
            chunks = extract_semantic_chunks(text)

            if not chunks:
                logger.warning(
                    f"Nessun chunk estratto per il documento {doc_name}")
                print(
                    f"  --> ATTENZIONE: Nessun chunk estratto. Salto questo documento.")
                continue

            # Formatta l'output
            formatted_output = format_chunks_output(chunks)

            print(f"  Estratti {len(chunks)} chunk semantici")
            print(f"  Salvataggio in: {output_file}\n")

            save_file(output_file, formatted_output)

        except Exception as e:
            error_message = f"Errore nel processamento del documento {doc_name}: {type(e).__name__}: {e}"
            logger.error(error_message)
            print(
                f"  --> ERRORE nel documento {doc_name}. Controllare il log.")
            continue


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Esegue il chunking semantico dei documenti usando spaCy."
    )
    parser.add_argument("-i", "--input_dir",
                        required=True,
                        help="Directory contenente i file di testo sorgente.")
    parser.add_argument("-o", "--output_dir",
                        required=True,
                        help="Directory di output dove salvare i chunk processati.")
    args = parser.parse_args()

    chunk_source_documents(input_dir=args.input_dir,
                           output_dir=args.output_dir)
