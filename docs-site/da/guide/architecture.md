---
title: Arkitektur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturoverblik over elk-engine

| Dokument                                            | Indhold                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Hver ELK-bundle: formål, LOC, genererede kilder, omfang                    |
| [port-map.md](/guide/port-map)                      | Afbildning af Java-pakker på moduler i `src/`                              |
| [component-map.md](#komponentkort)                  | Bundle-afhængigheder i omfanget; centrale runtime-dele                     |
| [../translation-rules.md](/guide/translation-rules) | Regler fra Java til TypeScript                                             |
| [../conformance.md](/da/conformance)                | Sammenligningsmål og fremgangsmåde for oraklet (kommer senere i missionen) |

## Hvad elk-engine er

`@knowvah/elk-engine` er en tro TypeScript-portering af Eclipse Layout Kernel (ELK). Java-koden ved den
fastlåste commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er specifikationen (AD-1, AD-2). Det er et
bibliotek: browsersikkert, uden runtime-afhængigheder, uden Java eller WASM. Dets offentlige kontrakt er
ElkGraph-objektmodellen plus `ElkGraphUtil`-factories; ELK JSON er en I/O-adapter (AD-14). Tretten
bundles med i alt omkring 134.600 håndskrevne linjer er omfattet (se inventaret). Denne mission leverer
kun stilladset: Endnu er ingen layoutalgoritme porteret.

## Forhold til ELK Java og oraklet

![Forholdet mellem ELK Java, orakelbygget, golden-referencerne og elk-engine](/diagrams/overview-1.svg)

Patch-serien er tom i denne mission (AD-3). Goldens er indchecket, så CI ikke behøver en JVM (AD-5).
Sammenligning: struktur præcist, koordinater inden for 1e-6 (AD-4).

## Centrale forløb

Layout i ELK, som elk-engine gengiver (detaljer i [component-map.md](#komponentkort)):

![Forløbet af et layoutkald gennem den rekursive layoutmotor](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON ind bliver til en ElkGraph via importeren før
layoutet; efter layoutet overføres de beregnede koordinater og kantsektioner tilbage i JSON ud.
Orakel-harnessen bruger Java-adapteren i de samme to trin, så begge sider deler JSON-kontrakten.

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

I elk-engine erstattes `.melk`-trinnet af en generator (AD-12, fremtidig mission), og ElkGraph bliver til
almindelige TS-klasser (AD-11). Afbildning på TS-filer: [porteringskort](/guide/port-map); regler:
[oversættelsesregler](/guide/translation-rules).
