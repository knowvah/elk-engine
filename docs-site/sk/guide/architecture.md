---
title: Architektúra
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prehľad architektúry elk-engine

| Dokument                                                                                                               | Obsah                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Každý bundle ELK: účel, LOC, generované zdroje, rozsah                                                                                                             |
| [port-map.md](/guide/port-map)                                                                                         | Mapovanie balíkov Javy na moduly v `src/`                                                                                                                          |
| [component-map.md](#mapa-komponentov)                                                                                  | Závislosti bundlov v rozsahu; základné časti behového prostredia                                                                                                   |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Pravidlá Java na TypeScript                                                                                                                                        |
| [../conformance.md](/conformance)                                                                                      | Hranica porovnania s orákulom a postup (príde neskôr v tejto misii)                                                                                                |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Port ELK Text (`.elkt`), podmnožina Xtext, runbook a odložené veci                                                                                                 |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Port ELK Textual JSON (`.elkj`), lenivé prepájanie, runbook a odložené veci                                                                                        |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Port generátora náhodných grafov grandom (`.elkr`), dôkazy a runbook                                                                                               |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Engine rozloženia a providery fixed, box a random (misia 5a)                                                                                                       |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Generátor `.melk`, čakajúce typy, lenivé konštanty, regenerácia                                                                                                    |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Brána zložitosti, ktorá meria každú funkciu (`npm run complexity`)                                                                                                 |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Rámec layered (misia 7a): model LGraph, transformácia, postupne zavádzané triedy, runbook                                                                          |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Umiestnenie uzlov v layered (misia 7d): p4nodes, Brandes-Köpf, päť procesorov, riadky geometrie, runbook                                                           |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Smerovanie hrán v layered (misia 7e): ortogonálne p5edges, lomená čiara, splajny, šesť procesorov, riadky smerovania, runbook                                      |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline layered (misia 7f): `ElkLayered`, `GraphConfigurator`, komponenty, štyri procesory, riadky úplného rozloženia, podmnožina runnera, runbook                |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Popisky v layered (misia 7f2): procesory popiskov a komentárov, unzipping, ladiaci výstup, visitor, riadky popiskov, sweep, runbook                                |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Slučky, wrapping a kompaktovanie v layered (misia 7g): balík loops, body zlomu, 1D kompaktovanie, `ComponentsCompactor`, riadky, sweep, runbook                    |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Zložené grafy v layered (misia 7h): balík `compound`, hierarchický driver, zastavenia na celom strome, goldeny, sweep, dvojčatá poradia hashov, runbook            |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep TS voči orákulu (riadok 9): shardovaný runner, kontrakt súhrnu, anotácie, report, runbook                                                                    |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Zásuvné meranie textu popiskov (riadok 10): patch 0003, dvojča v TS, režim fixed, dôkazy, runbook                                                                  |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Posun pinu ELK (riadok 13): triedenie čistého rozdielu, séria patchov, prebudovanie, opätovné zaznamenanie, sweepy, triedenie rozdielov referencií, skúšobný režim |

## Čo je elk-engine

`@knowvah/elk-engine` je verný port Eclipse Layout Kernel (ELK) do TypeScriptu. Java na pripnutom commite
`8bca22f4afa3371562d2f702d59929818f7f7b71` je špecifikácia (AD-1, AD-2). Je to knižnica: bezpečná pre
prehliadač, bez runtime závislostí, bez Javy alebo WASM. Jej verejný kontrakt je objektový model ElkGraph plus
továrne `ElkGraphUtil`; ELK JSON je I/O adaptér (AD-14). V rozsahu je trinásť bundlov s celkovo asi 134 600
ručne písanými riadkami (pozrite inventár). Aktuálny stav:
engine rozloženia (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) a tri základné providery `fixed`, `box` a `random` sú portované a zhodujú sa s orákulom na kurátorských goldenoch (misia 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Zvyšok `core` je portovaný tiež (misia 5b: pipeline procesorov, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splajny, pripájanie komentárov; pozrite [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Spoločný bundle `alg.common` je portovaný celý (misia 6a: geometria, sieťový simplex, 1D kompaktovanie, prekryvy, spore, polyomino; misia 6b: `nodespacing` a `NodeMicroLayout`, dokázané 326-riadkovým prehraním orákula; pozrite [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Rámec layered je portovaný (misia 7a: balík možností, model LGraph, transformácia ElkGraph ↔ LGraph a obal provideru, dokázané dvoma súbormi vektorov orákula s 272 a 330 riadkami; fázy rozloženia nasledujú v 7b–7h; pozrite [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Jeho prvé dve fázy sú portované (misia 7b: jedenásť rozbíjačov cyklov, deväť layererov a desať procesorov okolo nich, dokázané 651 riadkami fáz orákula a sweepom s 32 652 prípadmi; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Jeho tretia fáza je portovaná (misia 7c: minimalizácia krížení s počítadlami, greedy switch, komparátory poradia modelu a osem procesorov medzi P2 a P3, dokázané 808 riadkami poradia orákula a sweepom so 6 728 prípadmi; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Jeho štvrtá fáza je portovaná (misia 7d: štyri umiestňovače uzlov s Brandes-Köpf a päť procesorov, ktoré potrebuje zastavenie na P4, dokázané 610 riadkami umiestnenia orákula s geometriou a sweepom s 8 410 prípadmi; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Jeho piata fáza je portovaná (misia 7e: ortogonálny, lomený a splajnový router so šiestimi procesormi, ktoré potrebuje vysmerovaný výsledok, dokázané 950 riadkami smerovania orákula s geometriou hrán a sweepom so 6 728 prípadmi; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Pipeline layered beží (misia 7f: driver, balík súvislých komponentov, transformátor smeru, router hierarchických portov a tri procesory, dokázané 1 311 riadkami orákula s úplnými rozloženiami a zastaveniami, 2 351-riadkovým opätovným prehraním skorších riadkov cez skutočný driver, 28 portovanými sadami JUnit a sweepom so 6 646 prípadmi; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Bežia aj rozloženia s popiskami a komentármi, layer unzipping a logovací monitor (misia 7f2: rodina popiskov, procesory komentárov, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` a ladiace nástroje, dokázané 1 305 riadkami orákula so zastaveniami a úplnými rozloženiami, 11 základnými sadami JUnit a sweepom s 1 105 prípadmi, ktorého 935 prípadov ok sa zhoduje presne; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Bežia aj slučky, graph wrapping a kompaktovanie (misia 7g: balík loops, štyri procesory slučiek, wrappery bodov zlomu a jednej hrany, `HorizontalGraphCompactor`, balík layered `compaction` a `ComponentsCompactor`, dokázané 1 642 riadkami orákula (`full` 731, `models` 307, `scenarios` 525, `sites` 79), 10 základnými sadami JUnit, sweepom s 3 073 prípadmi, ktorého 2 997 prípadov ok sa zhoduje presne a 76 vyhodených výnimiek sa zhoduje na oboch stranách, a zapojením deviatich vetiev, po ktorom je portovaných 58 vetiev; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Bežia aj zložené grafy (misia 7h: balík `compound`, `HierarchicalNodeResizingProcessor` a posledná vetva, dokázané 540 riadkami orákula (`full` 355, `models` 73 so zastaveniami na celom strome, `scenarios` 88, `sites` 24), 24 goldenmi layered, deviatimi sadami issue a tromi metódami graph.json, sweepom s 1 169 prípadmi, ktorého 1 164 prípadov ok sa zhoduje presne a 5 vyhodených výnimiek sa zhoduje na oboch stranách; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Algoritmus layered teraz beží v každom režime spracovania hierarchie: 59 vetiev enumu je portovaných, žiadna nečaká a zoznam postupného zavádzania je prázdny. Tri prípady `elk.stress` z issue #58 čakali na misiu 8b a bežia odvtedy, čo bolo jej rozhodnutie vykonané (misia layered-stress-cases). Žiadny iný algoritmus rozloženia zatiaľ nebeží (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Od misie 8a bežia aj mrtree, radial a vertiflex (dokázané 1 181 riadkami orákula v štyroch referenciách úplných rozložení a zastavení, 2 656-riadkovou referenciou jednotkových vektorov, 40 goldenmi `trees`, `MrTreeGraphSizeTest` a `CenterOnRootTest` pri 6/6 a 2/2 a sweepom s 906 prípadmi na algoritmus, v ktorom každý prípad buď sedí, alebo je diagnostikovaný; dva riadky radial, ktorých výsledok závisí od poradia stromovo upraveného hash binu, sú klasifikované, nie zhodné; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Od misie 8b bežia aj force, stress a disco (dokázané 21 420 riadkami orákula v troch referenciách úplných rozložení a zastavení, 45 goldenmi `force-disco`, `ForceImportTest` a `TwoBitGridTest` po 3/3 a sweepom na algoritmus, v ktorom každý prípad buď sedí, alebo je diagnostikovaný; `Math.log` v Eades je bitovo presný port fdlibm; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Od misie 8c bežia aj rectpacking, spore (`sporeOverlap`, `sporeCompaction`) a topdownpacking (dokázané 2 593 riadkami orákula v troch referenciách, 44 goldenmi `packing`, ôsmimi portovanými sadami JUnit s 30 behmi a sweepom na algoritmus, v ktorom každý deterministický prípad buď sedí, alebo je diagnostikovaný; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Každý algoritmus v rozsahu je prehnaný sweepom voči orákulu a výsledok na algoritmus je zverejnený v reporte parity ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Vzťah k ELK Java a k orákulu

![Vzťah medzi ELK Java, zostavením orákula, referenčnými goldenmi a elk-engine](/diagrams/overview-1.svg)

Séria patchov je v tejto misii prázdna (AD-3). Goldeny sú commitnuté, takže CI nepotrebuje JVM
(AD-5). Porovnanie: štruktúra presne, súradnice v rámci 1e-6 (AD-4).

## Kľúčové toky

Rozloženie v ELK, ktoré elk-engine dnes reprodukuje pre `fixed`, `box` a `random` (podrobnosti v [component-map.md](#mapa-komponentov) a [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Tok volania rozloženia cez rekurzívny engine rozloženia](/diagrams/overview-2.svg)

Adaptér JSON (`graph.json`, `ElkGraphJson`): vstupný ELK JSON sa pred rozložením pomocou importéra zmení na
ElkGraph; po rozložení sa vypočítané súradnice a sekcie hrán prenesú späť do výstupného JSON. Harness
orákula používa adaptér v Jave v rovnakých dvoch krokoch, takže obe strany zdieľajú kontrakt JSON.

Textový adaptér (`graph.text`, `ElkGraphText`): text `.elkt` sa načíta do ElkGraph cez ručne písaný parser, linker
a validátor postavené na malej podmnožine Xtext (`src/xtext`) a ElkGraph sa serializuje späť do `.elkt`. Vstupný
bod je interný; pozrite [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptér textového JSON (`graph.json.text`, `ElkGraphJsonText`): text `.elkj` sa načíta cez rovnakú podmnožinu Xtext
s ručne písaným parserom a prepája sa lenivo ako `LazyLinker` v Xtext: koncové body hrán sú EMF proxy (`src/emf`),
ktoré sa rozlíšia pri čítaní. ElkGraph sa serializuje späť do `.elkj` cez writer špecifický pre gramatiku. Vstupný
bod je interný; pozrite [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generátor náhodných grafov (`core.debug.grandom`, `GRandomText`): text `.elkr` sa parsuje ručne písaným lexerom
a parserom na rovnakej podmnožine Xtext (`src/xtext`) a `RandomGraphGenerator` mení konfiguráciu na ElkGraphy
s presnou postupnosťou `Random` z JVM. Výstup so seedom je bajt po bajte zhodný s orákulom a reprodukuje
deväť súborov `test/corpus/generated/*.json`; cesty bez seedu (text popisku hrany, premiešanie naprieč hierarchiami,
chýbajúci seed) sa kontrolujú iba invariantmi. Vstupný bod je interný; pozrite [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Nástroje dokumentácie a vydávania

Pridané riadkom 12 plánu; rozhodnutia DP1 až DP9 v
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` bola publikovaná 2026-11-23.

| Časť               | Čo to je                                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exportovaný povrch | Prijatý (2026-11-23), uvedený v [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) a držaný rovnaký so `src/index.ts` testom `src/index.test.ts`; zmrazený na `1.0.0`, prvej publikácii na npm (AD-14) |
| Referencia API     | `npm run docs:api`: typedoc v súkromnom balíku `tools/typedoc/` s vlastným TypeScript 6 (typedoc nemá vydanie pre TypeScript 7, AD-6), do generovaného `/reference/`                                                                                 |
| Príklady           | `test/docs/examples/*.ts`, zobrazené na úvodnej stránke webu ako úryvky a porovnávané s referenciami orákula (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                   |
| Kontrola odkazov   | `npm run docs:linkcheck`: linkinator nad zostaveným webom, interné odkazy a fragmenty, v CI; externé odkazy týždenne (`links.yml`)                                                                                                                   |
| Skúška balíka      | `npm run pack:smoke`: zabaliť, skontrolovať zoznam súborov, nainštalovať offline do čistého projektu, importovať, urobiť tam rozloženie príkladu a porovnať ho s jeho referenciou orákula                                                            |
| Vydanie            | konfigurácia semantic-release a `release.yml`, spúšťané pri každom pushi do `main`; runbook v [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                       |

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

Portované misiou 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (rozdelený s
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` a podtriedy `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` a `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
a typy vlastností prišli skôr (misie 2 a 3). Misia 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) dokončila bundle: `AlgorithmAssembler` a
`LayoutProcessorConfiguration` (pipeline, ktorý používa každý bundle algoritmu), `LayoutConfigurator`, `ElkSpacings`, sekcie
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` a `comments/*`. Jej shimy JDK sú `src/java/awt/geom`
(`Rectangle2D`) a `src/java/util/regex` (`Pattern`, `WordBoundary`), vedľa `JavaCharacter` v `src/java/lang`;
sú dokázané súbormi `awt.json`, `regex.json`, `character.json` a `regex-boundary.json`. Misie 6a a 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portovali celý `alg.common`; 6b pridala `nodespacing` a `NodeMicroLayout`, dokázané 326-riadkovým prehraním orákula pre `NodeMicroLayout`.

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

V elk-engine je krok `.melk` nahradený generátorom (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) a ElkGraph sa stáva
obyčajnými triedami TS (AD-11). Mapovanie na súbory TS: [mapa portovania](/guide/port-map); pravidlá:
[pravidlá prekladu](/guide/translation-rules).
