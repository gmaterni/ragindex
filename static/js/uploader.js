/** @format */

"use strict";
import { DocsMgr } from "./services/docs_mgr.js";
import { UaWindowAdm } from "./services/uawindow.js";
export const docuentUploader = {
  dragoverHandler: null,
  dropHandler: null,

  open() {
    const htmlContent = `
      <div class="window-text">
        <div class="btn-wrapper">
         <button class="btn-close tt-left " data-tt="Chiudi">X</button>
        </div>
        <div class="upload-dialog-content">
          <h4>Upload file Text / PDF / DOCX</h4>
          <div id="drop-zone" class="drop-zone">
            <p>Trascina il file qui o clicca per selezionare</p>
            <input type="file" id="id_fileupload" style="display: none;">
          </div>
          <div id="file-list-container"></div>
          <div id="result" class="result" style="display: none;"></div>
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
    const fileInput = document.getElementById("id_fileupload");
    const fileListContainer = document.getElementById("file-list-container");

    // Pulisce la lista dei file ogni volta che la finestra viene aperta
    fileListContainer.innerHTML = "";

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

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Itera su tutti i file trascinati
        for (const file of files) {
          this.handleFile(file);
        }
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Previene il comportamento di default del browser per i file trascinati fuori dalla drop-zone
    this.dragoverHandler = (e) => e.preventDefault();
    this.dropHandler = (e) => e.preventDefault();
    window.addEventListener("dragover", this.dragoverHandler);
    window.addEventListener("drop", this.dropHandler);
  },

  close() {
    // Rimuove gli handler globali quando la finestra viene chiusa
    window.removeEventListener("dragover", this.dragoverHandler);
    window.removeEventListener("drop", this.dropHandler);
    UaWindowAdm.close("id_upload");
  },

  async handleFile(file) {
    if (!file) {
      alert("Nessun file fornito.");
      return;
    }
    const fileName = file.name;
    if (DocsMgr.exists(fileName)) {
      alert(`Il file "${fileName}" è già in archivio.`);
      return;
    }
    const fileListContainer = document.getElementById("file-list-container");
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
        alert("Formato file non supportato. Sono accettati solo .txt, .pdf, .docx");
        return;
      }
      DocsMgr.add(fileName, text);
      const fileItem = document.createElement("div");
      fileItem.className = "file-list-item";
      fileItem.textContent = `${fileName} - Caricato con successo.`;
      fileListContainer.appendChild(fileItem);
    } catch (error) {
      console.error("Error:", error);
      alert(`Errore durante l'estrazione del testo dal file ${fileName}.`);
    }
  },
};

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
