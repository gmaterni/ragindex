# Guida Aggiornamento GUI (VanJS)

Questa guida descrive come modernizzare l'interfaccia utente abbandonando la manipolazione imperativa delle stringhe (`uajtfh.js`) in favore di **VanJS** (Reactive UI).

> **RIFERIMENTO:** Seguire rigorosamente le regole in `docs/BEST_PRACTICES_JS.md`.

## 1. Setup

Assicurarsi che `van.mjs` sia presente in `js/services/vendor/`.

```javascript
import van from "./services/vendor/van.mjs";
const { div, button, span, input } = van.tags; // Destructuring utile
```

## 2. Eliminazione Legacy

1.  **Cancellare** il file `js/services/uajtfh.js`.
2.  Rimuovere ogni import di `UaJtfh`.

## 3. Aggiornamento Gestori Finestre (`uawindow.js`)

I gestori delle finestre devono accettare Elementi DOM (creati da VanJS) invece di sole stringhe HTML.

```javascript
// Esempio logico di aggiornamento in uawindow.js o wrapper
w.setHtml = function(content) {
    // Supporto ibrido durante migrazione
    if (typeof content === 'string') {
        this.element.innerHTML = content;
    } else {
        this.element.innerHTML = '';
        this.element.appendChild(content); // ✅ Supporto VanJS
    }
};
```

## 4. Refactoring `app_ui.js`

Sostituire la costruzione delle finestre e dei dialoghi.

### Esempio: Componente Reattivo (Stato KB)

Invece di aggiornare manualmente il DOM (`document.getElementById(...).innerText = ...`), usare `van.state`.

```javascript
// ✅ Definizione Stato
export const activeKbState = van.state("Nessuna KB");

// ✅ Binding (nella init o dove si crea l'elemento)
const displayElement = div(
    "KB Attiva: ", 
    activeKbState // <-- Si aggiorna magicamente quando cambia il valore
);

// ✅ Aggiornamento (ovunque nel codice)
activeKbState.val = "Nuova KB"; 
```

### Esempio: Creazione Lista (ex `elencoArtefatti`)

**PRIMA (uajtfh):**
```javascript
// ❌
let html = "<table>";
list.forEach(item => { html += "<tr><td>" + item + "</td></tr>"; });
html += "</table>";
wnd.setHtml(html);
```

**DOPO (VanJS):**
```javascript
// ✅
const buildList = (list) => {
    return table({ class: "table-data" },
        thead(tr(th("Nome"))),
        tbody(
            list.map(item => tr(
                td(item.name)
            ))
        )
    );
};
wnd.setHtml(buildList(myList));
```

## 5. Pattern Componenti

Creare componenti piccoli e riutilizzabili per bottoni e icone.

```javascript
const IconButton = (iconPath, onClick, tooltip) => {
    return button({ class: "btn-icon", onclick: onClick, "data-tt": tooltip },
        van.tags.svg({ viewBox: "0 0 24 24" }, 
            van.tags.path({ d: iconPath })
        )
    );
};
```

### Esempio: Componente Complesso (API Key Manager)

Il file `key_retriever.js` contiene un esempio eccellente di componente VanJS che gestisce:
- Stato reattivo locale (`van.state`).
- Re-rendering dinamico del `tbody` della tabella.
- Integrazione con IndexedDB asincrono.

```javascript
// Esempio logico dal gestore API Key
const dbState = van.state(db);

const rows = () => {
    const currentDb = dbState.val;
    // ... logica per generare le righe basata sullo stato
    return tbody(rowsArray);
};

// Il componente si auto-aggiorna quando dbState.val cambia
const content = div(AddForm(), table(thead(), rows)); 
```

## Checklist Migrazione

- [ ] Importare `van.mjs` in `app_ui.js`.
- [ ] Sostituire `WndDiv` e `WndPre` per usare `van.tags`.
- [ ] Riscrivere `elencoArtefatti`, `elencoDocs`, `elencoDati` usando `van.tags` (map su array).
- [ ] Sostituire `document.createElement` manuali con sintassi VanJS dove opportuno.
- [ ] Verificare che gli eventi (`onclick`) siano passati come funzioni (`() => ...`) e non stringhe.
