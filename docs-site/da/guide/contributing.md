---
title: Bidrag
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bidrag

Læs først [Overblik](/da/guide/overview) og [Oversættelsesregler](/guide/translation-rules). Java-koden
ved den fastlåste commit er specifikationen; er du i tvivl, så læs Java-koden.

## Gates

Kør disse før hver commit. Hver af dem skal bestå.

| Kommando               | Kontrollerer                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run format:check` | Prettier-formatering                                               |
| `npm run typecheck`    | TypeScript-typetjek (native `tsc --noEmit`)                        |
| `npm test`             | vitest-suiten, inklusive golden-suiten                             |
| `npm run coverage`     | Suiten med 90 % dækning af linjer, grene, funktioner og statements |

Kræver Node 22 eller nyere. Installér afhængighederne med `npm ci`.

## Tests er uforanderlige

Forventede værdier kommer fra oraklet, JVM-vektorer eller Java-kildekoden, før implementeringen
skrives (AD-13). Når en assertion først er skrevet, er den frosset: En fejlende test betyder, at
implementeringen er forkert.

Kan en test kun bestå ved at ændre dens assertion, en vektor eller en golden, så stop og notér sagen
i missionens beslutningsjournal. Løsn ikke en tolerance, slet ikke et testtilfælde, og generér ikke en
reference påny blot for at blive grøn. Golden-referencer genereres påny med et script, aldrig i hånden.

## Arbejdsgang

1. Opret en feature-branch, for eksempel `feature/<short-description>`.
2. Skriv commit-beskeder som [Conventional Commits](https://www.conventionalcommits.org), for eksempel
   `feat(java): add JavaHashMap`. Emnelinjer er med små bogstaver og højst 72 tegn lange.
3. Åbn en pull request mod `main`. CI tjekker pull requestens titel som en Conventional Commit.
4. Commits skal være signerede; repositoryets regelsæt kræver det.
5. Pull requests flettes med en merge-commit.

Hver kodefil har en SPDX-header, `// SPDX-License-Identifier: EPL-2.0`. En fitness-test håndhæver det.
Afhængigheder skal være kompatible med EPL-2.0.

## Dokumentationskommandoer

| Kommando               | Formål                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `npm run docs:dev`     | Starter dokumentationssitet med live reload                 |
| `npm run docs:build`   | Bygger sitet; et dødt internt link får buildet til at fejle |
| `npm run docs:preview` | Serverer det byggede site lokalt                            |

De fleste referencesider inkluderer filer fra `docs/`. Redigér filen i `docs/`, ikke siden under
`docs-site/`. PlantUML-diagrammer i de inkluderede filer renderes til SVG og indchecks under
`docs-site/public/diagrams/`.

## Eksterne mapper

Scripts og tests finder søsterchecks via miljøvariabler. Standardværdierne er relative til
repositoryets rod. Kun `tools/` og `test/` læser disse variabler; kode i `src/` gør det aldrig.

| Variabel         | Standard                       | Indhold                                             |
| ---------------- | ------------------------------ | --------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELK Java-kildekode ved den fastlåste commit |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Frakoblet worktree og bygget orakel                 |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models-korpusset, fastlåst i korpusmanifestet   |

Orakelbygget kræver Maven 3.9 eller nyere og JDK 21 (JDK 17 som reserve). Se
[Overensstemmelse](/da/conformance) for fremgangsmåden til oraklet.
