---
title: Architektura
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Přehled architektury elk-engine

| Dokument                                                                                                               | Obsah                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Každý bundle ELK: účel, LOC, generované zdroje, rozsah                                                                                                |
| [port-map.md](/guide/port-map)                                                                                         | Mapování balíčků Javy na moduly v `src/`                                                                                                              |
| [component-map.md](#mapa-komponent)                                                                                    | Závislosti bundlů v rozsahu; základní součásti běhového prostředí                                                                                     |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Pravidla z Javy do TypeScriptu                                                                                                                        |
| [../conformance.md](/conformance)                                                                                      | Měřítko porovnání s orákulem a postup (přibude později v této misi)                                                                                   |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portování ELK Text (`.elkt`), podmnožina Xtextu, runbook a odložené části                                                                             |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portování ELK Textual JSON (`.elkj`), líné linkování, runbook a odložené části                                                                        |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portování generátoru náhodných grafů grandom (`.elkr`), důkazy a runbook                                                                              |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Engine rozvržení a providery fixed, box a random (mise 5a)                                                                                            |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Generátor `.melk`, čekající typy, líné konstanty, regenerace                                                                                          |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Brána složitosti, která měří každou funkci (`npm run complexity`)                                                                                     |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Framework layered (mise 7a): model LGraph, transformace, třídy fází, runbook                                                                          |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Umístění uzlů v layered (mise 7d): p4nodes, Brandes-Köpf, pět procesorů, řádky geometrie, runbook                                                     |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Vedení hran v layered (mise 7e): p5edges ortogonální, polyline, splines, šest procesorů, řádky vedení, runbook                                        |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline layered (mise 7f): `ElkLayered`, `GraphConfigurator`, komponenty, čtyři procesory, řádky celých rozvržení, podmnožina runneru, runbook       |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Popisky v layered (mise 7f2): procesory popisků a komentářů, unzipping, ladicí výstup, visitor, řádky popisků, sweep, runbook                         |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Vlastní smyčky, wrapping a kompaktace v layered (mise 7g): balíček loops, body zlomu, 1D kompaktace, `ComponentsCompactor`, řádky, sweep, runbook     |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Složené grafy v layered (mise 7h): balíček `compound`, hierarchický ovladač, zastavení v celém stromu, goldeny, sweep, dvojčata řazení hashů, runbook |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep TS proti orákulu (řádek 9): shardovaný runner, kontrakt souhrnu, anotace, report, runbook                                                       |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Zásuvné měření textu popisků (řádek 10): patch 0003, dvojče v TS, režim fixed, důkazy, runbook                                                        |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Posun pinu ELK (řádek 13): třídění čistého diffu, série patchů, nové sestavení, nové nahrání, sweepy, třídění diffů refů, režim zkoušky               |

## Čím elk-engine je

`@knowvah/elk-engine` je věrné portování Eclipse Layout Kernel (ELK) do TypeScriptu. Java
v zafixovaném commitu `8bca22f4afa3371562d2f702d59929818f7f7b71` je specifikací (AD-1, AD-2). Je to
knihovna: bezpečná pro prohlížeč, bez závislostí za běhu, bez Javy či WASM. Jejím veřejným kontraktem je
objektový model ElkGraph plus továrny `ElkGraphUtil`; ELK JSON je adaptér vstupu a výstupu (AD-14). V rozsahu je
třináct bundlů s celkem asi 134 600 ručně psanými řádky (viz inventář). Současný stav:
engine rozvržení (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) a tři
základní providery `fixed`, `box` a `random` jsou portovány a rovnají se orákulu na kurátorovaných goldenech
(mise 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Zbytek `core` je také portován (mise 5b: pipeline procesorů, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines, připojení komentářů; viz [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Sdílený bundle `alg.common` je plně portován (mise 6a: geometrie, síťový simplex, 1D kompaktace, překryvy, spore, polyomino; mise 6b: `nodespacing` a `NodeMicroLayout`, doloženo přehráním 326 řádků z orákula; viz [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Framework layered je portován (mise 7a: balíček voleb, model LGraph, transformace ElkGraph ↔ LGraph a obal provideru, doloženo dvěma soubory vektorů z orákula o 272 a 330 řádcích; fáze rozvržení následují v 7b–7h; viz [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Jeho první dvě fáze jsou portovány (mise 7b: jedenáct rozbíječů cyklů, devět layererů a deset procesorů kolem nich, doloženo 651 řádky fází z orákula a sweepem o 32 652 případech; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Jeho třetí fáze je portována (mise 7c: minimalizace křížení s počítadly, greedy switch, komparátory model-order a osm procesorů mezi P2 a P3, doloženo 808 řádky pořadí z orákula a sweepem o 6 728 případech; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Jeho čtvrtá fáze je portována (mise 7d: čtyři umísťovače uzlů s Brandes-Köpf a pět procesorů, které zastavení v P4 potřebuje, doloženo 610 řádky umístění z orákula s geometrií a sweepem o 8 410 případech; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Jeho pátá fáze je portována (mise 7e: ortogonální, polyline a spline routery se šesti procesory, které vedený výsledek potřebuje, doloženo 950 řádky vedení z orákula s geometrií hran a sweepem o 6 728 případech; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Pipeline layered běží (mise 7f: ovladač, balíček souvislých komponent, transformátor směru, router hierarchických portů a tři procesory, doloženo 1 311 řádky celých rozvržení a zastavení z orákula, přehráním 2 351 řádků dřívějších řádků skrz skutečný ovladač, 28 portovanými sadami JUnit a sweepem o 6 646 případech; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Rozvržení s popisky a komentáři, unzipping vrstev a logovací monitor také běží (mise 7f2: rodina popisků, procesory komentářů, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` a ladicí nástroje, doloženo 1 305 řádky zastavení a celých rozvržení z orákula, 11 základními sadami JUnit a sweepem o 1 105 případech, jehož 935 případů ok se shoduje přesně; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Běží i vlastní smyčky, wrapping grafu a kompaktace (mise 7g: balíček loops, čtyři procesory vlastních smyček, wrappery bodů zlomu a jednotlivých hran, `HorizontalGraphCompactor`, balíček `compaction` v layered a `ComponentsCompactor`, doloženo 1 627 řádky z orákula (`full` 731, `models` 307, `scenarios` 525, `sites` 64), 10 základními sadami JUnit, sweepem o 3 073 případech, jehož 2 997 případů ok se shoduje přesně a 76 výjimek se shoduje na obou stranách, a zapojením devíti větví, které ponechává 58 portovaných větví; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Běží i složené grafy (mise 7h: balíček `compound`, `HierarchicalNodeResizingProcessor` a poslední větev, doloženo 540 řádky z orákula (`full` 355, `models` 73 se zastaveními v celém stromu, `scenarios` 88, `sites` 24), 24 goldeny layered, devíti sadami issue a třemi metodami graph.json, sweepem o 1 169 případech, jehož 1 164 případů ok se shoduje přesně a 5 výjimek se shoduje na obou stranách; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Algoritmus layered nyní běží ve všech režimech zpracování hierarchie: 59 větví enumu je portováno, žádná nečeká a seznam odložených je prázdný. Čekají jen tři případy `elk.stress` z issue #58 (mise 8b). Žádný jiný algoritmus rozvržení zatím neběží (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Od mise 8a běží i mrtree, radial a vertiflex (doloženo 1 181 řádky z orákula ve čtyřech refech celých rozvržení a zastavení, refem unit vektorů o 2 656 řádcích, 40 goldeny `trees`, `MrTreeGraphSizeTest` a `CenterOnRootTest` v poměru 6/6 a 2/2 a sweepem o 906 případech na algoritmus, v němž se každý případ buď shoduje, nebo je diagnostikován; dva řádky radial, jejichž výsledek závisí na pořadí stromově převedeného hash binu, jsou klasifikovány, nikoli shodné; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Od mise 8b běží i force, stress a disco (doloženo 21 420 řádky z orákula ve třech refech celých rozvržení a zastavení, 45 goldeny `force-disco`, `ForceImportTest` a `TwoBitGridTest` po 3/3 a sweepem na algoritmus, v němž se každý případ buď shoduje, nebo je diagnostikován; `Math.log` Eadesova algoritmu je bitově přesný port fdlibm; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Od mise 8c běží i rectpacking, spore (`sporeOverlap`, `sporeCompaction`) a topdownpacking (doloženo 2 593 řádky z orákula ve třech refech, 44 goldeny `packing`, osmi portovanými sadami JUnit o 30 během a sweepem na algoritmus, v němž se každý deterministický případ shoduje, nebo je diagnostikován; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Každý algoritmus v rozsahu je proměřen sweepem proti orákulu a výsledek za algoritmus je zveřejněn v reportu parity ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Vztah k ELK v Javě a k orákulu

![Vztah mezi ELK v Javě, sestavením orákula, referenčními goldeny a elk-engine](/diagrams/overview-1.svg)

Série patchů je v této misi prázdná (AD-3). Goldeny jsou zapsány v repozitáři, takže CI nepotřebuje JVM
(AD-5). Porovnání: struktura přesně, souřadnice v rozmezí 1e-6 (AD-4).

## Klíčové toky

Rozvržení v ELK, které elk-engine dnes reprodukuje pro `fixed`, `box` a `random` (podrobnosti v
[component-map.md](#mapa-komponent) a [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Průběh volání rozvržení rekurzivním enginem rozvržení](/diagrams/overview-2.svg)

Adaptér JSON (`graph.json`, `ElkGraphJson`): ELK JSON na vstupu se před rozvržením pomocí importéru změní na
ElkGraph; po rozvržení se vypočtené souřadnice a úseky hran přenesou zpět do výstupního JSON. Harness orákula
používá adaptér v Javě ve stejných dvou krocích, takže obě strany sdílejí kontrakt JSON.

Textový adaptér (`graph.text`, `ElkGraphText`): text `.elkt` se načte do ElkGraphu ručně psaným parserem, linkerem
a validátorem postavenými na malé podmnožině Xtextu (`src/xtext`) a ElkGraph se zpět serializuje do `.elkt`.
Vstupní bod je interní; viz [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptér textového JSON (`graph.json.text`, `ElkGraphJsonText`): text `.elkj` se načte přes stejnou podmnožinu Xtextu
s ručně psaným parserem a linkuje líně jako `LazyLinker` Xtextu: koncové body hran jsou proxy EMF (`src/emf`), které
se vyřeší při čtení. ElkGraph se zpět serializuje do `.elkj` writerem specifickým pro gramatiku. Vstupní bod je
interní; viz [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generátor náhodných grafů (`core.debug.grandom`, `GRandomText`): text `.elkr` se parsuje ručně psaným lexerem
a parserem na téže podmnožině Xtextu (`src/xtext`) a `RandomGraphGenerator` převádí konfiguraci na ElkGraphy s přesnou
posloupností `Random` z JVM. Výstup se seedem je bajt po bajtu shodný s orákulem a reprodukuje devět souborů
`test/corpus/generated/*.json`; cesty bez seedu (text popisků hran, míchání napříč hierarchií, chybějící seed) se
kontrolují pouze invariantami. Vstupní bod je interní; viz [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Nástroje pro dokumentaci a vydání

Přidáno řádkem roadmapy 12; rozhodnutí DP1 až DP9 v
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` byla publikována 2026-11-23.

| Část               | Co to je                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exportovaný povrch | Přijat (2026-11-23), uveden v [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) a držen shodný se `src/index.ts` testem `src/index.test.ts`; zmrazen na `1.0.0`, prvním publikování na npm (AD-14) |
| Reference API      | `npm run docs:api`: typedoc v privátním balíčku `tools/typedoc/` s vlastním TypeScriptem 6 (typedoc nemá vydání pro TypeScript 7, AD-6), do generovaného `/reference/`                                                                            |
| Příklady           | `test/docs/examples/*.ts`, zobrazené na stránce začínáme jako úryvky a porovnané s refy z orákula (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                           |
| Kontrola odkazů    | `npm run docs:linkcheck`: linkinator nad sestavenou stránkou, interní odkazy a fragmenty, v CI; externí odkazy týdně (`links.yml`)                                                                                                                |
| Zkouška balíčku    | `npm run pack:smoke`: zabalit, zkontrolovat seznam souborů, nainstalovat offline do čistého projektu, importovat, rozvrhnout tam příklad a porovnat ho s jeho refem z orákula                                                                     |
| Vydání             | konfigurace semantic-release a `release.yml`, spouštěné při každém pushi do `main`; runbook v [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                    |

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

Portováno misí 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (rozdělen s
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` a podtřídy `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` a `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
a typy vlastností přišly dříve (mise 2 a 3). Mise 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) bundle dokončila: `AlgorithmAssembler` a
`LayoutProcessorConfiguration` (pipeline, kterou používá každý bundle algoritmu), `LayoutConfigurator`, `ElkSpacings`, sekce
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` a `comments/*`. Její shimy JDK jsou `src/java/awt/geom`
(`Rectangle2D`) a `src/java/util/regex` (`Pattern`, `WordBoundary`), vedle `JavaCharacter` v `src/java/lang`;
jsou doloženy soubory `awt.json`, `regex.json`, `character.json` a `regex-boundary.json`. Mise 6a a 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portovaly celý `alg.common`; 6b přidala `nodespacing` a `NodeMicroLayout`, doložené přehráním 326 řádků `NodeMicroLayout` z orákula.

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

V elk-engine je krok `.melk` nahrazen generátorem (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) a ElkGraph se stává obyčejnými
třídami TS (AD-11). Mapování na soubory TS: [Mapa portování](/guide/port-map); pravidla:
[pravidla překladu](/guide/translation-rules).
