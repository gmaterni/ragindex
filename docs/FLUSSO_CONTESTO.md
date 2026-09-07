# Flusso di Creazione Contesto

> Schema astratto: come una domanda dell'utente diventa contesto per l'LLM.
> Per i dettagli implementativi vedi `PIPELINE_CREA_CONTESTO.md`.

---

## Idea di base

L'LLM non vede direttamente i documenti. Vede solo la **domanda originale**
affiancata a un **contesto** — frammenti selezionati dalla Knowledge Base
pertinenti rispetto alla domanda. Il contesto agisce da fonte di verità:
l'LLM risponde basandosi solo su di esso.

```
Domanda ──► Esplosione ──► KB ──► Contesto ──► LLM
                                              │
                                         Risposta
```

---

## Le 4 fasi

### 1. Esplosione della domanda

La domanda utente viene **trasformata in termini di ricerca** ottimizzati
per interrogare la KB. Il metodo è astratto e intercambiabile:

- **Lessicale**: estrazione di parole chiave (nomi, entità, concetti)
- **Semantico**: embedding vettoriali, espansione con sinonimi
- **Ibrido o altro**: qualsiasi strategia che produca termini di ricerca

L'input è una domanda in linguaggio naturale; l'output è un insieme di
termini di ricerca. Il metodo specifico non vincola il resto del flusso.

### 2. Interrogazione della KB

I termini di ricerca vengono sottoposti alla Knowledge Base, che restituisce
una lista di frammenti **ordinati per pertinenza** (score decrescente).

Ogni risultato identifica un frammento "fine" (child) appartenente a un
frammento "ampio" (parent). La KB è opaca: il flusso conosce solo
l'interfaccia `search(termini) → risultati ordinati`.

### 3. Estrazione del contesto

Dai risultati si risalgono i frammenti ampi (parent) e li si deduplica
(un parent può apparire più volte). I frammenti vengono concatenati in un
contesto testuale fino a riempire una **quota fissa** della finestra del
modello (70% di default). Oltre quella soglia ci si ferma.

### 4. Invio all'LLM

La **domanda originale** (non i termini di ricerca) viene inviata
all'LLM insieme al contesto estratto e all'eventuale cronologia:

```
SYSTEM: "Rispondi solo dal contesto; se insufficiente, dillo"
        + contesto estratto
USER:   domanda originale (invariata)
        + cronologia conversazione (se presente)
```

L'LLM genera la risposta basandosi esclusivamente sul contesto fornito.

---

## Prima domanda vs. domande successive

| | Prima domanda | Domande successive |
|---|---|---|
| Esplosione | Sì | No |
| Interrogazione KB | Sì | No |
| Contesto | Costruito ex novo | Riutilizzato da cache |
| Domanda inviata | Originale | Originale + cronologia completa |

Il contesto viene calcolato una sola volta all'inizio della conversazione
e riutilizzato per tutto il dialogo. Solo la cronologia cresce.

---

## Cosa è intercambiabile

Il flusso è indipendente dalle scelte implementative:

| Blocco | Alternativa valida |
|---|---|
| Esplosione (fase 1) | Lessicale, semantica, ibrida, o assente (query diretta) |
| KB (fase 2) | Indice inverso, vector DB, ricerca full-text |
| Estrazione (fase 3) | Top-k, reranking, MMR, compressione |
| LLM (fase 4) | Qualsiasi provider |

L'unico vincolo: l'output di ogni fase deve rispettare l'input atteso
dalla successiva.
