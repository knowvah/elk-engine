---
title: Bidra
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bidra

Les først [Oversikt](/no/guide/overview) og [Oversettelsesregler](/guide/translation-rules). Java-koden
ved den festede committen er spesifikasjonen; er du i tvil, les Java-koden.

## Gates

Kjør disse før hver commit. Alle må bestå.

| Kommando               | Sjekker                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run format:check` | Prettier-formatering                                                |
| `npm run typecheck`    | TypeScript-typesjekk (innebygd `tsc --noEmit`)                      |
| `npm test`             | vitest-suiten, inkludert golden-suiten                              |
| `npm run coverage`     | Suiten med 90 % dekning av linjer, grener, funksjoner og statements |

Krever Node 22 eller nyere. Installer avhengighetene med `npm ci`.

## Tester er uforanderlige

Forventede verdier kommer fra oraklet, JVM-vektorer eller Java-kildekoden før implementeringen skrives
(AD-13). Når en assertion er skrevet, er den frosset: en test som feiler betyr at implementeringen er
feil.

Hvis en test bare kan bestå ved å endre assertionen, en vektor eller et golden, stopp og før saken inn
i misjonens beslutningsjournal. Ikke løsne på en toleranse, slett ikke et tilfelle og regenerer ikke en referanse for å
få grønt. Golden-referanser regenereres med skript, aldri for hånd.

## Arbeidsflyt

1. Lag en feature-gren, for eksempel `feature/<short-description>`.
2. Skriv commit-meldinger som [Conventional Commits](https://www.conventionalcommits.org), for eksempel
   `feat(java): add JavaHashMap`. Emnelinjer er med små bokstaver og høyst 72 tegn.
3. Åpne en pull request mot `main`. CI linter tittelen på pull requesten som en Conventional Commit.
4. Commits må være signert; regelsettet i repoet krever det.
5. Pull requests flettes med en merge commit.

Hver kodefil har en SPDX-header, `// SPDX-License-Identifier: EPL-2.0`. En fitness-test
håndhever den. Avhengigheter må være kompatible med EPL-2.0.

## Dokumentasjonskommandoer

| Kommando               | Formål                                                   |
| ---------------------- | -------------------------------------------------------- |
| `npm run docs:dev`     | Starter dokumentasjonssiden med live reload              |
| `npm run docs:build`   | Bygger siden; en død intern lenke får bygget til å feile |
| `npm run docs:preview` | Serverer den bygde siden lokalt                          |

De fleste referansesidene inkluderer filer fra `docs/`. Rediger filen i `docs/`, ikke siden under
`docs-site/`. PlantUML-diagrammer i de inkluderte filene rendres til SVG og sjekkes inn under
`docs-site/public/diagrams/`.

## Eksterne kataloger

Skript og tester finner søsken-utsjekkinger via miljøvariabler. Standardverdiene er relative til
repoets rot. Bare `tools/` og `test/` leser disse variablene; kode i `src/` gjør det aldri.

| Variabel         | Standard                       | Innhold                                                   |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Java-kildekoden til Eclipse ELK ved den festede committen |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Frakoblet worktree og bygd orakel                         |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models-korpuset, festet i korpusmanifestet            |

Orakelbygget krever Maven 3.9 eller nyere og JDK 21 (JDK 17 som reserve). Se
[Samsvar](/no/conformance) for fremgangsmåten for oraklet.
