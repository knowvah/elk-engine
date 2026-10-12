---
title: Contribuire
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contribuire

Citiți mai întâi [Prezentare generală](/ro/guide/overview) și [Reguli de traducere](/guide/translation-rules).
Codul Java de la commit-ul fixat este specificația; la îndoială, citiți codul Java.

## Gate-uri

Rulați-le înainte de fiecare commit. Fiecare trebuie să treacă.

| Comandă                | Verifică                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run format:check` | Formatarea Prettier                                               |
| `npm run typecheck`    | Verificarea de tipuri TypeScript (`tsc --noEmit` nativ)           |
| `npm test`             | Suita vitest, inclusiv suita golden                               |
| `npm run coverage`     | Suita cu 90 % acoperire de linii, ramuri, funcții și instrucțiuni |

Necesită Node 22 sau mai nou. Instalați dependențele cu `npm ci`.

## Testele sunt imuabile

Valorile așteptate provin de la oracol, din vectorii JVM sau din codul sursă Java, înainte ca implementarea să fie
scrisă (AD-13). Odată scrisă, o aserțiune este înghețată: un test care eșuează înseamnă că implementarea este
greșită.

Dacă un test poate trece doar prin schimbarea aserțiunii sale, a unui vector sau a unui golden, opriți-vă și
consemnați cazul în jurnalul de decizii al misiunii. Nu relaxați o toleranță, nu ștergeți un caz și nu regenerați
o referință doar pentru a obține verde. Referințele golden sunt regenerate prin script, niciodată manual.

## Flux de lucru

1. Creați o ramură de funcționalitate, de exemplu `feature/<short-description>`.
2. Scrieți mesajele de commit ca [Conventional Commits](https://www.conventionalcommits.org), de exemplu
   `feat(java): add JavaHashMap`. Subiectele sunt scrise cu litere mici și au cel mult 72 de caractere.
3. Deschideți un pull request către `main`. CI verifică titlul pull request-ului ca Conventional Commit.
4. Commit-urile trebuie să fie semnate; setul de reguli al depozitului o cere.
5. Pull request-urile sunt îmbinate cu un commit de îmbinare (merge commit).

Fiecare fișier de cod poartă un antet SPDX, `// SPDX-License-Identifier: EPL-2.0`. Un test fitness îl impune.
Dependențele trebuie să fie compatibile cu EPL-2.0.

## Comenzi pentru documentație

| Comandă                | Scop                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run docs:dev`     | Pornește site-ul de documentație cu reîncărcare live              |
| `npm run docs:build`   | Compilează site-ul; un link intern mort face compilarea să eșueze |
| `npm run docs:preview` | Servește local site-ul compilat                                   |

Majoritatea paginilor de referință includ fișiere din `docs/`. Editați fișierul din `docs/`, nu pagina din
`docs-site/`. Diagramele PlantUML din fișierele incluse sunt randate în SVG și comise în
`docs-site/public/diagrams/`.

## Directoare externe

Scripturile și testele localizează checkout-urile învecinate prin variabile de mediu. Valorile implicite sunt
relative la rădăcina depozitului. Doar `tools/` și `test/` citesc aceste variabile; codul din `src/` nu o face
niciodată.

| Variabilă        | Implicit                       | Conținut                                            |
| ---------------- | ------------------------------ | --------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Codul sursă Java Eclipse ELK la commit-ul fixat     |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Worktree detașat și oracolul compilat               |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Corpusul elk-models, fixat în manifestul corpusului |

Compilarea oracolului necesită Maven 3.9 sau mai nou și JDK 21 (JDK 17 ca alternativă). Consultați
[Conformitate](/ro/conformance) pentru procedura oracolului.
