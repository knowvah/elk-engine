---
title: Arkitektur
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturöversikt för elk-engine

| Dokument                                                                                                               | Innehåll                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Varje ELK-bundle: syfte, LOC, genererad källkod, omfattning                                                                                                |
| [port-map.md](/guide/port-map)                                                                                         | Avbildning av Java-paket på moduler i `src/`                                                                                                               |
| [component-map.md](#komponentkarta)                                                                                    | Bundle-beroenden inom omfattningen; kärnkomponenter i körtiden                                                                                             |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regler från Java till TypeScript                                                                                                                           |
| [../conformance.md](/conformance)                                                                                      | Jämförelsenivå och procedur för oraklet (kommer senare i detta uppdrag)                                                                                    |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portering av ELK Text (`.elkt`), Xtext-delmängden, runbook och uppskjutet                                                                                  |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portering av ELK Textual JSON (`.elkj`), lat länkning, runbook och uppskjutet                                                                              |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portering av slumpgrafgeneratorn grandom (`.elkr`), belägg och runbook                                                                                     |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Layoutmotorn och providerna fixed, box och random (uppdrag 5a)                                                                                             |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-generatorn, väntande typer, lata konstanter, regenerering                                                                                          |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Komplexitetsgrinden som mäter varje funktion (`npm run complexity`)                                                                                        |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered-ramverket (uppdrag 7a): LGraph-modellen, transformen, stegvis införda klasser, runbook                                                             |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered nodplacering (uppdrag 7d): p4nodes, Brandes-Köpf, fem processorer, geometrirader, runbook                                                          |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered kantdragning (uppdrag 7e): ortogonal p5edges, polylinje, splines, sex processorer, dragningsrader, runbook                                         |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered-pipelinen (uppdrag 7f): `ElkLayered`, `GraphConfigurator`, komponenter, fyra processorer, rader för fullständig layout, körarens delmängd, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered-etiketter (uppdrag 7f2): etikett- och kommentarsprocessorer, unzipping, felsökningsutdata, visitor, etikettrader, sweep, runbook                   |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered självloopar, wrapping och kompaktering (uppdrag 7g): loops-paketet, brytpunkter, 1D-kompaktering, `ComponentsCompactor`, rader, sweep, runbook     |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered sammansatta grafer (uppdrag 7h): `compound`-paketet, hierarkisk drivrutin, stopp över hela trädet, goldens, sweep, hashordningstvillingar, runbook |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep mot oraklet (rad 9): shardad körare, sammanfattningskontrakt, annoteringar, rapport, runbook                                                      |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Utbytbar mätning av etikettext (rad 10): patch 0003, TS-tvillingen, fixed-läge, belägg, runbook                                                            |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Flytt av ELK-fastlåsningen (rad 13): nettodiffstriage, patchserie, ombygge, omregistrering, sweeps, triage av refdiffar, repetitionsläge                   |

## Vad elk-engine är

`@knowvah/elk-engine` är en trogen TypeScript-portering av Eclipse Layout Kernel (ELK). Java-koden
vid den fastlåsta committen `8bca22f4afa3371562d2f702d59929818f7f7b71` är specifikationen (AD-1, AD-2). Det är
ett bibliotek: webbläsarsäkert, utan körtidsberoenden, utan Java eller WASM. Dess publika kontrakt är
ElkGraph-objektmodellen plus fabriker i `ElkGraphUtil`; ELK JSON är en I/O-adapter (AD-14). Tretton
bundles med sammanlagt omkring 134 600 handskrivna rader ingår i omfattningen (se inventariet). Nuläge:
layoutmotorn (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) och de tre kärnprovidrarna `fixed`, `box` och `random` är portade och lika med oraklet på de kuraterade goldens (uppdrag 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Resten av `core` är också portad (uppdrag 5b: processorpipelinen, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines, kommentarsfästning; se [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Den delade bundlen `alg.common` är helt portad (uppdrag 6a: geometri, nätverkssimplex, 1D-kompaktering, överlappningar, spore, polyomino; uppdrag 6b: `nodespacing` och `NodeMicroLayout`, styrkta av en omspelning av 326 orakelrader; se [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Layered-ramverket är portat (uppdrag 7a: alternativpaketet, LGraph-modellen, transformen ElkGraph ↔ LGraph och provider-skalet, styrkta av två orakelvektorfiler med 272 och 330 rader; layoutfaserna följer i 7b–7h; se [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Dess två första faser är portade (uppdrag 7b: de elva cykelbrytarna, de nio layerers och de tio processorerna runt dem, styrkta av 651 orakelfasrader och en sweep på 32 652 fall; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Dess tredje fas är portad (uppdrag 7c: korsningsminimering med sina räknare, greedy switch, modellordningens komparatorer och de åtta processorerna mellan P2 och P3, styrkta av 808 orakelordningsrader och en sweep på 6 728 fall; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Dess fjärde fas är portad (uppdrag 7d: de fyra nodplaceringarna med Brandes-Köpf och de fem processorer som ett P4-stopp behöver, styrkta av 610 orakelplaceringsrader med geometri och en sweep på 8 410 fall; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Dess femte fas är portad (uppdrag 7e: de ortogonala, polylinje- och spline-routrarna med de sex processorer som ett dragit resultat behöver, styrkta av 950 orakeldragningsrader med kantgeometri och en sweep på 6 728 fall; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Layered-pipelinen körs (uppdrag 7f: drivrutinen, paketet för sammanhängande komponenter, riktningstransformeraren, routern för hierarkiska portar och tre processorer, styrkta av 1 311 orakelrader med hela layouter och stopp, en omspelning av 2 351 rader av de tidigare raderna genom den riktiga drivrutinen, 28 portade JUnit-sviter och en sweep på 6 646 fall; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouter med etiketter och kommentarer, layer unzipping och en loggningsmonitor körs också (uppdrag 7f2: etikettfamiljen, kommentarsprocessorerna, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` och felsökningsverktygen, styrkta av 1 305 orakelrader med stopp och hela layouter, de 11 baslinje-JUnit-sviterna och en sweep på 1 105 fall vars 935 ok-fall stämmer exakt; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Självloopar, grafwrapping och kompaktering körs också (uppdrag 7g: loops-paketet, de fyra självloopsprocessorerna, wrapparna för brytpunkter och enstaka kanter, `HorizontalGraphCompactor`, layered-paketet `compaction` och `ComponentsCompactor`, styrkta av 1 627 orakelrader (`full` 731, `models` 307, `scenarios` 525, `sites` 64), de 10 baslinje-JUnit-sviterna, en sweep på 3 073 fall vars 2 997 ok-fall stämmer exakt och vars 76 kast stämmer på båda sidor, och nioarmskopplingen som lämnar 58 armar portade; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Sammansatta grafer körs också (uppdrag 7h: paketet `compound`, `HierarchicalNodeResizingProcessor` och den sista armen, styrkta av 540 orakelrader (`full` 355, `models` 73 med stopp över hela trädet, `scenarios` 88, `sites` 24), 24 layered-goldens, de nio ärendesviterna och tre graph.json-metoder, en sweep på 1 169 fall vars 1 164 ok-fall stämmer exakt och vars 5 kast stämmer på båda sidor; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Layered-algoritmen kör nu varje läge för hierarkihantering: 59 enum-armar är portade, ingen är väntande och listan över stegvis införda är tom. Bara de tre `elk.stress`-fallen i ärende #58 väntar (uppdrag 8b). Ingen annan layoutalgoritm körs ännu (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Sedan uppdrag 8a körs även mrtree, radial och vertiflex (styrkta av 1 181 orakelrader i fyra refs med hela layouter och stopp, en enhetsvektor-ref på 2 656 rader, 40 `trees`-goldens, `MrTreeGraphSizeTest` och `CenterOnRootTest` på 6/6 och 2/2, och en sweep på 906 fall per algoritm där varje fall antingen stämmer eller är diagnostiserat; två radial-rader vars resultat beror på ordningen i en omvandlad hash-hink till träd är klassificerade, inte matchade; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Sedan uppdrag 8b körs även force, stress och disco (styrkta av 21 420 orakelrader i tre refs med hela layouter och stopp, 45 `force-disco`-goldens, `ForceImportTest` och `TwoBitGridTest` på 3/3 vardera, och en sweep per algoritm där varje fall antingen stämmer eller är diagnostiserat; Eades `Math.log` är en bitexakt fdlibm-portering; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Sedan uppdrag 8c körs även rectpacking, spore (`sporeOverlap`, `sporeCompaction`) och topdownpacking (styrkta av 2 593 orakelrader i tre refs, 44 `packing`-goldens, de åtta portade JUnit-sviterna på 30 körningar, och en sweep per algoritm där varje deterministiskt fall antingen stämmer eller är diagnostiserat; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Varje algoritm inom omfattningen sweepas mot oraklet, och resultatet per algoritm publiceras i paritetsrapporten ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Förhållande till ELK Java och oraklet

![Förhållandet mellan ELK Java, orakelbygget, golden-referenserna och elk-engine](/diagrams/overview-1.svg)

Patchserien är tom i detta uppdrag (AD-3). Goldens är incheckade, så CI behöver ingen JVM
(AD-5). Jämförelse: strukturen exakt, koordinater inom 1e-6 (AD-4).

## Centrala flöden

Layout i ELK, som elk-engine i dag återskapar för `fixed`, `box` och `random` (detaljer i [component-map.md](#komponentkarta) och [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Flödet för ett layoutanrop genom den rekursiva layoutmotorn](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON in blir en ElkGraph via importeraren före
layouten; efter layouten överförs de beräknade koordinaterna och kantsektionerna tillbaka till
JSON ut. Orakelharnesset använder Java-adaptern i samma två steg, så att båda sidor delar
JSON-kontraktet.

Textadapter (`graph.text`, `ElkGraphText`): `.elkt`-text läses in i en ElkGraph genom en handskriven parser,
länkare och validerare byggda på en liten Xtext-delmängd (`src/xtext`), och en ElkGraph serialiseras tillbaka till
`.elkt`. Ingångspunkten är intern; se [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Textuell JSON-adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-text läses in genom samma Xtext-delmängd
med en handskriven parser och länkas lätt, som Xtexts `LazyLinker`: kantändpunkter är EMF-proxyer (`src/emf`) som
löses upp när de läses. En ElkGraph serialiseras tillbaka till `.elkj` genom en grammatikspecifik writer.
Ingångspunkten är intern; se [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Slumpgrafgenerator (`core.debug.grandom`, `GRandomText`): `.elkr`-text parsas av en handskriven lexer och parser
på samma Xtext-delmängd (`src/xtext`), och `RandomGraphGenerator` gör om en konfiguration till ElkGraphs med den
exakta `Random`-sekvensen från JVM. Utdata med seed är byte-exakt mot oraklet och återskapar de nio filerna
`test/corpus/generated/*.json`; vägar utan seed (kantetikettens text, blandning över hierarkier, saknad seed)
kontrolleras bara med invarianter. Ingångspunkten är intern; se [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Teknikstack

| Fråga         | Val                                                             |
| ------------- | --------------------------------------------------------------- |
| Språk         | TypeScript 7.0.2 (inbyggd `tsc`), ES2022, NodeNext, `strict`    |
| Tester        | vitest 5.0.x med `@vitest/coverage-v8` (tröskelvärden på 90 %)  |
| Bundling      | esbuild 0.28.x                                                  |
| Skriptkörare  | tsx                                                             |
| Körtid        | Node 22 eller nyare; `src/` i sig är webbläsarsäkert            |
| Endast orakel | Maven 3.9+ och JDK 21 (JDK 17 som reserv) för ELK:s Tycho-bygge |

## Fitness-begränsningar (AD-8)

Bundlarnas importriktning följer `test/architecture/bundle-deps.json`; SPDX-header i varje kodfil; inga
inbyggda Node-moduler eller `process.env` i `src/`; ingen föränderlig `let` på modulnivå utanför
tillåtelselistan.

## Dokumentations- och releaseverktyg

Tillagt av färdplanens rad 12; besluten DP1 till DP9 i
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` publicerades 2026-11-23.

| Del             | Vad det är                                                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exportyta       | Godkänd (2026-11-23), listad i [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) och hållen lika med `src/index.ts` av `src/index.test.ts`; fryst vid `1.0.0`, den första npm-publiceringen (AD-14) |
| API-referens    | `npm run docs:api`: typedoc i det privata paketet `tools/typedoc/` med en egen TypeScript 6 (typedoc har ingen TypeScript 7-version, AD-6), till den genererade `/reference/`                                                                      |
| Exempel         | `test/docs/examples/*.ts`, visade på webbplatsens kom-igång-sida som utdrag och jämförda med orakelrefs (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                      |
| Länkkontroll    | `npm run docs:linkcheck`: linkinator över den byggda webbplatsen, interna länkar och fragment, i CI; externa länkar varje vecka (`links.yml`)                                                                                                      |
| Paketrepetition | `npm run pack:smoke`: paketera, kontrollera fillistan, installera offline i ett rent projekt, importera, köra layout på ett exempel där och jämföra det med dess orakelref                                                                         |
| Release         | semantic-release-konfiguration och `release.yml`, körda vid varje push till `main`; runbook i [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                     |

# Komponentkarta

| Diagram             | Visar                                                            |
| ------------------- | ---------------------------------------------------------------- |
| 1. Bundle-beroenden | De 13 bundlarna i omfattningen och deras `Require-Bundle`-kanter |
| 2. Kärnkörtid       | Hur en layoutalgoritm kopplas in i motorn                        |

Namnen utelämnar prefixet `org.eclipse.elk.`. Omfattning: [inventarium](/guide/inventory).

## 1. Bundle-beroenden inom omfattningen

Sanningskälla: `test/architecture/bundle-deps.json`, härledd ur varje bundles
`META-INF/MANIFEST.MF` av `tools/bundle-deps.ts` och upprätthållen av fitness-testet (AD-8).
Diagrammet har **32 kanter**, lika många som de 32 `requires`-posterna i JSON (graph.json x 2,
core x 1, alg.common x 2, nio algoritmer x 3). Krav från tredje part (Guava, EMF, Gson, Xtend-
bibliotek) och bundles utanför omfattningen är utelämnade. En pil `A --> B` betyder att A kräver B, så att B:s
katalog får importeras av A:s katalog. `src/java` kan importeras överallt och visas inte.

![Beroenden mellan de 13 ELK-bundlarna i omfattningen](/diagrams/component-map-1.svg)

Ingen algoritm kräver en annan algoritm: det enda gemensamma beroendet bland algoritmerna är
`alg.common`. En ny import mellan algoritmkataloger får fitness-testet att misslyckas om inte
Java-manifestet har samma kant.

## 2. Delar av kärnkörtiden

Klassernas platser ligger under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
om inget annat anges; verifierade vid den fastlåsta committen.

| Klass                             | Sökväg                              | Roll                                                               |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                             |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Går igenom hierarkin, kör providern per nivå                       |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Basklass för varje algoritm; implementerar `IGraphLayoutEngine`    |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton-register över algoritm-, alternativ- och kategoridata    |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; en genereras per algoritm-bundle (från `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritm-id plus `getInstancePool()` över providers                |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typade alternativnycklar och map-hållaren bakom `getProperty`      |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Grafmodell; element är `EMapPropertyHolder`                        |

Portade av uppdrag 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (delad med
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` och `AbstractLayoutProvider`-subklasserna
`FixedLayoutProvider`, `BoxLayoutProvider` och `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
och egenskapstyperna kom tidigare (uppdrag 2 och 3). Uppdrag 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) slutförde bundlen: `AlgorithmAssembler` och
`LayoutProcessorConfiguration` (pipelinen som varje algoritm-bundle använder), `LayoutConfigurator`, `ElkSpacings`, avsnitten i
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` och `comments/*`. Dess JDK-shims är `src/java/awt/geom`
(`Rectangle2D`) och `src/java/util/regex` (`Pattern`, `WordBoundary`), bredvid `JavaCharacter` i `src/java/lang`;
de styrks av `awt.json`, `regex.json`, `character.json` och `regex-boundary.json`. Uppdrag 6a och 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portade hela `alg.common`; 6b lade till `nodespacing` och `NodeMicroLayout`, styrkta av en omspelning av 326 `NodeMicroLayout`-orakelrader.

![Klassrelationer i ELK:s kärnkörtid](/diagrams/component-map-2.svg)

Så kopplas en algoritm in:

1. Algoritm-bundlen tillhandahåller en subklass till `AbstractLayoutProvider` (till exempel
   `LayeredLayoutProvider` i `alg.layered`) och en `.melk`-fil som deklarerar dess id, alternativ och
   stödda funktioner.
2. `.melk`-kompilatorn genererar en `ILayoutMetaDataProvider` och en alternativklass. Dess
   `apply(Registry)` registrerar en `LayoutAlgorithmData` vars instanspool skapar providern.
3. `LayoutMetaDataService` samlar in providers. `LayoutAlgorithmResolver` sätter algoritm-id
   på varje nod utifrån alternativet `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` hämtar en provider från nodens
   `LayoutAlgorithmData.getInstancePool()` och anropar `layout(layoutNode, progressMonitor)`, och
   lämnar sedan tillbaka den (eller anropar `dispose()` efter ett fel).

I elk-engine ersätts `.melk`-steget av en generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) och ElkGraph
blir vanliga TS-klasser (AD-11). Avbildning på TS-filer: [porteringskarta](/guide/port-map); regler:
[översättningsregler](/guide/translation-rules).
