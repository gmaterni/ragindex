"use strict";

import { UaDb } from "./uadb.js";
import { UaWindowAdm } from "./uawindow.js";

const DOC_TYPES_CONFIG = {
    analitici: [
        "analisi mercato",
        "studio fattibilita",
        "valutazione tecnica",
        "analisi rischi",
        "audit interno",
        "analisi costi benefici"
    ],
    argomentativi: [
        "documento scientifico",
        "proposta ricerca",
        "saggio filosofico",
        "tesi laurea",
        "paper accademico",
        "manifesto politico",
        "argomentazione legale"
    ],
    documentali: [
        "anamnesi medica",
        "report finanziario",
        "report tecnico",
        "verbale riunione",
        "certificato medico",
        "bilancio aziendale",
        "dichiarazione redditi",
        "registro presenze",
        "inventario magazzino"
    ],
    informativi: [
        "articolo cronaca",
        "documentazione descrittiva",
        "report marketing",
        "newsletter aziendale",
        "comunicato stampa",
        "bollettino informativo",
        "scheda prodotto"
    ],
    narrativi: [
        "biografia",
        "cronaca storica",
        "fiction",
        "romanzi",
        "diario personale",
        "testimonianza",
        "cronaca viaggio"
    ],
    normativi: [
        "contratto legale",
        "polizza assicurativa",
        "regolamento",
        "sentenza dispositivo",
        "statuto societario",
        "codice condotta",
        "decreto legge",
        "normativa sicurezza"
    ],
    procedurali: [
        "istruzioni uso",
        "manuale tecnico",
        "protocolli medici",
        "ricette",
        "guida installazione",
        "checklist operativa",
        "workflow aziendale"
    ],
    progettuali: [
        "business plan",
        "piano strategico",
        "progetto tecnico",
        "proposta commerciale",
        "piano marketing",
        "roadmap prodotto",
        "brief creativo",
        "piano sviluppo"
    ]
};

import { DATA_KEYS } from "../services/data_keys.js";


const DEFAULT_DOCTYPE_CONFIG = {
    docType: "argomentativi",
};

export const DocType = {
    isTreeVisible: false,
    config: {
        docType: "",
    },
    doctype_id: "doctype-tree-container",
    init() {
        const savedDocType = UaDb.read(DATA_KEYS.KEY_DOC_TYPE);
        if (this._isValidDocType(savedDocType)) {
            this.config.docType = savedDocType;
        } else {
            this.config = { ...DEFAULT_DOCTYPE_CONFIG };
            UaDb.save(DATA_KEYS.KEY_DOC_TYPE, this.config.docType);
        }
        this._updateActiveDocTypeDisplay();
    },
    // Valida se un tipo documento è corretto
    _isValidDocType(docType) {
        return docType && DOC_TYPES_CONFIG[docType];
    },
    getConfig() {
        return this.config;
    },

    _buildTreeView() {
        const container = document.getElementById(this.doctype_id);
        if (!container) return;
        let treeHtml = `
            <div class="doctype-tree-header">
                <span>Seleziona Tipo Documento</span>
                <button class="doctype-tree-close-btn">&times;</button>
            </div>
            <ul class="doctype-tree">
        `;

        for (const docTypeName in DOC_TYPES_CONFIG) {
            const docTypes = DOC_TYPES_CONFIG[docTypeName];
            const isActiveDocType = docTypeName === this.config.docType;

            treeHtml += `
                <li class="doctype-node">
                    <span class="${isActiveDocType ? "active" : ""}" data-doctype="${docTypeName}">
                        &#9660; ${docTypeName}
                    </span>
                    <ul class="subdoctype-list" style="display: block;">
            `;

            docTypes.forEach((subDocType) => {
                treeHtml += `
                    <li class="subdoctype-node" data-doctype="${docTypeName}" data-subdoctype="${subDocType}">
                        ${subDocType}
                    </li>`;
            });

            treeHtml += `</ul></li>`;
        }

        treeHtml += `</ul>`;
        container.innerHTML = treeHtml;
        this._addTreeEventListeners();
    },

    _addTreeEventListeners() {
        const container = document.getElementById(this.doctype_id);
        if (!container) return;
        const closeBtn = container.querySelector(".doctype-tree-close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.toggleTreeView());
        }
        // Click sulle categorie principali per selezionare
        container.querySelectorAll(".doctype-node > span").forEach((span) => {
            span.addEventListener("click", (e) => {
                const docTypeName = e.target.dataset.doctype;
                this._setDocType(docTypeName);
                this.toggleTreeView();
            });
        });
        // I sotto-documenti sono solo informativi
        container.querySelectorAll(".subdoctype-node").forEach((node) => {
            node.addEventListener("click", (e) => {
                e.stopPropagation(); // Evita propagazione al parent
            });
        });
    },
    //test
    toggleTreeView() {
        const wnd = UaWindowAdm.create(this.doctype_id);
        const container = wnd.getElement();
        wnd.addClassStyle("doctype-tree-container");
        // const container = document.getElementById("doctype-tree-container");
        if (!container) return;
        this.isTreeVisible = !this.isTreeVisible;
        container.style.display = this.isTreeVisible ? "block" : "none";
        if (this.isTreeVisible) {
            this._buildTreeView();
        }
    },

    _setDocType(docType) {
        if (!this._isValidDocType(docType)) {
            console.error(`Invalid docType selected: ${docType}`);
            return;
        }
        // Aggiorna la configurazione
        this.config.docType = docType;
        // Salva nel database
        UaDb.save(DATA_KEYS.KEY_DOC_TYPE, docType);
        // Aggiorna il display
        this._updateActiveDocTypeDisplay();
        // Ricostruisci il tree per aggiornare gli stati attivi
        if (this.isTreeVisible) {
            this._buildTreeView();
        }
    },

    _updateActiveDocTypeDisplay() {
        const displayElement = document.getElementById("active-doctype-display");
        if (displayElement) {
            displayElement.textContent = this.config.docType;
        }
    },
    selectDocType() {
        this.toggleTreeView();
    }
};