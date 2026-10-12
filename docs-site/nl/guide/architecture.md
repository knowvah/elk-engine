---
title: Architectuur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architectuuroverzicht van elk-engine

| Document                                            | Inhoud                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | Elke ELK-bundel: doel, LOC, gegenereerde bronnen, scope                        |
| [port-map.md](/guide/port-map)                      | Afbeelding van Java-packages op modules in `src/`                              |
| [component-map.md](#componentenkaart)               | Bundelafhankelijkheden binnen de scope; kernonderdelen van de runtime          |
| [../translation-rules.md](/guide/translation-rules) | Regels van Java naar TypeScript                                                |
| [../conformance.md](/nl/conformance)                | Vergelijkingsmaatstaf en procedure van het orakel (volgt later in deze missie) |

## Wat elk-engine is

`@knowvah/elk-engine` is een getrouwe TypeScript-portering van de Eclipse Layout Kernel (ELK). De Java-code
op de vastgepinde commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` is de specificatie (AD-1, AD-2). Het is een
bibliotheek: browserveilig, zonder runtime-afhankelijkheden, zonder Java of WASM. Het publieke contract is het
ElkGraph-objectmodel plus `ElkGraphUtil`-factories; ELK JSON is een I/O-adapter (AD-14). Dertien bundels met
in totaal ongeveer 134.600 met de hand geschreven regels vallen binnen de scope (zie de inventaris). Deze missie
levert alleen de basisstructuur: er is nog geen layoutalgoritme geporteerd.

## Verhouding tot ELK Java en het orakel

![Verhouding tussen ELK Java, de orakelbuild, de golden-referenties en elk-engine](/diagrams/overview-1.svg)

De patchreeks is in deze missie leeg (AD-3). Goldens zijn ingecheckt, dus de CI heeft geen JVM nodig
(AD-5). Vergelijking: structuur exact, coördinaten binnen 1e-6 (AD-4).

## Kernstromen

Layout in ELK, die elk-engine nabootst (details in [component-map.md](#componentenkaart)):

![Verloop van een layoutaanroep door de recursieve layout-engine](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON wordt vóór de layout door de importer een ElkGraph; na de
layout worden de berekende coördinaten en kantsecties teruggezet in de JSON-uitvoer. De
orakel-harness gebruikt de Java-adapter in dezelfde twee stappen, zodat beide zijden het JSON-contract delen.

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

In elk-engine wordt de `.melk`-stap vervangen door een generator (AD-12, toekomstige missie) en wordt ElkGraph
gewone TS-klassen (AD-11). Afbeelding op TS-bestanden: [porteerkaart](/guide/port-map); regels:
[vertaalregels](/guide/translation-rules).
