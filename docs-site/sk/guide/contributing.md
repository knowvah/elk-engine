---
title: Ako prispievať
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Ako prispievať

Najprv si prečítajte [Prehľad](/sk/guide/overview) a [Pravidlá prekladu](/guide/translation-rules). Java
na pripnutom commite je špecifikácia; keď si nie ste istí, prečítajte si Javu.

## Brány

Spustite ich pred každým commitom. Každá musí prejsť.

| Príkaz                 | Kontroluje                                               |
| ---------------------- | -------------------------------------------------------- |
| `npm run format:check` | Formátovanie Prettier                                    |
| `npm run typecheck`    | Kontrola typov TypeScriptu (natívne `tsc --noEmit`)      |
| `npm test`             | Sada vitest vrátane sady goldenov                        |
| `npm run coverage`     | Sada s 90 % pokrytím riadkov, vetiev, funkcií a príkazov |

Vyžaduje Node 22 alebo novší. Závislosti nainštalujte pomocou `npm ci`.

## Testy sú nemenné

Očakávané hodnoty pochádzajú z orákula, vektorov JVM alebo zo zdrojového kódu Javy skôr, než sa napíše
implementácia (AD-13). Po napísaní je asercia zmrazená: zlyhávajúci test znamená, že implementácia je
nesprávna.

Ak test môže prejsť len zmenou svojej asercie, vektora alebo goldenu, zastavte sa a zaznamenajte prípad
do rozhodovacieho denníka misie. Neuvoľňujte toleranciu, nemažte prípad ani znovu negenerujte referenciu,
aby ste dosiahli zelenú. Referencie goldenov sa generujú znova skriptom, nikdy ručne.

## Pracovný postup

1. Vytvorte feature vetvu, napríklad `feature/<short-description>`.
2. Správy commitov píšte ako [Conventional Commits](https://www.conventionalcommits.org), napríklad
   `feat(java): add JavaHashMap`. Predmety sú malými písmenami a majú najviac 72 znakov.
3. Otvorte pull request proti `main`. CI kontroluje názov pull requestu ako Conventional Commit.
4. Commity musia byť podpísané; vyžaduje to sada pravidiel repozitára.
5. Pull requesty sa zlučujú merge commitom.

Každý súbor s kódom nesie hlavičku SPDX, `// SPDX-License-Identifier: EPL-2.0`. Vynucuje ju fitness test.
Závislosti musia byť kompatibilné s EPL-2.0.

## Príkazy pre dokumentáciu

| Príkaz                 | Účel                                                 |
| ---------------------- | ---------------------------------------------------- |
| `npm run docs:dev`     | Spustí dokumentačný web s automatickým načítaním     |
| `npm run docs:build`   | Zostaví web; neplatný interný odkaz zlyhá zostavenie |
| `npm run docs:preview` | Sprístupní zostavený web lokálne                     |

Väčšina referenčných stránok zahŕňa súbory z `docs/`. Upravujte súbor v `docs/`, nie stránku pod
`docs-site/`. Diagramy PlantUML v zahrnutých súboroch sa vykresľujú do SVG a commitujú sa do
`docs-site/public/diagrams/`.

## Externé adresáre

Skripty a testy nachádzajú susedné checkouty cez premenné prostredia. Predvolené hodnoty sú relatívne ku koreňu
repozitára. Tieto premenné čítajú iba `tools/` a `test/`; kód v `src/` nikdy.

| Premenná         | Predvolená hodnota             | Obsah                                                |
| ---------------- | ------------------------------ | ---------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Zdrojový kód Eclipse ELK v Jave na pripnutom commite |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Odpojený worktree a zostavené orákulum               |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Korpus elk-models, pripnutý v manifeste korpusu      |

Zostavenie orákula vyžaduje Maven 3.9 alebo novší a JDK 21 (JDK 17 ako záloha). Postup pre orákulum nájdete v
[Zhoda](/sk/conformance).
