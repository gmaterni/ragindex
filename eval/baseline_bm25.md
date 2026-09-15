# Baseline BM25 (pre-rerank) — change rerank-contesto

> Misurata sul codice prima dell'introduzione del giudizio semantico.
> Data: 2026-09-15. Eseguibile: app browser (menu Test Provider per i modelli,
> conversazione reale per il retrieval) + casi in `eval/retrieval_cases.json`.

## Comportamento osservato (analisi del codice)

| Aspetto | Valore baseline |
|---|---|
| Ordinamento candidati | Solo score BM25 Lunr (query programmatica OR) |
| Strategie | distilled → local → single-wildcard, prima non vuota vince |
| Filtri | Soglia 0.2 × topScore, max 8 parent, budget 70% window |
| Sinonimi/parafrasi (S01–S04, S07, S11–S12, S15) | Recuperati solo se distillazione o wildcard coprono la variante; nessun giudizio di significato |
| Falsi positivi (S10) | Parent con keyword frequente ma fuori tema incluso se score alto |
| Fallback totale | Contesto vuoto → chat libera senza avviso in UI |
| Log | Solo `Strategia contesto: <nome> (<N> caratteri)` |

## Metriche da compilare sui casi (KB reale, expectedParentIds compilati)

| Caso | Strategia vincente | Rank attesi | Pertinenti in top-8 | Note |
|---|---|---|---|---|
| S01 … S18 | — | — | — | da compilare eseguendo le 18 domande |

## Criterio di successo del rerank (task 4.2)

- recall@8 su S01–S18 invariato o migliore rispetto a questa baseline;
- nessun caso S05/S06/S09/S13/S17 peggiorato (casi BM25-noti di non regressione);
- fallback BM25 identico a questa baseline quando il giudice fallisce o è disattivato.
