# JS VANILLA - REGOLE CODICE LLM

> **CRITICAL:** Queste regole sono VINCOLANTI. Nessuna eccezione salvo richiesta esplicita utente.

## REGOLE CATEGORICHE

### 1. LINGUA
- **Commenti/Docstring:** ITALIANO
- **Nomi (var/fn/class):** INGLESE

```javascript
// ✅ Recupera dati utente dal server
const fetchUserData = async function(userId) { ... }

// ❌ Fetch user data
const recuperaDati = async function(id) { ... }
```

### 2. RETURN STRICT (REGOLA AUREA)

**VIETATO:**
```javascript
return calculate(a) + b;              // ❌
return doSomething();                 // ❌
return { key: value };                // ❌
return isValid ? data : null;         // ❌
```

**OBBLIGATORIO:**
```javascript
const result = calculate(a) + b;      // ✅
return result;

const api = { doAction: doAction };   // ✅
return api;
```

### 3. ASYNC/AWAIT OBBLIGATORIO

```javascript
// ✅ CORRETTO
const data = await fetch(url);
const json = await data.json();

// ❌ VIETATO
fetch(url).then(r => r.json()).then(...);
```

### 4. VARIABILI
- `const` di default
- `let` solo se riassegnazione necessaria
- `var` **VIETATO**

### 5. FAIL FAST
```javascript
const processData = function(data) {
    // Validazione SEMPRE all'inizio
    if (!data) {
        console.error("processData: data mancante");
        return null;
    }
    
    if (!data.id) {
        console.error("processData: data.id mancante");
        return null;
    }
    
    // Logica principale
    const result = _process(data);
    return result;
};
```

## FACTORY/CLOSURE PATTERN (STANDARD)

```javascript
"use strict";

/**
 * Gestore [FUNZIONALITÀ].
 * Descrizione scopo modulo.
 */
const UaModuleName = function(containerId, config = {}) {
    
    // 1. STATO PRIVATO
    const _container = document.getElementById(containerId);
    let _state = null;
    
    // 2. FUNZIONI PRIVATE
    const _validate = function(data) {
        if (!data) return false;
        const isValid = true;
        return isValid;
    };
    
    // 3. FUNZIONI PUBBLICHE
    const loadAsync = async function(id) {
        // Fail Fast
        if (!id) {
            console.error("UaModule.loadAsync: id mancante");
            return null;
        }
        
        let result = null;
        
        try {
            const response = await fetch(`/api/${id}`);
            const data = await response.json();
            
            if (_validate(data)) {
                result = data;
            }
        } catch (error) {
            console.error("UaModule.loadAsync:", error);
            result = null;
        }
        
        return result;
    };
    
    // 4. API PUBBLICA
    const api = {
        loadAsync: loadAsync
    };
    return api;
};
```

## DOM MANIPULATION

```javascript
// ✅ Selezione
const el = document.getElementById("id");
const els = document.querySelectorAll(".class");

// ✅ Creazione
const div = document.createElement("div");
div.className = "item";
div.textContent = text;

// ✅ Event
button.addEventListener("click", handleClick);

// ✅ Style
element.classList.add("active");
element.style.backgroundColor = "#fff";
```

## GESTIONE ERRORI

```javascript
const riskyOp = async function(param) {
    if (!param) {
        console.error("riskyOp: param mancante");
        return null;
    }
    
    let result = null;
    
    try {
        const data = await fetchData(param);
        result = data;
    } catch (error) {
        console.error("riskyOp:", error);
        result = null;
    }
    
    return result;
};
```

## ANTI-PATTERN VIETATI

```javascript
// ❌ One-liner complesso
return users.filter(u => u.active).map(u => u.name);

// ✅ Esplicito
const active = users.filter(u => u.active);
const names = active.map(u => u.name);
return names;

// ❌ Ternario annidato
const x = a ? (b ? c : d) : e;

// ✅ If esplicito
let x = e;
if (a) {
    x = b ? c : d;
}
return x;

// ❌ Magic numbers
setTimeout(fn, 5000);

// ✅ Costanti
const TIMEOUT_MS = 5000;
setTimeout(fn, TIMEOUT_MS);
```

## CHECKLIST RAPIDA

Prima di confermare codice:

- [ ] Ogni `return` ha variabile nominata prima?
- [ ] Commenti in ITALIANO, nomi in INGLESE?
- [ ] Usato `async/await` invece `.then()`?
- [ ] `const` di default, no `var`?
- [ ] Validazione input all'inizio funzione?
- [ ] Factory pattern per moduli?
- [ ] Try-catch per async con log errori?
- [ ] Nessun one-liner complesso?

## PRIORITÀ

1. **Return Strict** - Zero eccezioni
2. **Fail Fast** - Validazione immediata
3. **Async/Await** - No Promise chains
4. **Esplicitezza** - 10 righe chiare > 3 eleganti

**IN DUBBIO:** Scegli sempre opzione più esplicita e verbosa.
