---
title: Jak přispívat
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Jak přispívat

Nejprve si přečtěte [Přehled](/cs/guide/overview) a [Pravidla překladu](/guide/translation-rules). Java
v zafixovaném commitu je specifikací; v případě pochybností čtěte Javu.

## Gate

Spusťte je před každým commitem. Každý musí projít.

| Příkaz                 | Kontroluje                                          |
| ---------------------- | --------------------------------------------------- |
| `npm run format:check` | Formátování Prettierem                              |
| `npm run typecheck`    | Kontrola typů TypeScriptu (nativní `tsc --noEmit`)  |
| `npm test`             | Sadu vitest včetně sady golden testů                |
| `npm run coverage`     | Sadu s pokrytím 90 % řádků, větví, funkcí a příkazů |

Vyžaduje Node 22 nebo novější. Závislosti nainstalujte příkazem `npm ci`.

## Testy jsou neměnné

Očekávané hodnoty pocházejí z orákula, vektorů JVM nebo zdrojového kódu Javy ještě před napsáním implementace
(AD-13). Po napsání je aserce zmrazena: selhávající test znamená, že implementace je chybná.

Pokud test může projít jen změnou své aserce, vektoru nebo golden testu, zastavte se a zapište případ
do rozhodovacího deníku mise. Nezmírňujte toleranci, nemažte případy a negenerujte znovu reference, jen abyste
dosáhli zelené. Referenční goldeny se generují znovu skriptem, nikdy ručně.

## Pracovní postup

1. Vytvořte větev funkce, například `feature/<short-description>`.
2. Zprávy commitů pište jako [Conventional Commits](https://www.conventionalcommits.org), například
   `feat(java): add JavaHashMap`. Předměty jsou malými písmeny a mají nejvýše 72 znaků.
3. Otevřete pull request proti `main`. CI kontroluje název pull requestu jako Conventional Commit.
4. Commity musí být podepsané; vyžaduje to sada pravidel repozitáře.
5. Pull requesty se slučují merge commitem.

Každý soubor s kódem nese hlavičku SPDX, `// SPDX-License-Identifier: EPL-2.0`. Vynucuje ji fitness test.
Závislosti musí být kompatibilní s EPL-2.0.

## Příkazy pro dokumentaci

| Příkaz                 | Účel                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `npm run docs:dev`     | Spustí web s dokumentací s živým znovunačítáním            |
| `npm run docs:build`   | Sestaví web; mrtvý interní odkaz způsobí selhání sestavení |
| `npm run docs:preview` | Lokálně zpřístupní sestavený web                           |

Většina referenčních stránek vkládá soubory z `docs/`. Upravujte soubor v `docs/`, nikoli stránku pod
`docs-site/`. Diagramy PlantUML ve vkládaných souborech se vykreslují do SVG a ukládají do repozitáře pod
`docs-site/public/diagrams/`.

## Externí adresáře

Skripty a testy najdou sousední checkouty přes proměnné prostředí. Výchozí hodnoty jsou relativní ke kořeni
repozitáře. Tyto proměnné čtou pouze `tools/` a `test/`; kód v `src/` nikdy.

| Proměnná         | Výchozí hodnota                | Obsah                                                 |
| ---------------- | ------------------------------ | ----------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Zdrojový kód Eclipse ELK v Javě v zafixovaném commitu |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Odpojený worktree a sestavené orákulum                |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Korpus elk-models, zafixovaný v manifestu korpusu     |

Sestavení orákula vyžaduje Maven 3.9 nebo novější a JDK 21 (JDK 17 jako záložní varianta). Postup pro orákulum
najdete v [Shoda](/cs/conformance).
