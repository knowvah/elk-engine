---
title: Architektúra
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prehľad architektúry elk-engine

| Dokument                                            | Obsah                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Každý bundle ELK: účel, LOC, generované zdroje, rozsah              |
| [port-map.md](/guide/port-map)                      | Mapovanie balíkov Javy na moduly v `src/`                           |
| [component-map.md](#mapa-komponentov)               | Závislosti bundlov v rozsahu; základné časti behového prostredia    |
| [../translation-rules.md](/guide/translation-rules) | Pravidlá Java na TypeScript                                         |
| [../conformance.md](/sk/conformance)                | Hranica porovnania s orákulom a postup (príde neskôr v tejto misii) |

## Čo je elk-engine

`@knowvah/elk-engine` je verný port Eclipse Layout Kernel (ELK) do TypeScriptu. Java na pripnutom commite
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` je špecifikácia (AD-1, AD-2). Je to knižnica: bezpečná pre
prehliadač, bez runtime závislostí, bez Javy alebo WASM. Jej verejný kontrakt je objektový model ElkGraph plus
továrne `ElkGraphUtil`; ELK JSON je I/O adaptér (AD-14). V rozsahu je trinásť bundlov s celkovo asi 134 600
ručne písanými riadkami (pozrite inventár). Táto misia dodáva iba kostru: zatiaľ nie je portovaný žiadny
algoritmus rozloženia.

## Vzťah k ELK Java a k orákulu

![Vzťah medzi ELK Java, zostavením orákula, referenčnými goldenmi a elk-engine](/diagrams/overview-1.svg)

Séria patchov je v tejto misii prázdna (AD-3). Goldeny sú commitnuté, takže CI nepotrebuje JVM
(AD-5). Porovnanie: štruktúra presne, súradnice v rámci 1e-6 (AD-4).

## Kľúčové toky

Rozloženie v ELK, ktoré elk-engine reprodukuje (podrobnosti v [component-map.md](#mapa-komponentov)):

![Tok volania rozloženia cez rekurzívny engine rozloženia](/diagrams/overview-2.svg)

Adaptér JSON (`graph.json`, `ElkGraphJson`): vstupný ELK JSON sa pred rozložením pomocou importéra zmení na
ElkGraph; po rozložení sa vypočítané súradnice a sekcie hrán prenesú späť do výstupného JSON. Harness
orákula používa adaptér v Jave v rovnakých dvoch krokoch, takže obe strany zdieľajú kontrakt JSON.

## Technologický stack

| Oblasť            | Voľba                                                          |
| ----------------- | -------------------------------------------------------------- |
| Jazyk             | TypeScript 7.0.2 (natívne `tsc`), ES2022, NodeNext, `strict`   |
| Testy             | vitest 5.0.x s `@vitest/coverage-v8` (prahy 90 %)              |
| Balíčkovanie      | esbuild 0.28.x                                                 |
| Spúšťač skriptov  | tsx                                                            |
| Behové prostredie | Node 22 alebo novší; `src/` samotné je bezpečné pre prehliadač |
| Len pre orákulum  | Maven 3.9+ a JDK 21 (záloha JDK 17) pre Tycho build ELK        |

## Fitness obmedzenia (AD-8)

Smer importov bundlov sa riadi súborom `test/architecture/bundle-deps.json`; hlavička SPDX v každom súbore
s kódom; žiadne vstavané moduly Node ani `process.env` v `src/`; žiadne modulové meniteľné `let` mimo
povoleného zoznamu.

# Mapa komponentov

| Diagram                      | Zobrazuje                                         |
| ---------------------------- | ------------------------------------------------- |
| 1. Závislosti bundlov        | 13 bundlov v rozsahu a ich hrany `Require-Bundle` |
| 2. Jadro behového prostredia | Ako sa algoritmus rozloženia pripája k enginu     |

Názvy vynechávajú predponu `org.eclipse.elk.`. Rozsah: [inventár](/guide/inventory).

## 1. Závislosti bundlov v rozsahu

Zdroj pravdy: `test/architecture/bundle-deps.json`, odvodený z `META-INF/MANIFEST.MF` každého bundlu
nástrojom `tools/bundle-deps.ts` a vynucovaný fitness testom (AD-8).
Diagram má **32 hrán**, rovnako ako 32 položiek `requires` v JSON (graph.json x 2,
core x 1, alg.common x 2, deväť algoritmov x 3). Požiadavky tretích strán (Guava, EMF, Gson, knižnice Xtend)
a bundly mimo rozsahu sú vynechané. Šípka `A --> B` znamená, že A vyžaduje B, takže adresár A môže
importovať adresár B. `src/java` je importovateľné všade a nie je zobrazené.

![Závislosti medzi 13 bundlami ELK v rozsahu](/diagrams/component-map-1.svg)

Žiadny algoritmus nevyžaduje iný algoritmus: jediná spoločná závislosť medzi algoritmami je
`alg.common`. Nový import medzi adresármi algoritmov zlyhá vo fitness teste, pokiaľ manifest
Javy nemá rovnakú hranu.

## 2. Časti jadra behového prostredia

Umiestnenia tried sú pod `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
pokiaľ nie je uvedené inak; overené na pripnutom commite.

| Trieda                            | Cesta                               | Úloha                                                                |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                               |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Prechádza hierarchiu, spúšťa provider na každej úrovni               |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Základná trieda každého algoritmu; implementuje `IGraphLayoutEngine` |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton register údajov o algoritmoch, možnostiach a kategóriách   |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; jeden generovaný na bundle algoritmu (z `.melk`)  |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Identifikátor algoritmu plus `getInstancePool()` providerov          |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typované kľúče možností a držiak mapy za `getProperty`               |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Model grafu; prvky sú `EMapPropertyHolder`                           |

![Vzťahy tried jadra behového prostredia ELK](/diagrams/component-map-2.svg)

Ako sa algoritmus pripája:

1. Bundle algoritmu dodáva podtriedu `AbstractLayoutProvider` (napríklad
   `LayeredLayoutProvider` z `alg.layered`) a súbor `.melk`, ktorý deklaruje jeho identifikátor, možnosti a
   podporované funkcie.
2. Kompilátor `.melk` generuje `ILayoutMetaDataProvider` a triedu možností. Jeho
   `apply(Registry)` registruje `LayoutAlgorithmData`, ktorého pool inštancií vytvára provider.
3. `LayoutMetaDataService` zbiera providery. `LayoutAlgorithmResolver` nastaví identifikátor algoritmu
   na každom uzle z možnosti `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` získa providera z
   `LayoutAlgorithmData.getInstancePool()` uzla a zavolá `layout(layoutNode, progressMonitor)`, potom ho
   uvoľní (alebo po zlyhaní zavolá `dispose()`).

V elk-engine je krok `.melk` nahradený generátorom (AD-12, budúca misia) a ElkGraph sa stáva
obyčajnými triedami TS (AD-11). Mapovanie na súbory TS: [mapa portovania](/guide/port-map); pravidlá:
[pravidlá prekladu](/guide/translation-rules).
