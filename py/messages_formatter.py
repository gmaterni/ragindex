#!/usr/bin/env python
# coding: utf-8
import json
import re
from typing import Dict, List


def format_messages(messages: List[Dict[str, str]]) -> str:
    """
    Formatta una lista di messaggi in una stringa human-readable per il logging,
    pretty-stampando il contenuto JSON.
    """
    log_parts = []
    separator = "=" * 80
    for i, msg in enumerate(messages, 1):
        role = msg.get('role', 'unknown').upper()
        content = msg.get('content', '')
        log_parts.append(
            f"{separator}\n--- MESSAGGIO {i}: ROLE: {role} ---\n{separator}")
        # Tenta di formattare il contenuto se è una stringa JSON valida
        try:
            content_obj = json.loads(content)
            pretty_content = json.dumps(
                content_obj, indent=2, ensure_ascii=False)
            log_parts.append(pretty_content)
        except (json.JSONDecodeError, TypeError):
            log_parts.append(content)
    return "\n\n".join(log_parts) + "\n"
