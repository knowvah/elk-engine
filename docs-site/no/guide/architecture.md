---
title: Arkitektur
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arkitekturoversikt for elk-engine

| Dokument                                                                                                               | Innhold                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Hver ELK-bundle: formål, LOC, genererte kilder, omfang                                                                                                        |
| [port-map.md](/guide/port-map)                                                                                         | Avbildning av Java-pakker til moduler i `src/`                                                                                                                |
| [component-map.md](#komponentkart)                                                                                     | Bundle-avhengigheter i omfang; kjerneelementer i kjøretiden                                                                                                   |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regler fra Java til TypeScript                                                                                                                                |
| [../conformance.md](/conformance)                                                                                      | Sammenligningskrav og fremgangsmåte for oraklet (kommer senere i denne misjonen)                                                                              |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portering av ELK Text (`.elkt`), Xtext-delmengden, driftshåndbok og utsettelser                                                                               |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portering av ELK Textual JSON (`.elkj`), lat kobling, driftshåndbok og utsettelser                                                                            |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portering av grandom-generatoren (`.elkr`) for tilfeldige grafer, bevis og driftshåndbok                                                                      |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Layoutmotoren og leverandørene fixed, box og random (misjon 5a)                                                                                               |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-generatoren, ventende typer, late konstanter, regenerering                                                                                            |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Kompleksitetsporten som måler hver funksjon (`npm run complexity`)                                                                                            |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered-rammeverket (misjon 7a): LGraph-modell, transformasjon, trinnvise klasser, driftshåndbok                                                              |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered nodeplassering (misjon 7d): p4nodes, Brandes-Köpf, fem prosessorer, geometrirader, driftshåndbok                                                      |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered kantruting (misjon 7e): p5edges ortogonal, polylinje, splines, seks prosessorer, rutingrader, driftshåndbok                                           |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered-pipeline (misjon 7f): `ElkLayered`, `GraphConfigurator`, komponenter, fire prosessorer, rader for hele layouter, runner-delmengde, driftshåndbok      |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered-etiketter (misjon 7f2): etikett- og kommentarprosessorer, utpakking, feilsøkingsutdata, besøkende, etikettrader, sweep, driftshåndbok                 |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered-selvløkker, wrapping, komprimering (misjon 7g): loops-pakke, bruddpunkter, 1D-komprimering, `ComponentsCompactor`, rader, sweep, driftshåndbok        |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered sammensatte grafer (misjon 7h): `compound`-pakke, hierarkisk driver, stopp over hele treet, goldens, sweep, hash-rekkefølge-tvillinger, driftshåndbok |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep mot oraklet (rad 9): sharded runner, sammendragskontrakt, annotasjoner, rapport, driftshåndbok                                                       |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Utskiftbar måling av etiketttekst (rad 10): patch 0003, TS-tvillingen, fast modus, bevis, driftshåndbok                                                       |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Flytte ELK-pinnen (rad 13): triage av nettoforskjellen, patch-serie, ombygging, ny opptak, sweeps, triage av ref-forskjeller, prøvemodus                      |

## Hva elk-engine er

`@knowvah/elk-engine` er en tro TypeScript-portering av Eclipse Layout Kernel (ELK). Java-koden ved den
festede committen `8bca22f4afa3371562d2f702d59929818f7f7b71` er spesifikasjonen (AD-1, AD-2). Det er et
bibliotek: nettlesertrygt, uten kjøretidsavhengigheter, uten Java eller WASM. Den offentlige kontrakten er
ElkGraph-objektmodellen pluss `ElkGraphUtil`-fabrikker; ELK JSON er en I/O-adapter (AD-14). Tretten
bundler med til sammen omtrent 134 600 håndskrevne linjer er i omfang (se inventaret). Nåværende status:
layoutmotoren (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) og de tre
kjerneleverandørene `fixed`, `box` og `random` er portert og lik oraklet på de kuraterte goldens
(misjon 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Resten av `core` er også portert (misjon 5b: prosessor-pipelinen, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines,
kommentarfesting; se [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Den delte bundlen `alg.common` er fullt portert (misjon 6a: geometri, nettverkssimpleks, 1D-komprimering, overlapp, spore, polyomino; misjon 6b: `nodespacing` og `NodeMicroLayout`, bevist av en orakelreplay på 326 rader; se [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Layered-rammeverket er portert (misjon 7a: options-pakken, LGraph-modellen, ElkGraph ↔ LGraph-transformasjonen og leverandørskallet, bevist av to orakelvektorfiler på 272 og 330 rader; layoutfasene følger i 7b–7h; se [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). De to første fasene er portert (misjon 7b: de elleve syklusbryterne, de ni layererne og de ti prosessorene rundt dem, bevist av 651 orakelfaserader og en sweep på 32 652 tilfeller; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Den tredje fasen er portert (misjon 7c: kryssminimering med tellerne, den grådige vekslingen, modellrekkefølge-komparatorene og de åtte prosessorene mellom P2 og P3, bevist av 808 orakelrekkefølgerader og en sweep på 6 728 tilfeller; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Den fjerde fasen er portert (misjon 7d: de fire nodeplasserarene med Brandes-Köpf og de fem prosessorene et P4-stopp trenger, bevist av 610 orakelplasseringsrader med geometri og en sweep på 8 410 tilfeller; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Den femte fasen er portert (misjon 7e: de ortogonale, polylinje- og spline-ruterne med de seks prosessorene et rutet resultat trenger, bevist av 950 orakelrutingrader med kantgeometri og en sweep på 6 728 tilfeller; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Layered-pipelinen kjører (misjon 7f: driveren, pakken for sammenhengende komponenter, retningstransformatoren, den hierarkiske portruteren og tre prosessorer, bevist av 1 311 orakelrader med hele layouter og stopp, en replay på 2 351 rader av de tidligere radene gjennom den ekte driveren, 28 portede JUnit-suiter og en sweep på 6 646 tilfeller; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouter med etiketter og kommentarer, lagutpakking og en loggende monitor kjører også (misjon 7f2: etikettfamilien, kommentarprosessorene, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` og feilsøkingsverktøyene, bevist av 1 305 orakelrader med stopp og hele layouter, de 11 JUnit-basissuitene og en sweep på 1 105 tilfeller der de 935 ok-tilfellene stemmer eksakt; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Selvløkker, grafwrapping og komprimering kjører også (misjon 7g: loops-pakken, de fire selvløkkeprosessorene, wrapperne for bruddpunkter og enkeltkanter, `HorizontalGraphCompactor`, layered-pakken `compaction` og `ComponentsCompactor`, bevist av 1 627 orakelrader (`full` 731, `models` 307, `scenarios` 525, `sites` 64), de 10 JUnit-basissuitene, en sweep på 3 073 tilfeller der de 2 997 ok-tilfellene stemmer eksakt og 76 throws stemmer på begge sider, og den niarmede koblingen som lar 58 armer være portert; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Sammensatte grafer kjører også (misjon 7h: `compound`-pakken, `HierarchicalNodeResizingProcessor` og den siste armen, bevist av 540 orakelrader (`full` 355, `models` 73 med stopp over hele treet, `scenarios` 88, `sites` 24), 24 layered-goldens, de ni issue-suitene og tre graph.json-metoder, en sweep på 1 169 tilfeller der de 1 164 ok-tilfellene stemmer eksakt og 5 throws stemmer på begge sider; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Layered-algoritmen kjører nå hver modus for hierarkihåndtering: 59 enum-armer er portert, ingen venter, og den trinnvise listen er tom. Bare de tre `elk.stress`-tilfellene i issue #58 venter (misjon 8b). Ingen annen layoutalgoritme kjører ennå (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Siden misjon 8a kjører også mrtree, radial og vertiflex (bevist av 1 181 orakelrader i fire refs med hele layouter og stopp, en enhetsvektor-ref på 2 656 rader, 40 `trees`-goldens, `MrTreeGraphSizeTest` og `CenterOnRootTest` på 6/6 og 2/2, og en sweep på 906 tilfeller per algoritme der hvert tilfelle enten stemmer eller er diagnostisert; to radial-rader der resultatet avhenger av rekkefølgen i en til tre omdannet hash-bin er klassifisert, ikke matchet; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Siden misjon 8b kjører også force, stress og disco (bevist av 21 420 orakelrader i tre refs med hele layouter og stopp, 45 `force-disco`-goldens, `ForceImportTest` og `TwoBitGridTest` på 3/3 hver, og en sweep per algoritme der hvert tilfelle enten stemmer eller er diagnostisert; Eades-`Math.log` er en bitnøyaktig fdlibm-portering; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Siden misjon 8c kjører også rectpacking, spore (`sporeOverlap`, `sporeCompaction`) og topdownpacking (bevist av 2 593 orakelrader i tre refs, 44 `packing`-goldens, de åtte portede JUnit-suitene med 30 kjøringer, og en sweep per algoritme der hvert deterministisk tilfelle enten stemmer eller er diagnostisert; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Hver algoritme i omfang er sweepet mot oraklet, og resultatet per algoritme er publisert i paritetsrapporten ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Forholdet til ELK Java og oraklet

![Forholdet mellom ELK Java, orakelbygget, golden-referansene og elk-engine](/diagrams/overview-1.svg)

Patch-serien er tom i denne misjonen (AD-3). Goldens er sjekket inn, så CI trenger ingen JVM
(AD-5). Sammenligning: struktur nøyaktig, koordinater innenfor 1e-6 (AD-4).

## Sentrale flyter

Layout i ELK, som elk-engine i dag gjenskaper for `fixed`, `box` og `random` (detaljer i
[component-map.md](#komponentkart) og [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Flyten i et layoutkall gjennom den rekursive layoutmotoren](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): ELK JSON inn blir til en ElkGraph via importøren
før layout; etter layout overføres de beregnede koordinatene og kantseksjonene tilbake til
JSON ut. Orakelharnessen bruker Java-adapteren i de samme to stegene, så begge sider deler
JSON-kontrakten.

Tekstadapter (`graph.text`, `ElkGraphText`): `.elkt`-tekst lastes inn i en ElkGraph gjennom en håndskrevet
parser, linker og validator bygget på en liten Xtext-delmengde (`src/xtext`), og en ElkGraph serialiseres tilbake til
`.elkt`. Inngangspunktet er internt; se [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Tekstuell JSON-adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-tekst lastes gjennom den samme Xtext-delmengden
med en håndskrevet parser, og kobler lat som Xtexts `LazyLinker`: kantendepunkter er EMF-proxyer
(`src/emf`) som løses når de leses. En ElkGraph serialiseres tilbake til `.elkj` gjennom en grammatikkspesifikk writer.
Inngangspunktet er internt; se [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generator for tilfeldige grafer (`core.debug.grandom`, `GRandomText`): `.elkr`-tekst parses av en håndskrevet lexer
og parser på den samme Xtext-delmengden (`src/xtext`), og `RandomGraphGenerator` gjør en konfigurasjon om til
ElkGraphs med den eksakte `Random`-sekvensen fra JVM-en. Utdata med seed er byte-eksakt mot oraklet og reproduserer
de ni filene `test/corpus/generated/*.json`; stier uten seed (etiketttekst på kanter, shuffle på tvers av hierarki,
manglende seed) kontrolleres bare med invarianter. Inngangspunktet er internt; se [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Dokumentasjons- og release-verktøykjede

Lagt til av veikartrad 12; beslutningene DP1 til DP9 står i
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` ble publisert 2026-11-23.

| Del           | Hva det er                                                                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eksportflate  | Akseptert (2026-11-23), oppført i [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) og holdt lik `src/index.ts` av `src/index.test.ts`; fryst ved `1.0.0`, den første npm-publiseringen (AD-14) |
| API-referanse | `npm run docs:api`: typedoc i den private pakken `tools/typedoc/` med sin egen TypeScript 6 (typedoc har ingen TypeScript 7-utgivelse, AD-6), til den genererte `/reference/`                                                                  |
| Eksempler     | `test/docs/examples/*.ts`, vist som kodebiter på nettstedets kom-i-gang-side og sammenlignet med orakel-refs (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                             |
| Lenkekontroll | `npm run docs:linkcheck`: linkinator over det bygde nettstedet, interne lenker og fragmenter, i CI; eksterne lenker ukentlig (`links.yml`)                                                                                                     |
| Pakkeprøve    | `npm run pack:smoke`: pakk, kontroller fillisten, installer frakoblet i et rent prosjekt, importer, legg ut et eksempel der og sammenlign det med orakel-refen                                                                                 |
| Release       | semantic-release-konfigurasjon og `release.yml`, kjørt ved hver push til `main`; driftshåndbok i [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                              |

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

Portet av misjon 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (delt med
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver`, og `AbstractLayoutProvider`-underklassene
`FixedLayoutProvider`, `BoxLayoutProvider` og `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
og egenskapstypene kom tidligere (misjon 2 og 3). Misjon 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) fullførte bundlen: `AlgorithmAssembler` og
`LayoutProcessorConfiguration` (pipelinen hver algoritme-bundle bruker), `LayoutConfigurator`, `ElkSpacings`,
`ElkMath`-seksjonene, `ElkGraphAdapters`, `util/selection/*` og `comments/*`. JDK-shimene er `src/java/awt/geom`
(`Rectangle2D`) og `src/java/util/regex` (`Pattern`, `WordBoundary`), ved siden av `JavaCharacter` i `src/java/lang`;
de bevises av `awt.json`, `regex.json`, `character.json` og `regex-boundary.json`. Misjon 6a og 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portet hele `alg.common`; 6b la til `nodespacing` og `NodeMicroLayout`, bevist av en `NodeMicroLayout`-orakelreplay på 326 rader.

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

I elk-engine erstattes `.melk`-steget av en generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), og ElkGraph
blir vanlige TS-klasser (AD-11). Avbildning til TS-filer: [porteringskart](/guide/port-map); regler:
[oversettelsesregler](/guide/translation-rules).
