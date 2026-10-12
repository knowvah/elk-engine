---
title: Arkitektur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturöversikt för elk-engine

| Dokument                                            | Innehåll                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Varje ELK-bundle: syfte, LOC, genererad källkod, omfattning             |
| [port-map.md](/guide/port-map)                      | Avbildning av Java-paket på moduler i `src/`                            |
| [component-map.md](#komponentkarta)                 | Bundle-beroenden inom omfattningen; kärnkomponenter i körtiden          |
| [../translation-rules.md](/guide/translation-rules) | Regler från Java till TypeScript                                        |
| [../conformance.md](/sv/conformance)                | Jämförelsenivå och procedur för oraklet (kommer senare i detta uppdrag) |

## Vad elk-engine är

`@knowvah/elk-engine` är en trogen TypeScript-portering av Eclipse Layout Kernel (ELK). Java-koden
vid den fastlåsta committen `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` är specifikationen (AD-1, AD-2). Det är
ett bibliotek: webbläsarsäkert, utan körtidsberoenden, utan Java eller WASM. Dess publika kontrakt är
ElkGraph-objektmodellen plus fabriker i `ElkGraphUtil`; ELK JSON är en I/O-adapter (AD-14). Tretton
bundles med sammanlagt omkring 134 600 handskrivna rader ingår i omfattningen (se inventariet). Detta uppdrag
levererar bara ställningen: ännu är ingen layoutalgoritm portad.

## Förhållande till ELK Java och oraklet

![Förhållandet mellan ELK Java, orakelbygget, golden-referenserna och elk-engine](/diagrams/overview-1.svg)

Patchserien är tom i detta uppdrag (AD-3). Goldens är incheckade, så CI behöver ingen JVM
(AD-5). Jämförelse: strukturen exakt, koordinater inom 1e-6 (AD-4).

## Centrala flöden

Layout i ELK, som elk-engine återskapar (detaljer i [component-map.md](#komponentkarta)):

![Flödet för ett layoutanrop genom den rekursiva layoutmotorn](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON in blir en ElkGraph via importeraren före
layouten; efter layouten överförs de beräknade koordinaterna och kantsektionerna tillbaka till
JSON ut. Orakelharnesset använder Java-adaptern i samma två steg, så att båda sidor delar
JSON-kontraktet.

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

I elk-engine ersätts `.melk`-steget av en generator (AD-12, framtida uppdrag) och ElkGraph
blir vanliga TS-klasser (AD-11). Avbildning på TS-filer: [porteringskarta](/guide/port-map); regler:
[översättningsregler](/guide/translation-rules).
