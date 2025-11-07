const convertToGemPayload = (payload) => {
  const geminiPayload = {
    contents: [],
    system_instruction: null,
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 8192,
      topP: 0.95,
      topK: 40,
      stopSequences: [],
      candidateCount: 1,
    },
    safetySettings: [
      //{ category: "HARM_CATEGORY_TOXICITY", threshold: "BLOCK_NONE" },
      //{ category: "HARM_CATEGORY_VIOLENCE", threshold: "BLOCK_NONE" },
      //{ category: "HARM_CATEGORY_DEROGATORY", threshold: "BLOCK_NONE" },
      //{ category: "HARM_CATEGORY_SEXUAL", threshold: "BLOCK_NONE" },
      //{ category: "HARM_CATEGORY_MEDICAL", threshold: "BLOCK_NONE" },
      //{ category: "HARM_CATEGORY_DANGEROUS", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
    tools: null,
    tool_config: null,
  };
  if (payload.temperature !== undefined) {
    geminiPayload.generationConfig.temperature = payload.temperature;
  }
  if (payload.max_tokens !== undefined) {
    geminiPayload.generationConfig.maxOutputTokens = payload.max_tokens;
  }
  if (payload.top_p !== undefined) {
    geminiPayload.generationConfig.topP = payload.top_p;
  }
  if (payload.stop !== undefined) {
    geminiPayload.generationConfig.stopSequences = Array.isArray(payload.stop)
      ? payload.stop
      : [payload.stop];
  }
  for (const msg of payload.messages) {
    if (msg.role === 'system') {
      geminiPayload.system_instruction = {
        parts: [{ text: msg.content }]
      };
    } else if (msg.role === 'user') {
      let parts;
      if (typeof msg.content === 'string') {
        parts = [{ text: msg.content }];
      } else if (Array.isArray(msg.content)) {
        parts = [];
        for (const item of msg.content) {
          if (item.type === 'text') {
            parts.push({ text: item.text });
          } else if (item.type === 'image_url') {
            const imageUrl = item.image_url.url;
            if (imageUrl.startsWith('data:')) {
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
    const model = payload.model || "gemini-2.5-flash";
    const url = `${this.baseUrl}${model}:generateContent?key=${this.apiKey}`;
    const gemPayload = convertToGemPayload(payload);
    const headers = {
      "Content-Type": "application/json",
    };
    const result = await this._fetch(url, gemPayload, headers, timeout);
    if (result.ok) {
      try {
        // Validazione robusta della struttura della risposta
        if (!result.response?.candidates || !Array.isArray(result.response.candidates)) {
          return this._createResult(false, null, null,
            this._createError("Struttura risposta non valida: candidates mancante o non valido", "ParsingError", null,
              { message: "La risposta non contiene un array di candidati valido" }));
        }
        if (result.response.candidates.length === 0) {
          return this._createResult(false, null, null,
            this._createError("Nessun candidato restituito", "ParsingError", null,
              { message: "L'API non ha restituito alcun candidato nella risposta" }));
        }
        const firstCandidate = result.response.candidates[0];
        if (!firstCandidate?.content?.parts || !Array.isArray(firstCandidate.content.parts)) {
          return this._createResult(false, null, null,
            this._createError("Struttura candidato non valida", "ParsingError", null,
              { message: "Il candidato non contiene un array di parti valido" }));
        }
        if (firstCandidate.content.parts.length === 0) {
          return this._createResult(false, null, null,
            this._createError("Candidato senza contenuto", "ParsingError", null,
              { message: "Il candidato non contiene alcuna parte di testo" }));
        }
        const responseData = firstCandidate.content.parts[0].text;
        if (typeof responseData !== 'string') {
          return this._createResult(false, null, null,
            this._createError("Tipo di risposta non valido", "ParsingError", null,
              { message: "Il testo della risposta non è una stringa valida" }));
        }
        return this._createResult(true, result.response, responseData);
      } catch (error) {
        return this._createResult(false, null, null,
          this._createError("Errore durante l'analisi della risposta", "ParsingError", null, error));
      }
    } else {
      return result;
    }
  }
  cancelRequest() {
    const wasActive = this.abortController !== null;
    this.isCancelled = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    return {
      cancelled: wasActive,
      wasActive: wasActive,
      message: wasActive ? "Richiesta annullata con successo" : "Nessuna richiesta attiva da annullare"
    };
  }
  _createResult(ok, response = null, data = null, error = null) {
    return {
      ok,
      response,
      data,
      error,
    };
  }
  _createError(message, type, code, details) {
    const error = {
      message: message || null,
      type: type || null,
      code: code || null,
    };
    // Aggiungi details solo se contiene informazioni utili
    if (details && typeof details === 'object') {
      const detailsObj = {};
      if (details.message) detailsObj.message = details.message;
      if (details.type) detailsObj.type = details.type;
      if (details.param) detailsObj.param = details.param;
      if (details.code) detailsObj.code = details.code;
      if (details.isTimeout !== undefined) detailsObj.isTimeout = details.isTimeout;
      if (Object.keys(detailsObj).length > 0) {
        error.details = detailsObj;
      }
    }
    return error;
  }
  async _handleHttpError(response) {
    const errorMessages = {
      400: "Richiesta non valida",
      401: "Non autorizzato - Controlla la API key",
      403: "Accesso negato",
      404: "Endpoint non trovato",
      429: "Troppe richieste - Rate limit superato",
      500: "Errore interno del server",
      503: "Servizio non disponibile",
    };
    let detailsContent;
    let errorType = "HTTPError";
    let message = errorMessages[response.status] || `Errore HTTP ${response.status}`;
    try {
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        detailsContent = await response.json();
        if (response.status === 400 && detailsContent) {
          const errorMsg = typeof detailsContent.error === "string"
            ? detailsContent.error
            : detailsContent.message || detailsContent.error?.message;
          if (errorMsg && this._isTokenLimitError(errorMsg)) {
            message = "Input troppo lungo - Superato il limite di token";
            errorType = "TokenLimitError";
          }
        }
      } else {
        detailsContent = await response.text();
        if (response.status === 400 && this._isTokenLimitError(detailsContent)) {
          message = "Input troppo lungo - Superato il limite di token";
          errorType = "TokenLimitError";
        }
      }
    } catch (e) {
      detailsContent = { message: "Impossibile estrarre i dettagli dell'errore" };
    }
    return this._createError(
      message,
      errorType,
      response.status,
      typeof detailsContent === "string" ? { message: detailsContent } : detailsContent
    );
  }
  _isTokenLimitError(errorMessage) {
    const tokenErrorPatterns = [
      "token limit",
      "token exceeded",
      "input too long",
      "context length",
      "max tokens"
    ];
    const lowerMessage = errorMessage.toLowerCase();
    return tokenErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  }
  _handleNetworkError(error) {
    if (error.name === "AbortError") {
      if (this.isCancelled) {
        return this._createError(
          "Richiesta annullata dall'utente",
          "CancellationError",
          499,
          { message: "La richiesta è stata interrotta volontariamente dall'utente" }
        );
      } else {
        return this._createError(
          "Richiesta interrotta per timeout",
          "TimeoutError",
          408,
          { message: "La richiesta è stata interrotta a causa di un timeout", isTimeout: true }
        );
      }
    }
    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      return this._createError(
        "Errore di rete",
        "NetworkError",
        0,
        { message: "Impossibile raggiungere il server. Controlla la connessione." }
      );
    }
    return this._createError(
      "Errore imprevisto",
      error.name || "UnknownError",
      500,
      { message: error.message || "Si è verificato un errore sconosciuto" }
    );
  }
  async _fetch(url, payload, headers, timeout = 60) {
    // Reset dello stato per una nuova richiesta
    this.isCancelled = false;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const timeoutId = setTimeout(() => {
      if (this.abortController && !this.isCancelled) {
        this.abortController.abort();
      }
    }, timeout * 1000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        signal: signal,
      });
      clearTimeout(timeoutId);
      // Verifica dello stato di cancellazione dopo il completamento della fetch
      if (this.isCancelled) {
        const cancelledError = this._createError(
          "Richiesta annullata",
          "CancellationError",
          499,
          { message: "La richiesta è stata interrotta volontariamente dall'utente" }
        );
        this.abortController = null;
        return this._createResult(false, null, null, cancelledError);
      }
      if (!response.ok) {
        const err = await this._handleHttpError(response);
        this.abortController = null;
        return this._createResult(false, null, null, err);
      }
      const respJson = await response.json();
      this.abortController = null;
      return this._createResult(true, respJson);
    } catch (error) {
      clearTimeout(timeoutId);
      const err = this._handleNetworkError(error);
      this.abortController = null;
      return this._createResult(false, null, null, err);
    }
  }
}
export { GeminiClient };