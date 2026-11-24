---
title: Architectuur
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architectuuroverzicht van elk-engine

| Document                                                                                                               | Inhoud                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Elke ELK-bundel: doel, LOC, gegenereerde bronnen, scope                                                                                                       |
| [port-map.md](/guide/port-map)                                                                                         | Afbeelding van Java-packages op modules in `src/`                                                                                                             |
| [component-map.md](#componentenkaart)                                                                                  | Bundelafhankelijkheden binnen de scope; kernonderdelen van de runtime                                                                                         |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regels van Java naar TypeScript                                                                                                                               |
| [../conformance.md](/conformance)                                                                                      | Vergelijkingsmaatstaf en procedure van het orakel (volgt later in deze missie)                                                                                |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portering van ELK Text (`.elkt`), de Xtext-subset, runbook en uitgestelde onderdelen                                                                          |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portering van ELK Textual JSON (`.elkj`), luie koppeling, runbook en uitgestelde onderdelen                                                                   |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portering van de grandom-generator (`.elkr`) voor willekeurige grafen, bewijs en runbook                                                                      |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Layout-engine en de providers fixed, box en random (missie 5a)                                                                                                |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | De `.melk`-generator, openstaande typen, luie constanten, regeneratie                                                                                         |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | De complexiteitspoort die elke functie meet (`npm run complexity`)                                                                                            |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered-framework (missie 7a): LGraph-model, transformatie, getrapte klassen, runbook                                                                         |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered-knooppositionering (missie 7d): p4nodes, Brandes-Köpf, vijf processors, geometrierijen, runbook                                                       |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered-kantroutering (missie 7e): p5edges orthogonaal, polyline, splines, zes processors, routeringsrijen, runbook                                           |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered-pipeline (missie 7f): `ElkLayered`, `GraphConfigurator`, componenten, vier processors, rijen van volledige layouts, runner-subset, runbook            |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered-labels (missie 7f2): label- en commentaarprocessors, ontzippen, debuguitvoer, visitor, labelrijen, sweep, runbook                                     |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered-zelflussen, wrapping, compactie (missie 7g): loops-package, breekpunten, 1D-compactie, `ComponentsCompactor`, rijen, sweep, runbook                   |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered-samengestelde grafen (missie 7h): `compound`-package, hiërarchische driver, stops over de hele boom, goldens, sweep, hash-volgordetweelingen, runbook |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep tegen het orakel (rij 9): gesharde runner, samenvattingscontract, annotaties, rapport, runbook                                                       |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Verwisselbare labeltekstmeting (rij 10): patch 0003, de TS-tegenhanger, vaste modus, bewijs, runbook                                                          |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | De ELK-pin verplaatsen (rij 13): triage van het nettoverschil, patchreeks, herbouw, hernieuwde opname, sweeps, triage van ref-verschillen, repetitiemodus     |

## Wat elk-engine is

`@knowvah/elk-engine` is een getrouwe TypeScript-portering van de Eclipse Layout Kernel (ELK). De Java-code
op de vastgepinde commit `8bca22f4afa3371562d2f702d59929818f7f7b71` is de specificatie (AD-1, AD-2). Het is een
bibliotheek: browserveilig, zonder runtime-afhankelijkheden, zonder Java of WASM. Het publieke contract is het
ElkGraph-objectmodel plus `ElkGraphUtil`-factories; ELK JSON is een I/O-adapter (AD-14). Dertien bundels met
in totaal ongeveer 134.600 met de hand geschreven regels vallen binnen de scope (zie de inventaris). Huidige stand:
de layout-engine (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) en de drie
kernproviders `fixed`, `box` en `random` zijn geporteerd en gelijk aan het orakel op de samengestelde goldens
(missie 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). De rest van `core` is ook geporteerd (missie 5b: processorpipeline, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines,
commentaarkoppeling; zie [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). De gedeelde bundel `alg.common` is volledig geporteerd (missie 6a: geometrie, netwerksimplex, 1D-compactie, overlappen, spore, polyomino; missie 6b: `nodespacing` en `NodeMicroLayout`, bewezen door een orakelreplay van 326 rijen; zie [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Het layered-framework is geporteerd (missie 7a: het options-package, het LGraph-model, de ElkGraph ↔ LGraph-transformatie en de providerschil, bewezen door twee orakelvectorbestanden van 272 en 330 rijen; de layoutfasen volgen in 7b–7h; zie [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). De eerste twee fasen zijn geporteerd (missie 7b: de elf cyclusbrekers, de negen layerers en de tien processors eromheen, bewezen door 651 orakelfaserijen en een sweep van 32.652 gevallen; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). De derde fase is geporteerd (missie 7c: kruisingsminimalisatie met zijn tellers, de greedy switch, de modelvolgordecomparators en de acht processors tussen P2 en P3, bewezen door 808 orakelvolgordrijen en een sweep van 6.728 gevallen; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). De vierde fase is geporteerd (missie 7d: de vier knoopplaatsers met Brandes-Köpf en de vijf processors die een P4-stop nodig heeft, bewezen door 610 orakelplaatsingsrijen met geometrie en een sweep van 8.410 gevallen; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). De vijfde fase is geporteerd (missie 7e: de orthogonale, polyline- en spline-routers met de zes processors die een gerouteerd resultaat nodig heeft, bewezen door 950 orakelrouteringsrijen met kantgeometrie en een sweep van 6.728 gevallen; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). De layered-pipeline draait (missie 7f: de driver, het package voor samenhangende componenten, de richtingstransformator, de hiërarchische poortrouter en drie processors, bewezen door 1.311 orakelrijen van volledige layouts en stops, een herreplay van 2.351 rijen van de eerdere rijen door de echte driver, 28 geporteerde JUnit-suites en een sweep van 6.646 gevallen; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouts met labels en commentaar, het ontzippen van lagen en een logging-monitor draaien ook (missie 7f2: de labelfamilie, de commentaarprocessors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` en de debughulpmiddelen, bewezen door 1.305 orakelrijen van stops en volledige layouts, de 11 JUnit-basissuites en een sweep van 1.105 gevallen waarvan de 935 ok-gevallen exact overeenkomen; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Zelflussen, graafwrapping en compactie draaien eveneens (missie 7g: het loops-package, de vier zelfluspocessors, de wrappers voor breekpunten en enkele kanten, `HorizontalGraphCompactor`, het layered-package `compaction` en `ComponentsCompactor`, bewezen door 1.642 orakelrijen (`full` 731, `models` 307, `scenarios` 525, `sites` 79), de 10 JUnit-basissuites, een sweep van 3.073 gevallen waarvan de 2.997 ok-gevallen exact overeenkomen en 76 throws aan beide zijden overeenkomen, en de negenarmige bedrading waarbij 58 armen geporteerd zijn; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Samengestelde grafen draaien ook (missie 7h: het `compound`-package, `HierarchicalNodeResizingProcessor` en de laatste arm, bewezen door 540 orakelrijen (`full` 355, `models` 73 met stops over de hele boom, `scenarios` 88, `sites` 24), 24 layered-goldens, de negen issuesuites en drie graph.json-methoden, een sweep van 1.169 gevallen waarvan de 1.164 ok-gevallen exact overeenkomen en 5 throws aan beide zijden overeenkomen; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Het layered-algoritme draait nu elke modus voor hiërarchieafhandeling: 59 enum-armen zijn geporteerd, geen enkele is in behandeling, en de getrapte lijst is leeg. De drie `elk.stress`-gevallen van issue #58 wachtten op missie 8b en draaien sinds de uitspraak ervan is uitgevoerd (missie layered-stress-cases). Geen ander layoutalgoritme draait al (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Sinds missie 8a draaien mrtree, radial en vertiflex ook (bewezen door 1.181 orakelrijen in vier refs van volledige layouts en stops, een unitvector-ref van 2.656 rijen, 40 `trees`-goldens, `MrTreeGraphSizeTest` en `CenterOnRootTest` met 6/6 en 2/2, en een sweep van 906 gevallen per algoritme waarin elk geval óf overeenkomt óf gediagnosticeerd is; twee radial-rijen waarvan het resultaat afhangt van de volgorde van een tot boom omgevormde hashbin zijn geclassificeerd, niet gematcht; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Sinds missie 8b draaien force, stress en disco ook (bewezen door 21.420 orakelrijen in drie refs van volledige layouts en stops, 45 `force-disco`-goldens, `ForceImportTest` en `TwoBitGridTest` met elk 3/3, en een sweep per algoritme waarin elk geval óf overeenkomt óf gediagnosticeerd is; de Eades-`Math.log` is een bitexacte fdlibm-portering; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Sinds missie 8c draaien rectpacking, spore (`sporeOverlap`, `sporeCompaction`) en topdownpacking ook (bewezen door 2.593 orakelrijen in drie refs, 44 `packing`-goldens, de acht geporteerde JUnit-suites met 30 runs, en een sweep per algoritme waarin elk deterministisch geval óf overeenkomt óf gediagnosticeerd is; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Elk algoritme binnen de scope is tegen het orakel gesweept, en het resultaat per algoritme is gepubliceerd in het pariteitsrapport ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Verhouding tot ELK Java en het orakel

![Verhouding tussen ELK Java, de orakelbuild, de golden-referenties en elk-engine](/diagrams/overview-1.svg)

De patchreeks is in deze missie leeg (AD-3). Goldens zijn ingecheckt, dus de CI heeft geen JVM nodig
(AD-5). Vergelijking: structuur exact, coördinaten binnen 1e-6 (AD-4).

## Kernstromen

Layout in ELK, die elk-engine vandaag nabootst voor `fixed`, `box` en `random` (details in
[component-map.md](#componentenkaart) en [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Verloop van een layoutaanroep door de recursieve layout-engine](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON wordt vóór de layout door de importer een ElkGraph; na de
layout worden de berekende coördinaten en kantsecties teruggezet in de JSON-uitvoer. De
orakel-harness gebruikt de Java-adapter in dezelfde twee stappen, zodat beide zijden het JSON-contract delen.

Tekstadapter (`graph.text`, `ElkGraphText`): `.elkt`-tekst wordt via een met de hand geschreven parser, linker en
validator, gebouwd op een kleine Xtext-subset (`src/xtext`), in een ElkGraph geladen, en een ElkGraph wordt weer naar
`.elkt` geserialiseerd. Het ingangspunt is intern; zie [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Tekstuele JSON-adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-tekst wordt via dezelfde Xtext-subset geladen
met een met de hand geschreven parser en koppelt lui, zoals de `LazyLinker` van Xtext: kanteindpunten zijn EMF-proxy's
(`src/emf`) die worden opgelost zodra ze gelezen worden. Een ElkGraph wordt via een grammaticaspecifieke writer weer
naar `.elkj` geserialiseerd. Het ingangspunt is intern; zie [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generator voor willekeurige grafen (`core.debug.grandom`, `GRandomText`): `.elkr`-tekst wordt geparseerd door een met de
hand geschreven lexer en parser op dezelfde Xtext-subset (`src/xtext`), en `RandomGraphGenerator` zet een configuratie
om in ElkGraphs met de exacte `Random`-reeks van de JVM. Uitvoer met seed is byte-exact tegen het orakel en reproduceert
de negen bestanden `test/corpus/generated/*.json`; paden zonder seed (labeltekst van kanten, shuffle over hiërarchie
heen, een ontbrekende seed) worden alleen met invarianten gecontroleerd. Het ingangspunt is intern; zie [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Technologiestack

| Aspect        | Keuze                                                              |
| ------------- | ------------------------------------------------------------------ |
| Taal          | TypeScript 7.0.2 (native `tsc`), ES2022, NodeNext, `strict`        |
| Tests         | vitest 5.0.x met `@vitest/coverage-v8` (drempels van 90%)          |
| Bundelen      | esbuild 0.28.x                                                     |
| Scriptrunner  | tsx                                                                |
| Runtime       | Node 22 of nieuwer; `src/` zelf is browserveilig                   |
| Alleen orakel | Maven 3.9+ en JDK 21 (terugval JDK 17) voor de Tycho-build van ELK |

## Fitness-beperkingen (AD-8)

De importrichting van bundels volgt `test/architecture/bundle-deps.json`; SPDX-header in elk codebestand; geen
Node-built-ins of `process.env` in `src/`; geen veranderlijke `let` op modulniveau buiten de allowlist.

## Docs- en releasetoolchain

Toegevoegd door roadmaprij 12; besluiten DP1 tot DP9 in
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` is op 2026-11-23 gepubliceerd.

| Onderdeel       | Wat het is                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exportoppervlak | Geaccepteerd (2026-11-23), vermeld in [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) en door `src/index.test.ts` gelijkgehouden aan `src/index.ts`; bevroren bij `1.0.0`, de eerste npm-publicatie (AD-14) |
| API-referentie  | `npm run docs:api`: typedoc in het private package `tools/typedoc/` met een eigen TypeScript 6 (typedoc heeft geen TypeScript 7-release, AD-6), naar de gegenereerde `/reference/`                                                                           |
| Voorbeelden     | `test/docs/examples/*.ts`, getoond als snippets op de getting-started-pagina van de site en vergeleken met orakel-refs (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                 |
| Linkcontrole    | `npm run docs:linkcheck`: linkinator over de gebouwde site, interne links en fragmenten, in CI; externe links wekelijks (`links.yml`)                                                                                                                        |
| Packrepetitie   | `npm run pack:smoke`: inpakken, de bestandslijst controleren, offline in een schoon project installeren, importeren, daar een voorbeeld layouten en het vergelijken met zijn orakel-ref                                                                      |
| Release         | semantic-release-configuratie en `release.yml`, bij elke push naar `main` uitgevoerd; runbook in [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                            |

# Componentenkaart

| Diagram                   | Toont                                                        |
| ------------------------- | ------------------------------------------------------------ |
| 1. Bundelafhankelijkheden | De 13 bundels binnen de scope en hun `Require-Bundle`-kanten |
| 2. Kernruntime            | Hoe een layoutalgoritme in de engine inhaakt                 |

Namen laten het voorvoegsel `org.eclipse.elk.` weg. Scope: [inventaris](/guide/inventory).

## 1. Bundelafhankelijkheden binnen de scope

Bron van waarheid: `test/architecture/bundle-deps.json`, afgeleid uit de `META-INF/MANIFEST.MF` van elke bundel
door `tools/bundle-deps.ts` en afgedwongen door de fitness-test (AD-8).
Het diagram heeft **32 kanten**, gelijk aan de 32 `requires`-vermeldingen in de JSON (graph.json x 2,
core x 1, alg.common x 2, negen algoritmen x 3). Vereisten van derden (Guava, EMF, Gson, Xtend-bibliotheken) en
bundels buiten de scope zijn weggelaten. Een pijl `A --> B` betekent dat A B vereist, zodat de map van B
door de map van A geïmporteerd mag worden. `src/java` is overal importeerbaar en wordt niet getoond.

![Afhankelijkheden tussen de 13 ELK-bundels binnen de scope](/diagrams/component-map-1.svg)

Geen enkel algoritme vereist een ander algoritme: de enige gedeelde afhankelijkheid tussen algoritmen is
`alg.common`. Een nieuwe import tussen algoritmemappen laat de fitness-test falen, tenzij het
Java-manifest dezelfde kant heeft.

## 2. Onderdelen van de kernruntime

Klasselocaties staan onder `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
tenzij anders vermeld; geverifieerd op de vastgepinde commit.

| Klasse                            | Pad                                 | Rol                                                                  |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                               |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Doorloopt de hiërarchie, voert de provider per niveau uit            |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Basisklasse van elk algoritme; implementeert `IGraphLayoutEngine`    |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton-register voor algoritme-, optie- en categoriegegevens      |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; één per algoritmebundel gegenereerd (uit `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritme-id plus `getInstancePool()` van providers                  |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Getypeerde optiesleutels en de map-houder achter `getProperty`       |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Graafmodel; elementen zijn `EMapPropertyHolder`                      |

Geporteerd door missie 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (gesplitst met
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver`, en de `AbstractLayoutProvider`-subklassen
`FixedLayoutProvider`, `BoxLayoutProvider` en `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
en de eigenschapstypen kwamen eerder (missies 2 en 3). Missie 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) maakte de bundel af: `AlgorithmAssembler` en
`LayoutProcessorConfiguration` (de pipeline die elke algoritmebundel gebruikt), `LayoutConfigurator`, `ElkSpacings`, de
`ElkMath`-secties, `ElkGraphAdapters`, `util/selection/*` en `comments/*`. De JDK-shims zijn `src/java/awt/geom`
(`Rectangle2D`) en `src/java/util/regex` (`Pattern`, `WordBoundary`), naast `JavaCharacter` in `src/java/lang`;
ze worden bewezen door `awt.json`, `regex.json`, `character.json` en `regex-boundary.json`. Missies 6a en 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) porteerden heel `alg.common`; 6b voegde `nodespacing` en `NodeMicroLayout` toe, bewezen door een `NodeMicroLayout`-orakelreplay van 326 rijen.

![Klasserelaties van de ELK-kernruntime](/diagrams/component-map-2.svg)

Hoe een algoritme inhaakt:

1. De algoritmebundel levert een subklasse van `AbstractLayoutProvider` (bijvoorbeeld
   `LayeredLayoutProvider` van `alg.layered`) en een `.melk`-bestand dat id, opties en ondersteunde
   functies declareert.
2. De `.melk`-compiler genereert een `ILayoutMetaDataProvider` en een optieklasse. Diens
   `apply(Registry)` registreert een `LayoutAlgorithmData` waarvan de instantiepool de provider aanmaakt.
3. `LayoutMetaDataService` verzamelt de providers. `LayoutAlgorithmResolver` zet de algoritme-id
   op elke knoop vanuit de optie `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` haalt een provider uit de
   `LayoutAlgorithmData.getInstancePool()` van de knoop en roept `layout(layoutNode, progressMonitor)` aan, en
   geeft hem daarna vrij (of roept `dispose()` aan na een fout).

In elk-engine wordt de `.melk`-stap vervangen door een generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) en wordt ElkGraph
gewone TS-klassen (AD-11). Afbeelding op TS-bestanden: [porteerkaart](/guide/port-map); regels:
[vertaalregels](/guide/translation-rules).
