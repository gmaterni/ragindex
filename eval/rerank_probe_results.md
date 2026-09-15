# Verifica rerank via probe — change rerank-contesto

> Eseguito: 2026-09-15 con `node test/retrieval_probe.mjs /tmp/opencode/probe_docs`
> (3 doc .txt campione, 4 parent). Harness: `test/retrieval_probe.mjs` v1.1.0.
> Esito: exit 0, nessuna regressione.

## Risultati

| Sezione | Esito |
|---|---|
| Domande Q1–Q8 (recall atteso) | 8/8 trovate al rank 1 |
| Robustezza R1–R6 (sintassi, preamboli, elenchi, apostrofi, termini assenti) | 6/6 ok, nessun errore |
| Cascata D1–D6 (base strategia) | 6/6 base corretta (`distilled`/`local`/`single-wildcard`/`none`) |
| Prompt P1–P2 (isolamento `<source>`) | 2/2 ok |
| J1 promozione semantica | Giudice finto promuove ultimo parent BM25 → primo nel contesto; strategia `distilled+rerank` |
| J2 giudice inaffidabile | Contesto identico al BM25 puro; strategia `distilled+bm25` |

## Log strategie osservato

Ogni ramo di cascata riporta il suffisso di ordinamento (`+rerank` / `+bm25`);
`none` invariato a strategie esaurite. Una sola riga `Rerank semantico: ...`
nel caso J1, come previsto.

## Misura sintetica del meccanismo (giudice-oracolo, upper bound)

> Script: `/tmp/opencode/eval_rerank.mjs` (non committato, riusa worker e
> `rag_engine` reali). Corpus: 4 doc sintetici con distrattori lessicali
> (ripetizione del termine della domanda) contro parent pertinenti con
> sinonimo. Giudice-oracolo: 5 se il parent contiene la sottostringa attesa,
> altrimenti 0. Misura il meccanismo di riordino, NON la qualita' di un LLM.

| Caso | Atteso in | bm25Rank | rerankRank | Verdetto |
|---|---|---|---|---|
| E1 "deceduto" → "scomparsa" | parent con "scomparsa" | 2 | 1 | promosso |
| E2 "effetti collaterali" → "reazioni avverse" | parent con "reazioni avverse" | 1 | 1 | conservato |
| E3 "bocciato" → "bocciatura" | parent con "bocciatura" | 1 | 1 | conservato |
| E4 controllo | parent con "migrazione" | 1 | 1 | conservato |

Lettura onesta: il meccanismo promuove il parent semanticamente pertinente
quando e' tra i candidati BM25 e non danneggia i casi gia' corretti. Resta
fuori misura la qualita' del giudice reale (serve provider + chiavi) e il
caso limite del parent lessicalmente invisibile (zero termini in comune:
BM25 non lo candida e il rerank non puo' recuperarlo — futura espansione HyDE).

## Giudizio reale con provider (una chiamata, 2026-09-15)

> Script monouso in /tmp (non committato): prompt reale di
> `promptBuilder.buildRerankPrompt` + `GroqClient` reale + modello
> `groq/compound-mini`, 3 candidati brevi, nessun retry. Chiavi mai stampate.
> Tentativi Mistral: 2 respinti con 429 (rate limit, nessun addebito).

Domanda: "Quando e deceduto il poeta?"

| Candidato | Testo | Punteggio reale |
|---|---|---|
| d0p0 | "La scomparsa del poeta..." (sinonimo, pertinente) | 4 |
| d0p1 | "Il poeta vinse ogni premio..." (match lessicale, fuori tema) | 0 |
| d1p0 | "I lupi cacciano..." (irrilevante) | 0 |

Risposta grezza: `d0p0:4 / d0p1:0 / d1p0:0` — formato rispettato senza preamboli,
`parseRerankScores` produce l'ordinamento atteso con pertinente primo.
Il giudice distingue il sinonimo pertinente dal match lessicale spurio:
proprio il caso che BM25 da solo non risolve.

## Da chiudere con KB reale (task 4.2)

1. Compilare `expectedParentIds` in `eval/retrieval_cases.json` con gli ID della KB in uso.
2. Porre le 18 domande nell'app (rerank attivo) e registrare recall@8/MRR in `eval/baseline_bm25.md`.
3. Confrontare con la baseline; criterio: recall invariato o migliore, nessun peggioramento su S05/S06/S09/S13/S17.
