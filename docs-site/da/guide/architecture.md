---
title: Arkitektur
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturoverblik over elk-engine

| Dokument                                                                                                               | Indhold                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Hver ELK-bundle: formål, LOC, genererede kilder, omfang                                                                                                 |
| [port-map.md](/guide/port-map)                                                                                         | Afbildning af Java-pakker på moduler i `src/`                                                                                                           |
| [component-map.md](#komponentkort)                                                                                     | Bundle-afhængigheder i omfanget; centrale runtime-dele                                                                                                  |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regler fra Java til TypeScript                                                                                                                          |
| [../conformance.md](/conformance)                                                                                      | Sammenligningsmål og fremgangsmåde for oraklet (kommer senere i missionen)                                                                              |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portering af ELK Text (`.elkt`), Xtext-delmængden, runbook og udskudte dele                                                                             |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portering af ELK Textual JSON (`.elkj`), doven linking, runbook og udskudte dele                                                                        |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portering af grandom-generatoren af tilfældige grafer (`.elkr`), beviser og runbook                                                                     |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Layoutmotoren og providerne fixed, box og random (mission 5a)                                                                                           |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-generatoren, afventende typer, dovne konstanter, regenerering                                                                                   |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Kompleksitetsporten, der måler hver funktion (`npm run complexity`)                                                                                     |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered-rammeværket (mission 7a): LGraph-model, transformation, trindelte klasser, runbook                                                              |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered-knudeplacering (mission 7d): p4nodes, Brandes-Köpf, fem processorer, geometrirækker, runbook                                                    |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered-kantføring (mission 7e): p5edges ortogonal, polyline, splines, seks processorer, føringsrækker, runbook                                         |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered-pipelinen (mission 7f): `ElkLayered`, `GraphConfigurator`, komponenter, fire processorer, rækker med hele layouts, runnerens delmængde, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered-labels (mission 7f2): label- og kommentarprocessorer, unzipping, debug-output, visitor, labelrækker, sweep, runbook                             |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered-selvløkker, wrapping, kompaktering (mission 7g): loops-pakken, brudpunkter, 1D-kompaktering, `ComponentsCompactor`, rækker, sweep, runbook      |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered-sammensatte grafer (mission 7h): pakken `compound`, hierarkisk driver, stop i hele træet, goldens, sweep, hash-rækkefølge-tvillinger, runbook   |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep mod oraklet (række 9): shardet runner, summary-kontrakt, annotationer, rapport, runbook                                                        |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Udskiftelig måling af labeltekst (række 10): patch 0003, TS-tvillingen, fixed-tilstand, beviser, runbook                                                |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Flytning af ELK-pinnen (række 13): triage af nettodiff, patch-serie, genbygning, genoptagelse, sweeps, triage af ref-diff, prøvetilstand                |

## Hvad elk-engine er

`@knowvah/elk-engine` er en tro TypeScript-portering af Eclipse Layout Kernel (ELK). Java-koden ved den
fastlåste commit `8bca22f4afa3371562d2f702d59929818f7f7b71` er specifikationen (AD-1, AD-2). Det er et
bibliotek: browsersikkert, uden runtime-afhængigheder, uden Java eller WASM. Dets offentlige kontrakt er
ElkGraph-objektmodellen plus `ElkGraphUtil`-factories; ELK JSON er en I/O-adapter (AD-14). Tretten
bundles med i alt omkring 134.600 håndskrevne linjer er omfattet (se inventaret). Nuværende tilstand:
layoutmotoren (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) og de tre
kerneprovidere `fixed`, `box` og `random` er porteret og er lig oraklet på de kuraterede goldens
(mission 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Resten af `core` er også porteret (mission 5b: processorpipeline, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines, kommentartilknytning; se [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Det fælles bundle `alg.common` er fuldt porteret (mission 6a: geometri, netværks-simplex, 1D-kompaktering, overlap, spore, polyomino; mission 6b: `nodespacing` og `NodeMicroLayout`, bevist ved en orakel-replay på 326 rækker; se [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Layered-rammeværket er porteret (mission 7a: indstillingspakken, LGraph-modellen, transformationen ElkGraph ↔ LGraph og provider-skallen, bevist ved to orakel-vektorfiler på 272 og 330 rækker; layoutfaserne følger i 7b–7h; se [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). De første to faser er porteret (mission 7b: de elleve cyklusbrydere, de ni layerere og de ti processorer omkring dem, bevist ved 651 orakel-faserækker og en sweep på 32.652 tilfælde; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Den tredje fase er porteret (mission 7c: krydsminimering med sine tællere, den grådige switch, model-order-komparatorerne og de otte processorer mellem P2 og P3, bevist ved 808 orakel-rækkefølgerækker og en sweep på 6.728 tilfælde; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Den fjerde fase er porteret (mission 7d: de fire knudeplacerere med Brandes-Köpf og de fem processorer, et P4-stop har brug for, bevist ved 610 orakel-placeringsrækker med geometri og en sweep på 8.410 tilfælde; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Den femte fase er porteret (mission 7e: de ortogonale, polyline- og spline-routere med de seks processorer, et ført resultat har brug for, bevist ved 950 orakel-føringsrækker med kantgeometri og en sweep på 6.728 tilfælde; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Layered-pipelinen kører (mission 7f: driveren, pakken for sammenhængende komponenter, retningstransformeren, routeren for hierarkiske porte og tre processorer, bevist ved 1.311 orakelrækker med hele layouts og stop, en genafspilning på 2.351 rækker af de tidligere rækker gennem den rigtige driver, 28 portede JUnit-suiter og en sweep på 6.646 tilfælde; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouts med labels og kommentarer, layer-unzipping og en logningsmonitor kører også (mission 7f2: labelfamilien, kommentarprocessorerne, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` og debug-værktøjerne, bevist ved 1.305 orakelrækker med stop og hele layouts, de 11 JUnit-basissuiter og en sweep på 1.105 tilfælde, hvis 935 ok-tilfælde stemmer nøjagtigt; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Selvløkker, grafwrapping og kompaktering kører også (mission 7g: loops-pakken, de fire selvløkke-processorer, wrapperne for brudpunkter og enkeltkanter, `HorizontalGraphCompactor`, layered-pakken `compaction` og `ComponentsCompactor`, bevist ved 1.627 orakelrækker (`full` 731, `models` 307, `scenarios` 525, `sites` 64), de 10 JUnit-basissuiter, en sweep på 3.073 tilfælde, hvis 2.997 ok-tilfælde stemmer nøjagtigt og hvis 76 kast stemmer på begge sider, og den ni-arms ledningsføring, der efterlader 58 porterede arme; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Sammensatte grafer kører også (mission 7h: pakken `compound`, `HierarchicalNodeResizingProcessor` og den sidste arm, bevist ved 540 orakelrækker (`full` 355, `models` 73 med stop i hele træet, `scenarios` 88, `sites` 24), 24 layered-goldens, de ni issue-suiter og tre graph.json-metoder, en sweep på 1.169 tilfælde, hvis 1.164 ok-tilfælde stemmer nøjagtigt og hvis 5 kast stemmer på begge sider; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Layered-algoritmen kører nu i alle hierarkihåndteringstilstande: 59 enum-arme er porteret, ingen afventer, og listen over trindelte er tom. Kun de tre `elk.stress`-tilfælde fra issue #58 venter (mission 8b). Ingen anden layoutalgoritme kører endnu (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Siden mission 8a kører mrtree, radial og vertiflex også (bevist ved 1.181 orakelrækker i fire refs med hele layouts og stop, en enhedsvektor-ref på 2.656 rækker, 40 `trees`-goldens, `MrTreeGraphSizeTest` og `CenterOnRootTest` på 6/6 og 2/2 og en sweep på 906 tilfælde pr. algoritme, hvor hvert tilfælde enten stemmer eller er diagnosticeret; to radial-rækker, hvis resultat afhænger af rækkefølgen i en treeificeret hash-bin, er klassificeret, ikke afstemt; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Siden mission 8b kører force, stress og disco også (bevist ved 21.420 orakelrækker i tre refs med hele layouts og stop, 45 `force-disco`-goldens, `ForceImportTest` og `TwoBitGridTest` på 3/3 hver og en sweep pr. algoritme, hvor hvert tilfælde enten stemmer eller er diagnosticeret; Eades' `Math.log` er en bit-nøjagtig fdlibm-port; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Siden mission 8c kører rectpacking, spore (`sporeOverlap`, `sporeCompaction`) og topdownpacking også (bevist ved 2.593 orakelrækker i tre refs, 44 `packing`-goldens, de otte porterede JUnit-suiter på 30 kørsler og en sweep pr. algoritme, hvor hvert deterministisk tilfælde stemmer eller er diagnosticeret; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Hver algoritme i omfanget er sweepet mod oraklet, og resultatet pr. algoritme er offentliggjort i paritetsrapporten ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Forhold til ELK Java og oraklet

![Forholdet mellem ELK Java, orakelbygget, golden-referencerne og elk-engine](/diagrams/overview-1.svg)

Patch-serien er tom i denne mission (AD-3). Goldens er indchecket, så CI ikke behøver en JVM (AD-5).
Sammenligning: struktur præcist, koordinater inden for 1e-6 (AD-4).

## Centrale forløb

Layout i ELK, som elk-engine i dag gengiver for `fixed`, `box` og `random` (detaljer i
[component-map.md](#komponentkort) og [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Forløbet af et layoutkald gennem den rekursive layoutmotor](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON ind bliver til en ElkGraph via importeren før
layoutet; efter layoutet overføres de beregnede koordinater og kantsektioner tilbage i JSON ud.
Orakel-harnessen bruger Java-adapteren i de samme to trin, så begge sider deler JSON-kontrakten.

Tekstadapter (`graph.text`, `ElkGraphText`): `.elkt`-tekst indlæses i en ElkGraph via en håndskrevet parser,
linker og validator bygget på en lille Xtext-delmængde (`src/xtext`), og en ElkGraph serialiseres tilbage til
`.elkt`. Indgangspunktet er internt; se [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Textual JSON-adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-tekst indlæses gennem den samme
Xtext-delmængde med en håndskrevet parser og linker dovent som Xtexts `LazyLinker`: kantendepunkter er
EMF-proxyer (`src/emf`), der opløses, når de læses. En ElkGraph serialiseres tilbage til `.elkj` gennem en
grammatikspecifik writer. Indgangspunktet er internt; se [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generator af tilfældige grafer (`core.debug.grandom`, `GRandomText`): `.elkr`-tekst parses af en håndskrevet lexer
og parser på den samme Xtext-delmængde (`src/xtext`), og `RandomGraphGenerator` gør en konfiguration til ElkGraphs
med den nøjagtige JVM-`Random`-sekvens. Output med seed er byte-nøjagtigt mod oraklet og genskaber de ni filer
`test/corpus/generated/*.json`; stier uden seed (kantlabeltekst, shuffle på tværs af hierarkiet, manglende seed)
kontrolleres kun ved invarianter. Indgangspunktet er internt; se [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Teknologistak

| Område          | Valg                                                           |
| --------------- | -------------------------------------------------------------- |
| Sprog           | TypeScript 7.0.2 (native `tsc`), ES2022, NodeNext, `strict`    |
| Tests           | vitest 5.0.x med `@vitest/coverage-v8` (tærskler på 90 %)      |
| Bundling        | esbuild 0.28.x                                                 |
| Script-runner   | tsx                                                            |
| Runtime         | Node 22 eller nyere; `src/` selv er browsersikker              |
| Kun til oraklet | Maven 3.9+ og JDK 21 (JDK 17 som reserve) til ELKs Tycho-build |

## Fitness-begrænsninger (AD-8)

Bundlenes importretning følger `test/architecture/bundle-deps.json`; SPDX-header i hver kodefil; ingen
Node-indbyggede moduler eller `process.env` i `src/`; ingen foranderlig `let` på modulniveau uden for
tilladelseslisten.

## Værktøjskæde til dokumentation og udgivelse

Tilføjet af roadmap-række 12; beslutningerne DP1 til DP9 i
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` blev udgivet 2026-11-23.

| Del           | Hvad det er                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Eksportflade  | Godkendt (2026-11-23), opført i [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) og holdt lig `src/index.ts` af `src/index.test.ts`; frosset ved `1.0.0`, den første npm-udgivelse (AD-14) |
| API-reference | `npm run docs:api`: typedoc i den private pakke `tools/typedoc/` med sin egen TypeScript 6 (typedoc har ingen TypeScript 7-udgivelse, AD-6), ind i det genererede `/reference/`                                                            |
| Eksempler     | `test/docs/examples/*.ts`, vist på sidens kom-i-gang-side som uddrag og sammenlignet med orakel-refs (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                 |
| Linktjek      | `npm run docs:linkcheck`: linkinator over den byggede side, interne links og fragmenter, i CI; eksterne links ugentligt (`links.yml`)                                                                                                      |
| Pakkeprøve    | `npm run pack:smoke`: pak, tjek fillisten, installer offline i et rent projekt, importer, lav layout af et eksempel dér og sammenlign det med dets orakel-ref                                                                              |
| Udgivelse     | semantic-release-konfiguration og `release.yml`, kørt ved hvert push til `main`; runbook i [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                |

# Komponentkort

| Diagram                 | Viser                                                     |
| ----------------------- | --------------------------------------------------------- |
| 1. Bundle-afhængigheder | De 13 bundles i omfanget og deres `Require-Bundle`-kanter |
| 2. Kerne-runtime        | Hvordan en layoutalgoritme kobles ind i motoren           |

Navne udelader præfikset `org.eclipse.elk.`. Omfang: [inventar](/guide/inventory).

## 1. Bundle-afhængigheder i omfanget

Autoritativ kilde: `test/architecture/bundle-deps.json`, udledt af hver bundles `META-INF/MANIFEST.MF`
med `tools/bundle-deps.ts` og håndhævet af fitness-testen (AD-8).
Diagrammet har **32 kanter**, svarende til de 32 `requires`-poster i JSON-filen (graph.json x 2,
core x 1, alg.common x 2, ni algoritmer x 3). Tredjepartskrav (Guava, EMF, Gson, Xtend-biblioteker) og
bundles uden for omfanget er udeladt. En pil `A --> B` betyder, at A kræver B, så Bs mappe må
importeres fra As mappe. `src/java` kan importeres overalt og er ikke vist.

![Afhængigheder mellem de 13 ELK-bundles i omfanget](/diagrams/component-map-1.svg)

Ingen algoritme kræver en anden algoritme: Den eneste fælles afhængighed blandt algoritmerne er
`alg.common`. Et nyt import mellem algoritmemapper får fitness-testen til at fejle, medmindre
Java-manifestet har den samme kant.

## 2. Kerne-runtime-dele

Klassestier ligger under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
medmindre andet er angivet; verificeret ved den fastlåste commit.

| Klasse                            | Sti                                 | Rolle                                                              |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                             |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Gennemløber hierarkiet, kører provideren pr. niveau                |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Basisklasse for hver algoritme; implementerer `IGraphLayoutEngine` |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton-register over algoritme-, indstillings- og kategoridata  |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; én genereret pr. algoritme-bundle (fra `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritme-id plus `getInstancePool()` over providere               |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typede indstillingsnøgler og map-holderen bag `getProperty`        |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Grafmodel; elementer er `EMapPropertyHolder`                       |

Porteret af mission 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (delt med
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` og `AbstractLayoutProvider`-underklasserne
`FixedLayoutProvider`, `BoxLayoutProvider` og `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
og egenskabstyperne kom tidligere (mission 2 og 3). Mission 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) fuldendte bundlen: `AlgorithmAssembler` og
`LayoutProcessorConfiguration` (pipelinen, som hver algoritme-bundle bruger), `LayoutConfigurator`, `ElkSpacings`, afsnittene i
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` og `comments/*`. Dens JDK-shims er `src/java/awt/geom`
(`Rectangle2D`) og `src/java/util/regex` (`Pattern`, `WordBoundary`), ved siden af `JavaCharacter` i `src/java/lang`;
de er bevist af `awt.json`, `regex.json`, `character.json` og `regex-boundary.json`. Missionerne 6a og 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portede hele `alg.common`; 6b tilføjede `nodespacing` og `NodeMicroLayout`, bevist ved en `NodeMicroLayout`-orakel-replay på 326 rækker.

![Klasserelationer i ELKs kerne-runtime](/diagrams/component-map-2.svg)

Sådan kobles en algoritme ind:

1. Algoritme-bundlen leverer en underklasse af `AbstractLayoutProvider` (for eksempel
   `alg.layered`s `LayeredLayoutProvider`) og en `.melk`-fil, der deklarerer dens id, indstillinger og
   understøttede funktioner.
2. `.melk`-compileren genererer en `ILayoutMetaDataProvider` og en indstillingsklasse. Dens
   `apply(Registry)` registrerer en `LayoutAlgorithmData`, hvis instanspulje opretter provideren.
3. `LayoutMetaDataService` samler providerne. `LayoutAlgorithmResolver` sætter algoritme-id'et
   på hver knude ud fra indstillingen `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` henter en provider fra knudens
   `LayoutAlgorithmData.getInstancePool()` og kalder `layout(layoutNode, progressMonitor)`, og
   frigiver den derefter (eller kalder `dispose()` efter en fejl).

I elk-engine erstattes `.melk`-trinnet af en generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), og ElkGraph bliver til
almindelige TS-klasser (AD-11). Afbildning på TS-filer: [porteringskort](/guide/port-map); regler:
[oversættelsesregler](/guide/translation-rules).
