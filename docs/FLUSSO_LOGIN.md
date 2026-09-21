# Flusso di Login — Locale e Remoto

Come l'app decide se l'utente è autenticato, in base all'ambiente.

---

## Panoramica

```
ragindex.html          ← landing page marketing (nessuna guardia)
     │ link "Avvia RagIndex Now"
     ▼
index.html (root)      ← redirect nudo a static/index.html
     ▼
static/index.html      ← GUARDIA LOGIN (inline JS, sincrono)
     │
     ├── needsLogin? → login.html (Google OAuth) → index.html → static/index.html → APP
     │
     └── OK → APP (static/js/app.js)
```

La guardia è un **`<script type="module">` inline** in `static/index.html:9-16`,
eseguito prima del rendering del DOM. Se blocca, l'app non si carica.

---

## La guardia in dettaglio

`static/index.html:9-16`:

```js
import { DISABLE_LOGIN_ON_LOCAL, isLocalEnvironment } from './js/services/config.js';

const needsLogin      = !localStorage.getItem('user_web_id');
const isLocalBypass   = DISABLE_LOGIN_ON_LOCAL && isLocalEnvironment();

if (needsLogin && !isLocalBypass) {
    window.location.replace('login.html');
}
```

| Condizione | Comportamento |
|---|---|
| `needsLogin=true` + `isLocalBypass=false` | Redirect a `login.html` |
| `needsLogin=false` | App carica (utente già loggato) |
| `needsLogin=true` + `isLocalBypass=true` | App carica (locale, bypass attivo) |

---

## Login remoto (produzione)

### Commutazione ambiente

`isLocalEnvironment()` in `config.js:31` restituisce `true` solo per
`localhost`, `127.0.0.1` o protocollo `file:`. Su un dominio remoto è
sempre `false`, quindi `isLocalBypass` è sempre `false`.

### Flusso

1. Utente arriva su `static/index.html`
2. `localStorage.user_web_id` assente → `needsLogin = true`
3. `isLocalBypass = false` (non è localhost)
4. Redirect a `login.html`
5. `login.html:40-44`: dopo OAuth Google, salva l'email in `localStorage.user_web_id` e reindirizza a `index.html`
6. Ciclo: `index.html` → `static/index.html` → guardia → `needsLogin = false` → **app**

```
static/index.html ──no user_web_id──► login.html ──Google OAuth──►
    localStorage.user_web_id = email
    ──► index.html ──► static/index.html ──user_web_id OK──► APP
```

### Fallback guest

`WebId.get()` (webuser_id.js) prevede un caso guest se per qualche
motivo l'utente arrivasse all'app senza email in localStorage:

```
"ragindex_guest_<timestamp>"
```

Nel flusso normale non si verifica mai (la guardia blocca prima).

---

## Login locale (sviluppo)

### Attivazione bypass

In `config.js`:

```js
export const DISABLE_LOGIN_ON_LOCAL = true;   // ← bypass abilitato
export const LOCAL_USER_ID = "user_local";     // ← ID assegnato
```

Quando si è su `localhost`, `127.0.0.1` o `file:`:
- `isLocalEnvironment()` → `true`
- `isLocalBypass = DISABLE_LOGIN_ON_LOCAL && true` → `true`
- La guardia salta: l'app carica senza mai passare da `login.html`

### Risoluzione userId

`WebId.get()` in `webuser_id.js:16-17`:

```js
if (DISABLE_LOGIN_ON_LOCAL && isLocalEnvironment()) {
    return LOCAL_USER_ID;    // "user_local"
}
```

Quindi in locale `userId` = `"user_local"`, costante, per tutti.

---

## Impatto su altri servizi

### Sender (telemetria)

`sender.js:99`:

```js
if (DISABLE_SENDER_ON_LOCAL && isLocalEnvironment()) {
    console.info("UaSender.sendEventAsync: invio saltato (ambiente locale)");
    return null;
}
```

In locale la telemetria è disabilitata automaticamente. In remoto viene
inviata con `userId` = email dell'utente (o guest ID se fallback).

### Database IndexedDB

Il nome del database Dexie include `userId`:

```
RagIndexDB_<userId>
```

In locale: `RagIndexDB_user_local`
In remoto: `RagIndexDB_mario.rossi@gmail.com` (o guest)

Questo garantisce isolamento dei dati tra ambienti e tra utenti.

---

## Riepilogo

| Aspetto | Locale | Remoto |
|---|---|---|
| Guardia login | Bypassata (`DISABLE_LOGIN_ON_LOCAL=true`) | Attiva |
| Login richiesto | No | Sì (Google OAuth) |
| `userId` (WebId.get) | `"user_local"` (costante) | Email utente o guest |
| Sender telemetria | Disabilitato | Abilitato |
| DB IndexedDB | `RagIndexDB_user_local` | `RagIndexDB_<email>` |
