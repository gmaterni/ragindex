#!/usr/bin/env python
# coding: utf-8
import re
import sys
import unicodedata
from pathlib import Path

# def normalize_NFKD(text):
#     return unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')


def html_escape(s):
    x = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return x


def xml_escape(text: str) -> str:
    """Helper per l'escape dei caratteri XML speciali."""
    return (str(text).replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;'))


def remove_tag(txt):
    # Rimuove i tag e i caratteri speciali
    txt = re.sub(r'<<<|>>>|<<|>>|#', '', txt)
    return txt


def remove_links(doc):
    # Rimuove link web HTTP/HTTPS, link file locali, link markdown e link HTML
    doc = re.sub(
        r'https?://\S+|file:///[^\s]+|\[([^\]]+)\]\([^\)]+\)|<a\s+(?:[^>]*?\s+)?href="[^"]*"[^>]*>([^<]+)</a>', '', doc)
    return doc.strip()


def clean_text(text):
    # Rimuove i backtick
    text = re.sub(r'`', '', text)
    # Unisce le parole divise dal trattino a fine riga
    text = re.sub(r'(\w+)-\s*\n(\w+)', r'\1\2', text)
    # Rimuove caratteri non stampabili specifici
    chars_rm = r'[\u00AD\u200B\u200C\u200D\u2060\uFEFF\u0008]'
    text = re.sub(chars_rm, '', text)
    # Sostituisce spazi non standard e altri caratteri con uno spazio
    chars_srp = r'[\u00A0\u2000-\u200A\u202F\u205F\u3000\t\r\f\v]'
    text = re.sub(chars_srp, ' ', text)
    # Mantieni le sequenze di escape comuni
    text = re.sub(r'\\([nrtfb])', r'\1', text)
    # Mantieni le sequenze Unicode
    text = re.sub(r'\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})', r'\1', text)
    # Mantieni i backslash nei path di file
    text = re.sub(r'\\([a-zA-Z]:\\|\\\\[a-zA-Z0-9_]+\\)', r'\\\1', text)
    # Rimuovi tutti gli altri backslash
    text = re.sub(r'\\', '', text)
    # Elimina le righe costituite dalla ripetizione di più di tre caratteri uguali
    text = re.sub(r'(.)\1{3,}', '', text)
    # Uniforma i caratteri di quotazione
    text = text.replace('“', '"').replace('”', '"')
    # Converte gli apostrofi non standard in apostrofi standard
    text = text.replace('’', "'").replace(
        '‘', "'").replace('‚', "'").replace('‛', "'")
    # Rimuove spazi prima della punteggiatura
    text = re.sub(r' +([.,;:!?])', r'\1', text)
    # Sostituisci newline e tab con spazi, poi unifica spazi multipli
    text = re.sub(r'\s+', ' ', text)
    text = unicodedata.normalize('NFC', text)
    return text.strip()


def clean_doc(text):
    text = remove_tag(text)
    text = remove_links(text)
    text = clean_text(text)
    pattern = r'(?<!\b\w\.)(?<!\b\w\w\.)(?<!\b\w\w\w\.)(?<=[.!?])(?=\s+[A-Z])'
    lines = re.split(pattern, text)
    lines = [s.strip() for s in lines if s.strip()]
    text = "\n".join(lines)
    return text
