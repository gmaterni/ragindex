"use strict";

import { UaWindowAdm } from "./services/uawindow.js";
import van from "./services/vendor/van.mjs";

/**
 * Gestore semplificato delle finestre per l'applicazione di test LLM.
 * Segue le BEST_PRACTICES_JS.md.
 */
const AppUi = function() {
    
    /**
     * Crea una finestra di tipo "Info" per visualizzare contenuti generici o form.
     * @param {string} id - ID unico della finestra.
     * @returns {Object} Interfaccia della finestra.
     */
    const _createWndInfo = function(id) {
        const _w = UaWindowAdm.create(id);
        
        const show = function(content, closeOthers = true) {
            const { div, button } = van.tags;
            
            if (closeOthers) {
                wnds.closeAll();
            }
            
            _w.drag().setZ(100);
            _w.vw_vh().setXY(10, 10, -1);

            const ui = div({ class: "window-info", style: "background: #1e1e1e; border: 1px solid #444; padding: 10px; border-radius: 8px; min-width: 300px; color: #ccc;" },
                div({ class: "btn-wrapper", style: "display: flex; justify-content: flex-end; margin-bottom: 5px;" },
                    button({ 
                        style: "background: #c62828; color: white; border: none; padding: 2px 8px; cursor: pointer; border-radius: 4px;",
                        onclick: () => _w.close() 
                    }, "X")
                ),
                div({ class: "div-info" }, typeof content === 'string' ? div({ innerHTML: content }) : content)
            );
            
            _w.setHtml(ui);
            _w.show();
        };

        const close = function() {
            _w.close();
        };

        const api = {
            show: show,
            close: close
        };
        return api;
    };

    const winfo = _createWndInfo("id_info");

    const closeAll = function() {
        UaWindowAdm.close("id_info");
    };

    const api = {
        winfo: winfo,
        closeAll: closeAll
    };
    return api;
};

export const wnds = AppUi();
