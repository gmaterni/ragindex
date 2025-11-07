#!/usr/bin/env python3
# coding: utf-8
"""
FASE 5: Generazione della Risposta Aumentata (RAG)

Questo script rappresenta l'ultimo anello della catena di RAG (Retrieval-Augmented
Generation). Il suo compito è prendere il contesto rilevante, recuperato da uno
degli script di ricerca (ne3 o ne4), e utilizzarlo per generare una risposta
informativa e contestualizzata alla domanda originale dell'utente.

Funzionamento:
1.  Carica il file di contesto, che contiene i chunk di testo più pertinenti
    alla query, ordinati per rilevanza.
2.  Utilizza un `PromptAssembler` per costruire una cronologia di conversazione.
    Il primo prompt di sistema istruisce l'LLM a comportarsi come un assistente
    che basa le sue risposte sul contesto fornito, integrandolo con la sua
    conoscenza generale.
3.  Invia la richiesta iniziale all'LLM, che contiene sia il contesto recuperato
    sia la domanda dell'utente.
4.  Stampa la risposta e la aggiunge alla cronologia della conversazione.
5.  Entra in un ciclo interattivo (REPL: Read-Eval-Print Loop) dove l'utente
    può porre domande di follow-up.
6.  Ogni nuova domanda viene aggiunta alla cronologia, che viene interamente
    reinviata all'LLM. Questo permette al modello di mantenere il contesto
    dell'intera conversazione e di rispondere a domande successive in modo coerente.
7.  L'intera conversazione viene salvata in un file di log per analisi future.
"""
import argparse
import logging
import os
import sys
from pathlib import Path

from gemini_client_llm import GeminiClient
from prompt_assembler import PromptAssembler
from prompts import prompt_conversation_with_context
from ualib.calc_time_func import calc_time_func
from ualib.utils import append_file, format_llm_error, load_file, save_file

logger = logging.getLogger(__name__)

# MODEL = "gemini-2.0-flash"
MODEL = "gemini-2.5-flash"
# MODEL = "gemini-2.5-flash-lite"

api_key = os.environ["GEMINI_API_KEY"]
client = GeminiClient(api_key, MODEL)
payload = {
    "temperature": 0.0,
    "max_output_tokens": 4096,
    "top_p": 0.95,
    "top_k": 42,
    "stop_sequences": [],
    "candidate_count": 1,
}


@calc_time_func
def send_request(messages: list[dict]) -> str:
    try:
        response = client.send_request(messages, payload)
        if response.error:
            s = format_llm_error(response.error)
            logger.error(s)
            sys.exit(s)
        answer = response.data
        return answer
    except Exception as e:
        logger.error("--- Errore Imprevisto Durante la Richiesta LLM ---")
        logger.error(f"Tipo di Errore: {type(e).__name__}")
        logger.error(f"Messaggio: {e}")
        logger.error("-------------------------------------------------")
        sys.exit(str(e))


def generate_response_from_context(query: str, context_file: str, output_file: str):
    """Gestisce una sessione di conversazione con un LLM basata su un contesto."""
    try:
        context = load_file(context_file)
    except FileNotFoundError:
        logger.error(f"File di contesto non trovato: {context_file}")
        sys.exit(1)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Preparazione della conversazione iniziale
    # L'assembler manterrà la cronologia di tutta la conversazione.
    asm = PromptAssembler()
    initial_messages = prompt_conversation_with_context(context, query)
    asm.messages = initial_messages

    # Log della richiesta iniziale per il debug
    initial_log = f"--- INIZIO CONVERSAZIONE ---\nQuery: {query}\nContesto da: {context_file}\n"
    save_file(output_path, initial_log)

    print("Invio richiesta iniziale all'LLM...")
    assistant_response = send_request(asm.get_messages())

    # Aggiungi la prima risposta dell'assistente alla cronologia
    asm.add_assistant_message(assistant_response)

    # Log e stampa della prima risposta
    append_file(output_path, f"\n[ASSISTANT]\n{assistant_response}\n")
    print(f"\nRisposta:\n{assistant_response}")

    # 2. Ciclo di conversazione interattivo (REPL)
    while True:
        try:
            print("\n" + "-"*20)
            follow_up_query = input("La tua domanda (o 'q' per terminare): ")
            if follow_up_query.lower() in ['esci', 'exit', 'quit', 'q']:
                break
            if not follow_up_query.strip():
                continue

            # Aggiungi la nuova domanda dell'utente alla cronologia
            asm.add_user_message(follow_up_query)
            append_file(output_path, f"\n[USER]\n{follow_up_query}\n")

            print("Invio richiesta di follow-up all'LLM...")
            assistant_response = send_request(asm.get_messages())

            # Aggiungi la risposta dell'assistente alla cronologia per mantenere il contesto
            asm.add_assistant_message(assistant_response)

            # Log e stampa della risposta
            append_file(output_path, f"\n[ASSISTANT]\n{assistant_response}\n")
            print(f"\nRisposta:\n{assistant_response}")

        except KeyboardInterrupt:
            print("\nConversazione interrotta dall'utente.")
            break

    print(f"\nConversazione completa salvata in: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Intrattiene una conversazione con un LLM usando un contesto fornito (RAG)."
    )
    parser.add_argument("-q", "--query",
                        required=True,
                        help="La domanda iniziale da porre.")
    parser.add_argument("-c", "--context_file",
                        required=True,
                        help="Percorso del file di testo contenente il contesto recuperato.")
    parser.add_argument("-o", "--output_file",
                        default="build/conversation_log.txt",
                        help="Percorso del file dove salvare il log della conversazione.")
    args = parser.parse_args()

    generate_response_from_context(query=args.query,
                                   context_file=args.context_file,
                                   output_file=args.output_file)
