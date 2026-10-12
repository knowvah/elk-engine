---
title: Að leggja til
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Að leggja til

Lestu fyrst [Yfirlit](/is/guide/overview) og [Þýðingarreglur](/guide/translation-rules). Java-kóðinn
á fasta commitinu er skilgreiningin; ef þú ert í vafa skaltu lesa Java.

## Hlið

Keyrðu þetta fyrir hvert commit. Allt verður að standast.

| Skipun                 | Athugar                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run format:check` | Prettier-snið                                              |
| `npm run typecheck`    | TypeScript-gerðarathugun (innfætt `tsc --noEmit`)          |
| `npm test`             | vitest-safnið, þar með talið golden-safnið                 |
| `npm run coverage`     | Safnið með 90% þekju á línum, greinum, föllum og setningum |

Krefst Node 22 eða nýrra. Settu upp háðindi með `npm ci`.

## Próf eru óbreytanleg

Væntanleg gildi koma frá véfréttinni, JVM-vigrum eða Java-frumkóðanum áður en útfærslan er
skrifuð (AD-13). Þegar fullyrðing hefur verið skrifuð er hún fryst: próf sem mistekst þýðir að
útfærslan er röng.

Ef próf getur aðeins staðist með því að breyta fullyrðingu þess, vigri eða golden-tilviki skaltu stöðva og skrá tilvikið
í ákvörðunardagbók verkefnisins. Ekki slaka á vikmörkum, eyða tilviki eða endurgera viðmið til að
fá grænt. Golden-viðmið eru endurgerð með skriftu, aldrei í höndunum.

## Vinnuferli

1. Búðu til feature-grein, til dæmis `feature/<short-description>`.
2. Skrifaðu commit-skilaboð sem [Conventional Commits](https://www.conventionalcommits.org), til dæmis
   `feat(java): add JavaHashMap`. Fyrirsagnir eru með litlum stöfum og í mesta lagi 72 stafir.
3. Opnaðu pull request gegn `main`. CI athugar titil pull requestsins sem Conventional Commit.
4. Commit verða að vera undirrituð; reglusett hugbúnaðarsafnsins krefst þess.
5. Pull requests eru sameinuð með merge commit.

Sérhver kóðaskrá ber SPDX-haus, `// SPDX-License-Identifier: EPL-2.0`. Fitness-próf
framfylgir því. Háðindi verða að vera samhæfð EPL-2.0.

## Skipanir fyrir skjölun

| Skipun                 | Tilgangur                                                         |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run docs:dev`     | Ræsir skjalasíðuna með lifandi endurhleðslu                       |
| `npm run docs:build`   | Byggir síðuna; dauður innri tengill veldur því að smíðin mistekst |
| `npm run docs:preview` | Þjónar byggðu síðunni á staðnum                                   |

Flestar tilvísunarsíður fella inn skrár úr `docs/`. Breyttu skránni í `docs/`, ekki síðunni undir
`docs-site/`. PlantUML-skýringarmyndir í innfelldu skránum eru teiknaðar sem SVG og vistaðar undir
`docs-site/public/diagrams/`.

## Ytri möppur

Skriftur og próf finna systur-checkouts í gegnum umhverfisbreytur. Sjálfgefin gildi eru miðuð við
rót hugbúnaðarsafnsins. Aðeins `tools/` og `test/` lesa þessar breytur; kóði í `src/` gerir það aldrei.

| Breyta           | Sjálfgefið                     | Innihald                                                  |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Java-frumkóði Eclipse ELK á fasta commitinu               |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Aðskilið worktree og byggð véfrétt                        |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models-safnið, fest í skrá safnsins (corpus manifest) |

Bygging véfréttarinnar krefst Maven 3.9 eða nýrra og JDK 21 (JDK 17 til vara). Sjá
[Samræmi](/is/conformance) fyrir verklag véfréttarinnar.
