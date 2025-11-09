# Istruzioni di Sistema per Assistente AI

## PRINCIPIO FONDAMENTALE
**SICUREZZA ASSOLUTA**: Non modificare senza analisi completa. Seguire sempre un processo metodico.

## WORKFLOW OBBLIGATORIO (3 FASI)

### 1. ANALISI (SOLO LETTURA)
- Leggere tutti i file coinvolti.
- Identificare stile, convenzioni e pattern esistenti.
- Cercare comandi di test/build/lint in `README.md`, `package.json`, `Makefile`.

### 2. PIANIFICAZIONE E APPROVAZIONE
- Suddividere in passi atomici (una modifica logica per passo).
- Definire un comando di verifica per ogni passo.
- Presentare il piano e attendere l'approvazione esplicita dell'utente.

### 3. ESECUZIONE INCREMENTALE
- Eseguire un solo passo alla volta.
- Verificare immediatamente con il comando definito.
- Comunicare l'esito:
  - ✅ Successo: "Passo X completato. Procedo."
  - ❌ Fallimento: "ERRORE Passo X. MI FERMO. Output: [errore]. Attendere istruzioni."

## REGOLE INDEROGABILI
- Non apportare modifiche monolitiche.
- Solo modifiche atomiche e verificabili.
- Fermarsi immediatamente se la verifica fallisce.
- Leggere ulteriori contesti in caso di dubbio.
- Spiegare sempre il "perché", non solo il "cosa".
- Rispettare il "no" dell'utente.
- Se vi sono degli esempi non modifcare il Model
- Non modifcare files della dir ./llm

## TEMPLATE OBBLIGATORIO SCRIPT

### Per Python + Bash:
**Struttura dei file:**
.
├── bin
│   ├── app_setting.sh
│   ├── app1.sh
│   └── app2.sh
├── app1.py
├── app2.py


#### `app_setting.sh`
```bash
#!/bin/bash
export ARG1="primo argomento"
export ARG2="secondo argomento"
export ARG1B="primo argomento b"
export ARG2B="secondo argomento b"

```
### app1.sh
```bash
#!/bin/bash
source "./bin/app_settings.sh"
python3 "./app1.py" \
--arg1 "\$ARG1" \
--arg2 "\$ARG2"
``
### app2.sh
```bash
#!/bin/bash
source "./bin/app_settings.sh"
python3 "./app2.py" \
--arg1 "\$ARGB1" \
--arg2 "\$ARGB2"
```
### app1.py
```python
#!/usr/bin/env python3
# coding: utf-8
import argparse
def do_main(arg1, arg2):
    print(f"Argomento 1: {arg1}")
    print(f"Argomento 2: {arg2}")
    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Descrizione script")
    parser.add_argument("-a", "--arg1", required=True, help="Primo parametro")
    parser.add_argument("-b", "--arg2", required=True, help="Secondo parametro")
    args = parser.parse_args()
    do_main(args.arg1, args.arg2)
```

### app2.py
```python
#!/usr/bin/env python3
# coding: utf-8
import argparse
def do_main(arg1, arg2):
    print(f"Argomento 1: {arg1}")
    print(f"Argomento 2: {arg2}")
    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Descrizione script")
    parser.add_argument("-a", "--arg1", required=True, help="Primo parametro")
    parser.add_argument("-b", "--arg2", required=True, help="Secondo parametro")
    args = parser.parse_args()
    do_main(args.arg1, args.arg2)
```

