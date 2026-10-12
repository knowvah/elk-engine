---
title: Architektura
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Přehled architektury elk-engine

| Dokument                                            | Obsah                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Každý bundle ELK: účel, LOC, generované zdroje, rozsah              |
| [port-map.md](/guide/port-map)                      | Mapování balíčků Javy na moduly v `src/`                            |
| [component-map.md](#mapa-komponent)                 | Závislosti bundlů v rozsahu; základní součásti běhového prostředí   |
| [../translation-rules.md](/guide/translation-rules) | Pravidla z Javy do TypeScriptu                                      |
| [../conformance.md](/cs/conformance)                | Měřítko porovnání s orákulem a postup (přibude později v této misi) |

## Čím elk-engine je

`@knowvah/elk-engine` je věrné portování Eclipse Layout Kernel (ELK) do TypeScriptu. Java
v zafixovaném commitu `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` je specifikací (AD-1, AD-2). Je to
knihovna: bezpečná pro prohlížeč, bez závislostí za běhu, bez Javy či WASM. Jejím veřejným kontraktem je
objektový model ElkGraph plus továrny `ElkGraphUtil`; ELK JSON je adaptér vstupu a výstupu (AD-14). V rozsahu je
třináct bundlů s celkem asi 134 600 ručně psanými řádky (viz inventář). Tato mise dodává pouze kostru: zatím není
portován žádný algoritmus rozvržení.

## Vztah k ELK v Javě a k orákulu

![Vztah mezi ELK v Javě, sestavením orákula, referenčními goldeny a elk-engine](/diagrams/overview-1.svg)

Série patchů je v této misi prázdná (AD-3). Goldeny jsou zapsány v repozitáři, takže CI nepotřebuje JVM
(AD-5). Porovnání: struktura přesně, souřadnice v rozmezí 1e-6 (AD-4).

## Klíčové toky

Rozvržení v ELK, které elk-engine reprodukuje (podrobnosti v [component-map.md](#mapa-komponent)):

![Průběh volání rozvržení rekurzivním enginem rozvržení](/diagrams/overview-2.svg)

Adaptér JSON (`graph.json`, `ElkGraphJson`): ELK JSON na vstupu se před rozvržením pomocí importéru změní na
ElkGraph; po rozvržení se vypočtené souřadnice a úseky hran přenesou zpět do výstupního JSON. Harness orákula
používá adaptér v Javě ve stejných dvou krocích, takže obě strany sdílejí kontrakt JSON.

## Technologický stack

| Oblast           | Volba                                                             |
| ---------------- | ----------------------------------------------------------------- |
| Jazyk            | TypeScript 7.0.2 (nativní `tsc`), ES2022, NodeNext, `strict`      |
| Testy            | vitest 5.0.x s `@vitest/coverage-v8` (prahy 90 %)                 |
| Bundlování       | esbuild 0.28.x                                                    |
| Spouštěč skriptů | tsx                                                               |
| Běhové prostředí | Node 22 nebo novější; samotné `src/` je bezpečné pro prohlížeč    |
| Pouze orákulum   | Maven 3.9+ a JDK 21 (záložně JDK 17) pro sestavení ELK přes Tycho |

## Fitness omezení (AD-8)

Směr importů bundlů se řídí souborem `test/architecture/bundle-deps.json`; hlavička SPDX v každém souboru s
kódem; žádné vestavěné moduly Node ani `process.env` v `src/`; žádné modulové proměnlivé `let` mimo allowlist.

# Mapa komponent

| Diagram                     | Zobrazuje                                           |
| --------------------------- | --------------------------------------------------- |
| 1. Závislosti bundlů        | 13 bundlů v rozsahu a jejich hrany `Require-Bundle` |
| 2. Jádro běhového prostředí | Jak se algoritmus rozvržení zapojuje do enginu      |

Názvy vynechávají prefix `org.eclipse.elk.`. Rozsah: [inventář](/guide/inventory).

## 1. Závislosti bundlů v rozsahu

Zdroj pravdy: `test/architecture/bundle-deps.json`, odvozený z `META-INF/MANIFEST.MF` každého bundlu
nástrojem `tools/bundle-deps.ts` a vynucovaný fitness testem (AD-8).
Diagram má **32 hran**, což odpovídá 32 položkám `requires` v JSON (graph.json x 2,
core x 1, alg.common x 2, devět algoritmů x 3). Požadavky třetích stran (Guava, EMF, Gson, knihovny Xtend)
a bundly mimo rozsah jsou vynechány. Šipka `A --> B` znamená, že A vyžaduje B, takže adresář B smí být
importován adresářem A. `src/java` lze importovat odkudkoli a není zobrazen.

![Závislosti mezi 13 bundly ELK v rozsahu](/diagrams/component-map-1.svg)

Žádný algoritmus nevyžaduje jiný algoritmus: jedinou sdílenou závislostí algoritmů je
`alg.common`. Nový import mezi adresáři algoritmů způsobí selhání fitness testu, pokud manifest Javy
neobsahuje stejnou hranu.

## 2. Součásti jádra běhového prostředí

Umístění tříd je pod `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
pokud není uvedeno jinak; ověřeno v zafixovaném commitu.

| Třída                             | Cesta                               | Role                                                                       |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                     |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Prochází hierarchii, na každé úrovni spouští provider                      |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Základní třída každého algoritmu; implementuje `IGraphLayoutEngine`        |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton registr dat algoritmů, voleb a kategorií                         |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; jeden generovaný pro každý bundle algoritmu (z `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | ID algoritmu plus `getInstancePool()` providerů                            |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typované klíče voleb a držák mapy za `getProperty`                         |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Model grafu; prvky jsou `EMapPropertyHolder`                               |

![Vztahy tříd v jádru běhového prostředí ELK](/diagrams/component-map-2.svg)

Jak se algoritmus zapojuje:

1. Bundle algoritmu dodává podtřídu `AbstractLayoutProvider` (například `LayeredLayoutProvider` z
   `alg.layered`) a soubor `.melk`, který deklaruje jeho ID, volby a podporované funkce.
2. Kompilátor `.melk` generuje `ILayoutMetaDataProvider` a třídu voleb. Jeho
   `apply(Registry)` zaregistruje `LayoutAlgorithmData`, jehož pool instancí vytváří provider.
3. `LayoutMetaDataService` shromažďuje providery. `LayoutAlgorithmResolver` nastaví ID algoritmu
   na každém uzlu z volby `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` získá provider z
   `LayoutAlgorithmData.getInstancePool()` uzlu a zavolá `layout(layoutNode, progressMonitor)`, poté ho
   uvolní (nebo po selhání zavolá `dispose()`).

V elk-engine je krok `.melk` nahrazen generátorem (AD-12, budoucí mise) a ElkGraph se stává obyčejnými
třídami TS (AD-11). Mapování na soubory TS: [Mapa portování](/guide/port-map); pravidla:
[pravidla překladu](/guide/translation-rules).
