#!/usr/bin/env python
# coding: utf-8

from collections import namedtuple

import google.generativeai as genai

ErrorLLM = namedtuple('ErrorLLM', ['message', 'type', 'code', 'details'])
ResponseLLM = namedtuple(
    'ResponseLLM', ['data', 'error'], defaults=(None, None))


class GeminiClient:

    def __init__(self,
                 api_key="",
                 model_name='gemini-2.5-flash'):
        genai.configure(api_key=api_key)
        self.model_name = model_name
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

    def send_request(self,
                     messages,
                     generation_config=None):
        system_instruction = None
        conversation_history = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "system":
                system_instruction = content
            else:
                role_for_library = "model" if role == "assistant" else "user"
                conversation_history.append(
                    {"role": role_for_library, "parts": [{"text": content}]}
                )
        try:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_instruction
            )
            response = model.generate_content(
                conversation_history,
                generation_config=generation_config,
                safety_settings=self.safety_settings
            )
            return ResponseLLM(data=response.text)
        except Exception as e:
            error = ErrorLLM(
                message=str(e),
                type=e.__class__.__name__,
                code=getattr(e, 'code', None),
                details=getattr(e, 'details', None)
            )
            return ResponseLLM(error=error)
