
"use strict";
import { DocsMgr } from "./services/docs_mgr.js";
import { UaWindowAdm } from "./services/uawindow.js";

export const docuentUploader = {
  dragoverHandler: null,
  dropHandler: null,
  uploadMode: "single", // "single" o "directory"

  open() {
    //AAA <h5>Carica Documenti nella Knowledge Base</h5>
    const htmlContent = `
      <div class="window-text">
        <div class="btn-wrapper">
         <button class="btn-close tt-left " data-tt="Chiudi">X</button>
        </div>
        <div class="upload-dialog-content">
          <p class="upload-description">Trascina uno o più file (testo, PDF, DOCX) o un'intera cartella per aggiungerli alla knowledge base.</p>
          
          <!-- Selector modalitÃ  upload -->
          <div class="upload-mode-selector">
            <label>
              <input type="radio" name="upload-mode" value="single" checked> <span>File singoli</span>
            </label>
            <label>
              <input type="radio" name="upload-mode" value="directory"> <span>Intera directory</span>
            </label>
          </div>
          
          <div id="drop-zone" class="drop-zone">
            <p id="drop-zone-text">Trascina i file qui o clicca per selezionare</p>
            <input type="file" id="id_fileupload" style="display: none;" multiple>
          </div>
          
          <!-- Barra di progresso -->
          <div id="progress-container" style="display: none;">
            <div>
              <div id="progress-bar"></div>
            </div>
            <p id="progress-text">0 / 0 file processati</p>
          </div>
          
          <div id="file-list-container"></div>
          
          <!-- Riepilogo upload -->
          <div id="upload-summary" style="display: none;">
            <strong>Riepilogo:</strong>
            <div id="summary-content"></div>
          </div>
        </div>
      </div>
    `;

    const uploadWindow = UaWindowAdm.create("id_upload");
    uploadWindow.drag();
    uploadWindow.setZ(12);
    uploadWindow.vw_vh().setXY(16.5, 5, -1);
    uploadWindow.setHtml(htmlContent);

    document.getElementById("id_upload").addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-close")) {
        uploadWindow.close();
      }
    });

    uploadWindow.show();

    const dropZone = document.getElementById("drop-zone");
    const dropZoneText = document.getElementById("drop-zone-text");
    const fileInput = document.getElementById("id_fileupload");
    const fileListContainer = document.getElementById("file-list-container");
    const modeRadios = document.querySelectorAll('input[name="upload-mode"]');

    // Pulisce la lista dei file ogni volta che la finestra viene aperta
    fileListContainer.innerHTML = "";

    // Gestione cambio modalitÃ 
    modeRadios.forEach(radio => {
      radio.addEventListener("change", (e) => {
        this.uploadMode = e.target.value;
        if (this.uploadMode === "directory") {
          fileInput.setAttribute("webkitdirectory", "");
          fileInput.setAttribute("directory", "");
          dropZoneText.textContent = "Trascina una directory qui o clicca per selezionare";
        } else {
          fileInput.removeAttribute("webkitdirectory");
          fileInput.removeAttribute("directory");
          dropZoneText.textContent = "Trascina i file qui o clicca per selezionare";
        }
      });
    });

    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");

      const items = e.dataTransfer.items;
      const files = [];

      // Gestisce sia file che directory tramite drag & drop
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i].webkitGetAsEntry();
          if (item) {
            await this.traverseFileTree(item, files);
          }
        }
      } else {
        // Fallback per browser che non supportano webkitGetAsEntry
        for (const file of e.dataTransfer.files) {
          files.push(file);
        }
      }

      if (files.length > 0) {
        await this.handleMultipleFiles(files);
      }
    });

    fileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        await this.handleMultipleFiles(files);
      }
    });

    // Previene il comportamento di default del browser
    this.dragoverHandler = (e) => e.preventDefault();
    this.dropHandler = (e) => e.preventDefault();
    window.addEventListener("dragover", this.dragoverHandler);
    window.addEventListener("drop", this.dropHandler);
  },

  /**
   * Attraversa ricorsivamente l'albero di file/directory
   */
  async traverseFileTree(item, files) {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file) => {
          files.push(file);
          resolve();
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries) => {
          for (const entry of entries) {
            await this.traverseFileTree(entry, files);
          }
          resolve();
        });
      });
    }
  },

  /**
   * Gestisce l'upload di file multipli con feedback progressivo
   */
  async handleMultipleFiles(files) {
    // Filtra solo i file supportati
    const supportedExtensions = ["txt", "pdf", "docx"];
    const validFiles = files.filter(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      alert("Nessun file valido trovato. Formati supportati: .txt, .pdf, .docx");
      return;
    }

    const unsupportedCount = files.length - validFiles.length;
    if (unsupportedCount > 0) {
      console.warn(`${unsupportedCount} file ignorati (formato non supportato)`);
    }

    // Mostra barra di progresso
    const progressContainer = document.getElementById("progress-container");
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const summaryDiv = document.getElementById("upload-summary");
    const summaryContent = document.getElementById("summary-content");

    progressContainer.style.display = "block";
    summaryDiv.style.display = "none";

    const stats = {
      total: validFiles.length,
      success: 0,
      duplicates: 0,
      errors: 0,
      errorFiles: []
    };

    // Processa i file in sequenza
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const percentage = Math.round(((i + 1) / stats.total) * 100);
      progressText.textContent = `${i + 1} / ${stats.total} file processati`;
      progressBar.style.width = `${percentage}%`;
      progressBar.textContent = `${percentage}%`;

      const result = await this.handleFile(file, true); // true = silenzioso (no alert)

      if (result.status === "success") {
        stats.success++;
      } else if (result.status === "duplicate") {
        stats.duplicates++;
      } else if (result.status === "error") {
        stats.errors++;
        stats.errorFiles.push({ name: file.name, error: result.error });
      }
    }

    // Mostra riepilogo finale
    summaryDiv.style.display = "block";
    summaryContent.innerHTML = `
      <div class="success">âœ… Caricati con successo: <strong>${stats.success}</strong></div>
      <div class="duplicate">âš ï¸ Duplicati (ignorati): <strong>${stats.duplicates}</strong></div>
      <div class="error">âŒ Errori: <strong>${stats.errors}</strong></div>
      ${stats.errorFiles.length > 0 ? `
        <details>
          <summary>Mostra file con errori</summary>
          <ul>
            ${stats.errorFiles.map(f => `<li>${f.name}: ${f.error}</li>`).join("")}
          </ul>
        </details>
      ` : ""}
    `;

    // Nascondi la barra dopo 2 secondi se tutto ok
    if (stats.errors === 0) {
      setTimeout(() => {
        progressContainer.style.display = "none";
      }, 2000);
    }
  },

  close() {
    window.removeEventListener("dragover", this.dragoverHandler);
    window.removeEventListener("drop", this.dropHandler);
    UaWindowAdm.close("id_upload");
  },

  /**
   * Gestisce un singolo file
   * @param {File} file - Il file da processare
   * @param {boolean} silent - Se true, non mostra alert
   * @returns {Object} - Oggetto con status e eventuali dettagli
   */
  async handleFile(file, silent = false) {
    if (!file) {
      return { status: "error", error: "Nessun file fornito" };
    }

    const fileName = file.name;
    const fileListContainer = document.getElementById("file-list-container");

    // Controlla duplicati ma NON blocca il processo
    if (DocsMgr.exists(fileName)) {
      if (!silent) {
        alert(`Il file "${fileName}" Ã¨ giÃ  in archivio. VerrÃ  ignorato.`);
      }

      // Aggiunge comunque un elemento visivo
      const fileItem = document.createElement("div");
      fileItem.className = "file-list-item duplicate";
      fileItem.textContent = `${fileName} - Duplicato (ignorato)`;
      fileListContainer.appendChild(fileItem);

      return { status: "duplicate", fileName };
    }

    const fileExtension = file.name.split(".").pop().toLowerCase();

    try {
      let text;

      if (fileExtension === "pdf") {
        const pdfHandler = new PdfHandler();
        await pdfHandler.loadPdfJs();
        text = await pdfHandler.extractTextFromPDF(file);
        pdfHandler.cleanup();
      } else if (fileExtension === "txt") {
        text = await FileReaderUtil.readTextFile(file);
      } else if (fileExtension === "docx") {
        const docxHandler = new DocxHandler();
        await docxHandler.loadMammoth();
        text = await docxHandler.extractTextFromDocx(file);
        docxHandler.cleanup();
      } else {
        const errorMsg = "Formato non supportato";
        if (!silent) {
          alert(`${fileName}: ${errorMsg}`);
        }
        return { status: "error", error: errorMsg, fileName };
      }

      DocsMgr.add(fileName, text);

      const fileItem = document.createElement("div");
      fileItem.className = "file-list-item success";
      fileItem.textContent = `${fileName} - Caricato con successo`;
      fileListContainer.appendChild(fileItem);

      return { status: "success", fileName };

    } catch (error) {
      console.error("Error:", error);
      const errorMsg = error.message || "Errore sconosciuto";

      if (!silent) {
        alert(`Errore durante l'estrazione del testo dal file ${fileName}: ${errorMsg}`);
      }

      const fileItem = document.createElement("div");
      fileItem.className = "file-list-item error";
      fileItem.textContent = `${fileName} - Errore: ${errorMsg}`;
      fileListContainer.appendChild(fileItem);

      return { status: "error", error: errorMsg, fileName };
    }
  },
};

// Le classi PdfHandler, DocxHandler e FileReaderUtil rimangono identiche
class PdfHandler {
  constructor() {
    this.pdfjsLib = null;
    this.scriptElement = null;
    this.workerScriptElement = null;
  }

  async loadPdfJs() {
    if (window["pdfjsLib"]) {
      this.pdfjsLib = window["pdfjs-dist/build/pdf"];
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
      return;
    }
    this.scriptElement = document.createElement("script");
    this.scriptElement.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.min.js";
    document.body.appendChild(this.scriptElement);

    await new Promise((resolve) => {
      this.scriptElement.onload = () => {
        this.workerScriptElement = document.createElement("script");
        this.workerScriptElement.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
        document.body.appendChild(this.workerScriptElement);
        this.workerScriptElement.onload = resolve;
      };
    });

    this.pdfjsLib = window["pdfjs-dist/build/pdf"];
    this.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
  }

  async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      text += pageText + "\n";
    }
    return text;
  }

  cleanup() {
    if (this.scriptElement) document.body.removeChild(this.scriptElement);
    if (this.workerScriptElement) document.body.removeChild(this.workerScriptElement);
    this.pdfjsLib = null;
    if (window.gc) window.gc();
  }
}

class DocxHandler {
  constructor() {
    this.mammoth = null;
    this.scriptElement = null;
  }

  async loadMammoth() {
    if (window["mammoth"]) {
      this.mammoth = window["mammoth"];
      return;
    }
    this.scriptElement = document.createElement("script");
    this.scriptElement.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.11/mammoth.browser.min.js";
    document.body.appendChild(this.scriptElement);

    await new Promise((resolve) => {
      this.scriptElement.onload = () => {
        this.mammoth = window["mammoth"];
        resolve();
      };
    });
  }

  async extractTextFromDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await this.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  cleanup() {
    if (this.scriptElement) document.body.removeChild(this.scriptElement);
    this.mammoth = null;
    if (window.gc) window.gc();
  }
}

export const FileReaderUtil = {
  readTextFile: async (file) => {
    if (!file || file.type !== "text/plain") {
      throw new Error("Invalid file type. Please select a text file.");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(new Error("Error reading file: " + error.message));
      reader.readAsText(file);
    });
  }
};