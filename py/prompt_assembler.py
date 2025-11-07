#!/usr/bin/env python
# coding: utf-8
from enum import Enum
from typing import Dict, List


class MessageRole(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class PromptAssembler:
    def __init__(self):
        self.messages: List[Dict[str, str]] = []

    def set_system_message(self, content: str) -> "PromptAssembler":
        # Rimuove eventuali messaggi di sistema esistenti
        self.messages = [
            msg for msg in self.messages if msg["role"] != MessageRole.SYSTEM.value
        ]
        system_message = {"role": MessageRole.SYSTEM.value, "content": content}
        # Inserisce il messaggio di sistema sempre all'inizio della lista
        self.messages.insert(0, system_message)
        return self

    def add_user_message(self, content: str) -> "PromptAssembler":
        user_message = {"role": MessageRole.USER.value, "content": content}
        self.messages.append(user_message)

        return self

    def add_assistant_message(self, content: str) -> "PromptAssembler":
        assistant_message = {
            "role": MessageRole.ASSISTANT.value, "content": content}
        self.messages.append(assistant_message)
        return self

    def get_messages(self) -> List[Dict[str, str]]:
        return self.messages.copy()

    def clear(self) -> "PromptAssembler":
        self.messages.clear()
        return self
