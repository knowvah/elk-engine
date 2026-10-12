---
title: Arkitektur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturoversikt for elk-engine

| Dokument                                            | Innhold                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Hver ELK-bundle: formål, LOC, genererte kilder, omfang                           |
| [port-map.md](/guide/port-map)                      | Avbildning av Java-pakker til moduler i `src/`                                   |
| [component-map.md](#komponentkart)                  | Bundle-avhengigheter i omfang; kjerneelementer i kjøretiden                      |
| [../translation-rules.md](/guide/translation-rules) | Regler fra Java til TypeScript                                                   |
| [../conformance.md](/no/conformance)                | Sammenligningskrav og fremgangsmåte for oraklet (kommer senere i denne misjonen) |

## Hva elk-engine er

`@knowvah/elk-engine` er en tro TypeScript-portering av Eclipse Layout Kernel (ELK). Java-koden ved den
festede committen `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er spesifikasjonen (AD-1, AD-2). Det er et
bibliotek: nettlesertrygt, uten kjøretidsavhengigheter, uten Java eller WASM. Den offentlige kontrakten er
ElkGraph-objektmodellen pluss `ElkGraphUtil`-fabrikker; ELK JSON er en I/O-adapter (AD-14). Tretten
bundler med til sammen omtrent 134 600 håndskrevne linjer er i omfang (se inventaret). Denne misjonen
leverer bare stillaset: ingen layoutalgoritme er portert ennå.

## Forholdet til ELK Java og oraklet

![Forholdet mellom ELK Java, orakelbygget, golden-referansene og elk-engine](/diagrams/overview-1.svg)

Patch-serien er tom i denne misjonen (AD-3). Goldens er sjekket inn, så CI trenger ingen JVM
(AD-5). Sammenligning: struktur nøyaktig, koordinater innenfor 1e-6 (AD-4).

## Sentrale flyter

Layout i ELK, som elk-engine gjenskaper (detaljer i [component-map.md](#komponentkart)):

![Flyten i et layoutkall gjennom den rekursive layoutmotoren](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON inn blir til en ElkGraph via importøren
før layout; etter layout overføres de beregnede koordinatene og kantseksjonene tilbake til
JSON ut. Orakelharnessen bruker Java-adapteren i de samme to stegene, så begge sider deler
JSON-kontrakten.

## Teknologistakk

| Hensyn         | Valg                                                          |
| -------------- | ------------------------------------------------------------- |
| Språk          | TypeScript 7.0.2 (innebygd `tsc`), ES2022, NodeNext, `strict` |
| Tester         | vitest 5.0.x med `@vitest/coverage-v8` (terskler på 90 %)     |
| Bundling       | esbuild 0.28.x                                                |
| Skriptkjører   | tsx                                                           |
| Kjøretid       | Node 22 eller nyere; `src/` selv er nettlesertrygt            |
| Kun for orakel | Maven 3.9+ og JDK 21 (JDK 17 som reserve) for ELKs Tycho-bygg |

## Fitness-begrensninger (AD-8)

Importretningen mellom bundler følger `test/architecture/bundle-deps.json`; SPDX-header i hver
kodefil; ingen Node-innebygde moduler eller `process.env` i `src/`; ingen modulnivå mutable `let` utenfor
tillatelseslisten.

# Komponentkart

| Diagram                 | Viser                                                    |
| ----------------------- | -------------------------------------------------------- |
| 1. Bundle-avhengigheter | De 13 bundlene i omfang og deres `Require-Bundle`-kanter |
| 2. Kjernekjøretid       | Hvordan en layoutalgoritme kobles inn i motoren          |

Navnene utelater prefikset `org.eclipse.elk.`. Omfang: [inventar](/guide/inventory).

## 1. Bundle-avhengigheter i omfang

Sannhetskilde: `test/architecture/bundle-deps.json`, utledet fra hver bundles
`META-INF/MANIFEST.MF` av `tools/bundle-deps.ts` og håndhevet av fitness-testen (AD-8).
Diagrammet har **32 kanter**, lik de 32 `requires`-oppføringene i JSON-en (graph.json x 2,
core x 1, alg.common x 2, ni algoritmer x 3). Tredjepartskrav (Guava, EMF, Gson, Xtend-
biblioteker) og bundler utenfor omfang er utelatt. En pil `A --> B` betyr at A krever B, slik at Bs
katalog kan importeres av As katalog. `src/java` kan importeres overalt og vises ikke.

![Avhengigheter mellom de 13 ELK-bundlene i omfang](/diagrams/component-map-1.svg)

Ingen algoritme krever en annen algoritme: den eneste felles avhengigheten mellom algoritmer er
`alg.common`. En ny import mellom algoritmekataloger får fitness-testen til å feile med mindre
Java-manifestet har den samme kanten.

## 2. Kjernedeler i kjøretiden

Klasseplasseringer ligger under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
med mindre annet er oppgitt; verifisert ved den festede committen.

| Klasse                            | Sti                                 | Rolle                                                              |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                             |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Går gjennom hierarkiet, kjører leverandøren per nivå               |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Basisklasse for hver algoritme; implementerer `IGraphLayoutEngine` |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton-register for algoritme-, alternativ- og kategoridata     |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; én generert per algoritme-bundle (fra `.melk`)  |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritme-id pluss `getInstancePool()` med leverandører            |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typede alternativnøkler og map-holderen bak `getProperty`          |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Grafmodell; elementene er `EMapPropertyHolder`                     |

![Klasseforhold i ELKs kjernekjøretid](/diagrams/component-map-2.svg)

Hvordan en algoritme kobles inn:

1. Algoritme-bundlen leverer en underklasse av `AbstractLayoutProvider` (for eksempel
   `alg.layered`s `LayeredLayoutProvider`) og en `.melk`-fil som deklarerer id, alternativer og
   støttede funksjoner.
2. `.melk`-kompilatoren genererer en `ILayoutMetaDataProvider` og en alternativklasse. Dens
   `apply(Registry)` registrerer en `LayoutAlgorithmData` hvis instanspool oppretter leverandøren.
3. `LayoutMetaDataService` samler leverandørene. `LayoutAlgorithmResolver` setter algoritme-id-en
   på hver node fra alternativet `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` henter en leverandør fra nodens
   `LayoutAlgorithmData.getInstancePool()` og kaller `layout(layoutNode, progressMonitor)`, og
   frigir den deretter (eller kaller `dispose()` etter en feil).

I elk-engine erstattes `.melk`-steget av en generator (AD-12, fremtidig misjon), og ElkGraph
blir vanlige TS-klasser (AD-11). Avbildning til TS-filer: [porteringskart](/guide/port-map); regler:
[oversettelsesregler](/guide/translation-rules).
