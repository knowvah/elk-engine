---
title: Contribuire
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contribuire

Leggi prima la [Panoramica](/it/guide/overview) e le [Regole di traduzione](/guide/translation-rules). Il Java
al commit fissato è la specifica; nel dubbio, leggi il Java.

## Gate

Eseguili prima di ogni commit. Ognuno deve passare.

| Comando                | Verifica                                                 |
| ---------------------- | -------------------------------------------------------- |
| `npm run format:check` | Formattazione Prettier                                   |
| `npm run typecheck`    | Controllo dei tipi TypeScript (`tsc --noEmit` nativo)    |
| `npm test`             | La suite vitest, inclusa la suite golden                 |
| `npm run coverage`     | La suite con il 90% di righe, rami, funzioni e statement |

Richiede Node 22 o successivo. Installa le dipendenze con `npm ci`.

## I test sono immutabili

I valori attesi provengono dall'oracolo, dai vettori JVM o dal sorgente Java prima che l'implementazione venga
scritta (AD-13). Una volta scritta, un'asserzione è congelata: un test che fallisce significa che l'implementazione
è sbagliata.

Se un test può passare solo modificando la sua asserzione, un vettore o un golden, fermati e registra il caso
nel diario delle decisioni della missione. Non allentare una tolleranza, non eliminare un caso e non rigenerare un
riferimento per ottenere il verde. I riferimenti golden si rigenerano tramite script, mai a mano.

## Flusso di lavoro

1. Crea un branch di feature, per esempio `feature/<short-description>`.
2. Scrivi i messaggi di commit come [Conventional Commits](https://www.conventionalcommits.org), per esempio
   `feat(java): add JavaHashMap`. Gli oggetti sono in minuscolo e lunghi al massimo 72 caratteri.
3. Apri una pull request verso `main`. La CI controlla il titolo della pull request come Conventional Commit.
4. I commit devono essere firmati; il ruleset del repository lo richiede.
5. Le pull request vengono unite con un merge commit.

Ogni file di codice porta un'intestazione SPDX, `// SPDX-License-Identifier: EPL-2.0`. Un test di fitness
la impone. Le dipendenze devono essere compatibili con EPL-2.0.

## Comandi della documentazione

| Comando                | Scopo                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run docs:dev`     | Avvia il sito della documentazione con ricaricamento in tempo reale |
| `npm run docs:build`   | Compila il sito; un link interno rotto fa fallire la compilazione   |
| `npm run docs:preview` | Serve il sito compilato in locale                                   |

La maggior parte delle pagine di riferimento include file da `docs/`. Modifica il file in `docs/`, non la pagina
sotto `docs-site/`. I diagrammi PlantUML nei file inclusi vengono resi in SVG e committati in
`docs-site/public/diagrams/`.

## Directory esterne

Script e test individuano i checkout affiancati tramite variabili d'ambiente. I valori predefiniti sono relativi
alla radice del repository. Solo `tools/` e `test/` leggono queste variabili; il codice in `src/` non lo fa mai.

| Variabile        | Predefinito                    | Contenuto                                              |
| ---------------- | ------------------------------ | ------------------------------------------------------ |
| `ELK_SOURCE_DIR` | `../elk`                       | Sorgente Java di Eclipse ELK al commit fissato         |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Worktree scollegato e oracolo compilato                |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Il corpus elk-models, fissato nel manifesto del corpus |

La compilazione dell'oracolo richiede Maven 3.9 o successivo e JDK 21 (JDK 17 come alternativa). Per la procedura
dell'oracolo vedi [Conformità](/it/conformance).
