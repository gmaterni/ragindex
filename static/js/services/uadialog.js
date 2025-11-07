/** @format */
export const DialogManager = {
  // Funzione per sanificare il testo
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // Funzione per creare il dialogo
  createDialog(type, message, defaultValue = "") {
    const dialog = document.createElement("div");
    const overlay = document.createElement("div");

    dialog.className = `${type}-dialog`;
    dialog.classList.add("inv");
    overlay.className = "overlay";

    // Aggiunge un campo di input per il dialogo di tipo "prompt"
    const inputHtml = type === "prompt" ? `<input type="text" class="prompt-input" value="${this.escapeHtml(defaultValue)}">` : "";
    const escapedMessage = this.escapeHtml(message);

    dialog.innerHTML = `
      <div role="${type === 'alert' ? 'alertdialog' : 'dialog'}" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <h4 id="dialog-title">${escapedMessage}</h4>
        ${inputHtml}
        <div class="buttons">
          <button class="ok" aria-label="OK">OK</button>
          ${type === "confirm" || type === "prompt" ? '<button class="cancel" aria-label="Annulla">Annulla</button>' : ""}
        </div>
      </div>`;

    // Aggiunge attributi ARIA per l'accessibilità
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    [dialog, overlay].forEach((el) => {
      el.classList.add("show");
      document.body.appendChild(el);
    });

    return { dialog, overlay };
  },

  // Funzione per chiudere il dialogo
  closeDialog(dialog, overlay) {
    [dialog, overlay].forEach((el) => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    });
  },

  // Funzione per mostrare il dialogo
  async showDialog(type, message, defaultValue) {
    return new Promise((resolve) => {
      // Chiudi eventuali dialoghi aperti
      const existingOverlay = document.querySelector('.overlay.show');
      if (existingOverlay) {
        const existingDialog = document.querySelector('.dialog.show');
        this.closeDialog(existingDialog, existingOverlay);
      }

      const { dialog, overlay } = this.createDialog(type, message, defaultValue);
      const okBtn = dialog.querySelector(".ok");
      const cancelBtn = dialog.querySelector(".cancel");

      // Funzione per gestire la chiusura con ESC o click fuori
      const handleClose = (result) => {
        this.closeDialog(dialog, overlay);
        resolve(result);
        // Rimuovi gli event listener
        document.removeEventListener("keydown", handleKeyDown);
        overlay.removeEventListener("click", handleOverlayClick);
      };

      // Gestione del tasto ESC
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          handleClose(type === "confirm" ? false : null);
        }
      };

      // Gestione del click sull'overlay
      const handleOverlayClick = () => {
        handleClose(type === "confirm" ? false : null);
      };

      document.addEventListener("keydown", handleKeyDown);
      overlay.addEventListener("click", handleOverlayClick);

      if (type === "prompt") {
        const input = dialog.querySelector(".prompt-input");
        input.focus();
        input.select();

        okBtn.onclick = () => {
          handleClose(input.value);
        };

        cancelBtn.onclick = () => {
          handleClose(null);
        };

        // Permette di inviare con il tasto Invio
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            okBtn.click();
          }
        });
      } else if (type === "confirm") {
        okBtn.onclick = () => {
          handleClose(true);
        };

        cancelBtn.onclick = () => {
          handleClose(false);
        };
      } else {
        // 'alert'
        okBtn.onclick = () => {
          handleClose(undefined);
        };
        // Per gli alert, il click fuori chiude il dialogo senza risultato
        const handleOverlayClickAlert = () => {
          handleClose(undefined);
        };
        overlay.onclick = handleOverlayClickAlert;
      }
    });
  },
};

// Sovrascriviamo le funzioni native
const nativeAlert = window.alert;
const nativeConfirm = window.confirm;
const nativePrompt = window.prompt;

// Sovrascriviamo alert
window.alert = async function (message) {
  if (message instanceof Error) {
    message = message.message;
  }
  return DialogManager.showDialog("alert", message);
};

// Sovrascriviamo confirm
window.confirm = async function (message) {
  return DialogManager.showDialog("confirm", message);
};

// Sovrascriviamo prompt
window.prompt = async function (message, defaultValue = "") {
  return DialogManager.showDialog("prompt", message, defaultValue);
};
