#!/usr/bin/env python3
# coding: utf-8
"""
Questo modulo contiene le funzioni per assemblare i prompt inviati agli LLM.
Ogni funzione prepara e restituisce una lista di messaggi strutturati
(system, user, assistant) per un compito specifico della pipeline.
"""

from prompt_assembler import PromptAssembler


def prompt_chunking(text: str) -> list:
    asm = PromptAssembler()
    system_message = """
# RUOLO
Sei un motore di segmentazione testuale avanzato. Il tuo compito è dividere un testo in frammenti (chunk) di alta qualità, ottimizzati per sistemi di ricerca semantica e retrieval-augmented generation (RAG).

# OBIETTIVO
Creare chunk che siano semanticamente autosufficienti, coerenti e granulari, massimizzando la capacità di recupero delle informazioni rilevanti.

# PRINCIPI GUIDA PER UN CHUNK DI QUALITÀ

1. AUTOSUFFICIENZA SEMANTICA
   Ogni chunk deve essere comprensibile anche se letto in isolamento. Deve contenere il soggetto principale, il contesto minimo necessario e le informazioni correlate dirette.

2. COERENZA TEMATICA
   Ogni chunk deve focalizzarsi su un singolo argomento, evento, concetto o unità logica. Evita chunk che mescolano temi non correlati.

3. COMPLETEZZA CONTESTUALE
   Un chunk deve catturare un'idea centrale con il suo contesto immediato, senza creare dipendenze forti da altri chunk.

# REGOLE PROCEDURALI DI SEGMENTAZIONE

## QUANDO TAGLIARE (Crea un nuovo chunk)

- Cambio di Argomento: Quando il testo inizia a trattare un nuovo tema, concetto o soggetto principale.
- Cambio di Scena o Tempo: Quando c'è un salto temporale, spaziale o narrativo evidente.
- Cambio di Prospettiva: Quando si passa da un punto di vista a un altro (es. diversi autori citati).
- Fine di Unità Logica: Dopo la conclusione di una spiegazione, argomentazione o esempio completo.

## QUANDO NON TAGLIARE (Mantieni insieme)

- Affermazione + Esempio: Non separare mai una definizione, teoria o affermazione dal suo esempio diretto o illustrazione.
- Riferimenti Anaphorici: Se una frase inizia con pronomi o riferimenti diretti ("Lui...", "Questo processo...", "Tale fenomeno..."), uniscila alla frase precedente.
- Cause ed Effetti: Mantieni insieme relazioni causali esplicite ("perciò", "quindi", "di conseguenza").
- Liste Brevi: Se una lista numerata/puntata è inferiore a 600 caratteri totali, mantienila come chunk unico.
- Enumerazioni Incomplete: Non separare mai "i tre fattori sono:" dalla lista che segue.

## VINCOLI DIMENSIONALI (Limiti obbligatori)

DIMENSIONI TARGET:
- Minimo: 300 caratteri (~60 parole)
- Range ideale: 400-900 caratteri (~80-180 parole)
- Massimo standard: 1000 caratteri (~200 parole)
- Massimo esteso: 1200 caratteri (solo per unità semantiche indivisibili)

REGOLA DI CONTEGGIO: 
Conta i caratteri del chunk inclusi spazi e punteggiatura. Se fuori range, rivaluta la segmentazione.

RISOLUZIONE CONFLITTI:
- Se un'unità semantica coerente supera 1000 caratteri:
  1. Cerca sotto-argomenti o punti logici di divisione naturale
  2. Se impossibile senza compromettere la coerenza, accetta fino a 1200 caratteri
  3. Non superare mai 1200 caratteri: in quel caso, dividi privilegiando la coerenza del primo chunk

- Se il testo totale è inferiore a 300 caratteri:
  1. Restituisci come unico chunk (non applicare il minimo)

# GESTIONE CASI SPECIALI

## Liste e Enumerazioni
- Liste brevi (<600 caratteri): Mantieni come chunk unico includendo l'introduzione
- Liste lunghe (>600 caratteri): Dividi per gruppi tematici mantenendo intestazioni

## Codice e Tabelle
- Considera blocchi di codice e tabelle come unità atomiche
- Non dividere mai all'interno di un blocco di codice
- Se una tabella supera 1200 caratteri, dividila per righe semantiche (es. per categoria)

## Dialoghi e Citazioni
- Raggruppa battute consecutive dello stesso parlante se totale <1000 caratteri
- Mantieni citazioni lunghe insieme al loro contesto introduttivo

## Formule e Notazioni Tecniche
- Mantieni formule matematiche/scientifiche con la loro spiegazione immediata
- Non separare variabili dalle loro definizioni

# FORMATO OUTPUT (Obbligatorio)

Restituisci i chunk utilizzando questo formato esatto, numerandoli progressivamente a partire da 001:

<<<id=001>>>
[Testo esatto del primo chunk, copiato fedelmente dal testo originale]
<<<te>>>

<<<id=002>>>
[Testo esatto del secondo chunk, copiato fedelmente dal testo originale]
<<<te>>>

<<<id=003>>>
[Testo esatto del terzo chunk, copiato fedelmente dal testo originale]
<<<te>>>

REGOLE FORMATO:
- ID progressivi a tre cifre: 001, 002, 003, ..., 999
- Copia il testo esattamente come appare nell'originale (preserva maiuscole, punteggiatura, spaziature)
- Non aggiungere commenti o metadati oltre al formato specificato
- Separa ogni chunk con una riga vuota per leggibilità

# ESEMPIO PRATICO

Input:
"La fotosintesi clorofilliana è il processo biochimico mediante il quale le piante verdi, le alghe e alcuni batteri convertono l'energia luminosa in energia chimica. Questo meccanismo avviene principalmente nei cloroplasti delle cellule vegetali e richiede tre elementi fondamentali: acqua (H₂O), anidride carbonica (CO₂) e luce solare. Il processo si divide in due fasi: la fase luminosa, che cattura l'energia solare, e la fase oscura o ciclo di Calvin, che sintetizza glucosio."

Output corretto:
<<<cid=001>>>
La fotosintesi clorofilliana è il processo biochimico mediante il quale le piante verdi, le alghe e alcuni batteri convertono l'energia luminosa in energia chimica. Questo meccanismo avviene principalmente nei cloroplasti delle cellule vegetali e richiede tre elementi fondamentali: acqua (H₂O), anidride carbonica (CO₂) e luce solare.
<<<te>>

<<<id=002>>>
Il processo si divide in due fasi: la fase luminosa, che cattura l'energia solare, e la fase oscura o ciclo di Calvin, che sintetizza glucosio.
<<<te>>>

# CHECKLIST FINALE (Verifica mentale prima di output)

Prima di restituire i chunk, verifica:
- [ ] Ogni chunk è comprensibile da solo?
- [ ] Ogni chunk rispetta i limiti dimensionali (300-1200 caratteri)?
- [ ] Ho evitato di separare esempi dalle loro definizioni?
- [ ] Ho mantenuto insieme riferimenti diretti e pronomi con i loro antecedenti?
- [ ] Il formato output è esattamente quello richiesto?
- [ ] La numerazione è progressiva e corretta?

# PRIORITÀ IN CASO DI CONFLITTO

1. Coerenza semantica (non creare chunk incomprensibili)
2. Limiti dimensionali (rispetta 300-1200 caratteri)
3. Granularità (preferisci chunk più piccoli se semanticamente validi)
"""

    user_message = f"""
# TESTO DA SEGMENTARE

```txt
{text}
```

Procedi con la segmentazione seguendo rigorosamente le regole definite.
"""

    asm.set_system_message(system_message)
    asm.add_user_message(user_message)
    return asm.get_messages()


def prompt_recombine_and_annotate(chunk_file_content: str) -> list:
    asm = PromptAssembler()
    system_message = """
# RUOLO
Sei un sistema AI per l'elaborazione e l'annotazione di testi strutturati, ottimizzato per la ricerca lessicale.

# OBIETTIVO
Annotare e ricombinare i chunk di testo forniti in input.

# REGOLE FONDAMENTALI
1. COPIA VERBATIM: Il testo originale di ogni chunk (`<<<id=...>>>...<<<te>>>`) deve essere ricopiato nell'output esattamente come appare nell'input, senza alcuna alterazione.
2. FORMATO RIGIDO: L'output deve seguire scrupolosamente la struttura definita nell'esempio. Ogni chunk di testo originale è seguito immediatamente dal suo blocco di annotazione.

# REGOLE DI ANNOTAZIONE (per ogni chunk)

## Keywords (KW)
OBIETTIVO: Espansione lessicale per la ricerca (BM25).
QUANTITÀ: Genera una lista di 10-25 termini.
[CRITICO] NON RIPETERE: Le keyword NON devono contenere parole o radici già presenti nel testo del chunk. L'obiettivo è aggiungere termini nuovi e semanticamente affini.
CONTENUTO: Includi sinonimi, iperonimi, iponimi e concetti correlati. Evita termini generici non specifici al contesto.

## Entità (EN)
OBIETTIVO: Elencare i nomi propri rilevanti presenti nel chunk.
QUANTITÀ: Massimo 5 entità.
FORMATO: Lista semplice, separata da virgola (es. `Mario Rossi, Roma`). Se non ci sono entità, scrivi `[nessuna]`.

# SCHEMA DEL PROCESSO
1. Per ogni chunk nell'INPUT:
2. Estrai l'ID e il testo del chunk.
3. Genera KW ed EN per quel chunk, rispettando le regole.
4. Costruisci il blocco di annotazione (`<<<a=ID>>>...<<<ae>>>`).
5. Combina: `[TESTO ORIGINALE DEL CHUNK] + [BLOCCO ANNOTAZIONE]`.
6. Concatena tutti i risultati nell'ordine originale.

# ESEMPIO

## INPUT:
```text
<<<id=01>>>
Il Machine Learning è una branca dell'intelligenza artificiale.
<<<te>>>
```

## OUTPUT (La tua risposta):
```text
<<<id=01>>>
Il Machine Learning è una branca dell'intelligenza artificiale.
<<<te>>>
<<<a=01>>>
KW: apprendimento automatico, ML, IA, modello predittivo, training, addestramento, rete neurale, sistema, software, automazione, programmazione, codice, supervisionato, non supervisionato, dati
EN: Machine Learning, intelligenza artificiale
<<<ae>>>
```

# ESECUZIONE
Applica le regole e lo schema del processo al testo seguente:
"""
    user_message = f"""
{chunk_file_content}
"""
    asm.set_system_message(system_message)
    asm.add_user_message(user_message)
    return asm.get_messages()


def prompt_conversation_with_context(context: str, query: str) -> list:
    asm = PromptAssembler()
    system_message = """Il tuo compito è rispondere alla domanda dell'utente nel modo più completo e utile possibile.

Per farlo, hai a disposizione due fonti di informazione:
1. I documenti forniti nel "Contesto".
2. La tua conoscenza generale.

Il tuo processo di risposta deve essere:
- Leggi la domanda dell'utente.
- Leggi i documenti nel contesto per vedere quali informazioni pertinenti contengono.
- Formula la risposta migliore possibile, integrando fin da subito le informazioni del contesto con la tua conoscenza generale.
- Se il contesto contiene informazioni utili, citale e usale come prova a supporto della tua risposta.
- Se il contesto è scarso, irrilevante o assente, rispondi comunque in modo esauriente usando la tua conoscenza generale.
- Specifica sempre la fonte delle tue affermazioni (il nome del documento o "conoscenza generale")."""
    user_message = f"""
# Contesto
{context}

# Domanda
{query}
"""
    asm.set_system_message(system_message)
    asm.add_user_message(user_message)
    msgs = asm.get_messages()
    return msgs

######################################


def prompt_annotazione(text: str) -> list:
    asm = PromptAssembler()
    system_message = """
# RUOLO
Esperto di segmentazione testuale e annotazione per ricerca lessicale (BM25).

# OBIETTIVO
Segmenta il testo in chunk autonomi e annota con Keywords (KW) ed Entità (EN) per ricerca lessicale BM25.

# FORMATO OUTPUT
<<<id=01>>>
[Testo ESATTO del chunk]
<<<te>>>
<<<a=01>>>
KW: [15-20 keywords separate da virgola]
EN: [entità separate da virgola, o [nessuna]]
<<<ae>>>
---
# REGOLE CRITICHE

## 1. AUTONOMIA SEMANTICA (priorità assoluta)
- Ogni chunk DEVE avere senso da solo
- ANTI-ANAFORA: Se inizia con "questo/ciò/esso/tale", ESTENDI per includere il riferimento
- NON spezzare concetti a metà

## 2. DIMENSIONE (limiti rigidi)
VINCOLI OBBLIGATORI:
- Minimo: 300 caratteri (~60 parole) 
- Target ideale: 400-800 caratteri (~80-160 parole)
- Massimo assoluto: 1000 caratteri (~200 parole)
REGOLA: Conta i caratteri del chunk (spazi inclusi). Se fuori range, ri-segmenta.
PRIORITÀ: L'autonomia semantica prevale, ma solo entro il massimo di 1000 caratteri.

## 3. COPIA ESATTA
- Testo originale IDENTICO, zero modifiche
---
# ANNOTAZIONI

## KW (Keywords): 15-20 termini
Per ogni concetto principale:
- 2-3 sinonimi diretti
- 1-2 iperonimi/iponimi
- 2-3 termini correlati
- 1-2 varianti morfologiche

REGOLE:
- ❌ NO parole già nel testo
- ❌ NO duplicati
- ❌ NO generici ("cosa", "fare", "tipo")
- ✅ Focus su varianti lessicali per ricerca

## EN (Entità): max 5 nomi propri
SOLO nomi univoci:
- ✅ Persone, Organizzazioni, Luoghi, Prodotti nominati, Opere
- ❌ NO concetti astratti (Machine Learning → va in KW)
- ❌ NO etichette ("SI: Einstein" | "NO: PERSONA:Einstein")

Se nessuna: [nessuna]
---
# ESEMPI

## Input: "Il Machine Learning è una branca dell'intelligenza artificiale. Questa tecnologia usa algoritmi per identificare pattern nei dati."
## Output:
<<<id=01>>>
Il Machine Learning è una branca dell'intelligenza artificiale. Questa tecnologia usa algoritmi per identificare pattern nei dati.
<<<te>>>
<<<a=01>>>
KW: ML, apprendimento automatico, AI, modello, rete neurale, addestramento, software, automazione, procedura, schema, struttura, regolarità, riconoscimento, analisi, dataset, informazioni
EN: [nessuna]
<<<ae>>>
---
## Input: "Einstein formulò la teoria della relatività nel 1915 a Berlino."
## Output:
<<<id=01>>>
Einstein formulò la teoria della relatività nel 1915 a Berlino.
<<<te>>>
<<<a=01>>>
KW: Albert Einstein, teorizzare, proporre, relatività generale, fisica teorica, scoperta, rivoluzione scientifica, cosmologia, XX secolo, Germania
EN: Einstein, Berlino
<<<ae>>>
"""
    user_message = f"""
Testo da processare:
```txt
{text}
```
"""
    asm.set_system_message(system_message)
    asm.add_user_message(user_message)
    return asm.get_messages()
