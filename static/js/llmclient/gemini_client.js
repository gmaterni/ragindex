/** @format */
"use strict";

const convertToGemPayload = (payload) => {
  const geminiPayload = {
    contents: [],
    system_instruction: null,
    generationConfig: {
      temperature: payload.temperature !== undefined ? payload.temperature : 1.0,
      maxOutputTokens: payload.max_tokens !== undefined ? payload.max_tokens : 8192,
      topP: payload.top_p !== undefined ? payload.top_p : 0.95,
      topK: 40,
      stopSequences: payload.stop !== undefined ? (Array.isArray(payload.stop) ? payload.stop : [payload.stop]) : [],
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  for (const msg of payload.messages) {
    if (msg.role === 'system') {
      geminiPayload.system_instruction = {
        parts: [{ text: msg.content }]
      };
    } else if (msg.role === 'user') {
      let parts = [];
      if (typeof msg.content === 'string') {
        parts = [{ text: msg.content }];
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'text') {
            parts.push({ text: item.text });
          } else if (item.type === 'image_url') {
            const imageUrl = item.image_url.url;
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }
        }
      } else {
        parts = [{ text: String(msg.content) }];
      }
      geminiPayload.contents.push({
        role: 'user',
        parts: parts
      });
    } else if (msg.role === 'assistant') {
      geminiPayload.contents.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  }
  return geminiPayload;
}

class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
    this.abortController = null;
    this.isCancelled = false;
  }

  async sendRequest(payload, timeout = 60) {
    const modelName = payload.model || "gemini-2.0-flash";
    const url = `${this.baseUrl}${modelName}:generateContent?key=${this.apiKey}`;
    
    const preparedData = convertToGemPayload(payload);
    
    const result = await this._fetch(url, preparedData, timeout);

    if (result.ok) {
      try {
        const responseData = result.response.candidates[0].content.parts[0].text;
        return this._createResult(true, result.response, responseData);
      } catch (error) {
        return this._createResult(false, null, null, this._createError(
          "Struttura risposta non valida", "ParsingError", null, error
        ));
      }
    } else {
      return result;
    }
  }

  cancelRequest() {
    this.isCancelled = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      return true;
    }
    return false;
  }

  async _fetch(url, payload, timeout = 60) {
    this.isCancelled = false;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const timeoutId = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, timeout * 1000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: signal,
      });

      clearTimeout(timeoutId);

      if (this.isCancelled) {
        return this._createResult(false, null, null, this._createError(
          "Richiesta annullata", "CancellationError", 499, 
          { message: "La richiesta è stata interrotta volontariamente dall'utente" }
        ));
      }

      if (!response.ok) {
        const err = await this._handleHttpError(response);
        return this._createResult(false, null, null, err);
      }

      const respJson = await response.json();
      return this._createResult(true, respJson);
    } catch (error) {
      clearTimeout(timeoutId);
      const err = this._handleNetworkError(error);
      return this._createResult(false, null, null, err);
    } finally {
      this.abortController = null;
    }
  }

  async _handleHttpError(response) {
    let detailsContent;
    try {
      detailsContent = await response.json();
    } catch (e) {
      detailsContent = { message: "Impossibile estrarre i dettagli dell'errore" };
    }
    return this._createError(
      `Errore HTTP ${response.status}`, "HTTPError", response.status, detailsContent
    );
  }

  _handleNetworkError(error) {
    if (error.name === "AbortError") {
      return this._createError(
        this.isCancelled ? "Richiesta annullata" : "Timeout", 
        "NetworkError", this.isCancelled ? 499 : 408, error
      );
    }
    return this._createError("Errore di rete", "NetworkError", 0, error);
  }

  _createResult(ok, response = null, data = null, error = null) {
    return { ok, response, data, error };
  }

  _createError(message, type, code, details) {
    return { message, type, code, details };
  }
}

export { GeminiClient };