---
title: Arhitektuur
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine'i arhitektuuri ülevaade

| Dokument                                                                                                               | Sisu                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Iga ELK-i bundle: eesmärk, LOC, genereeritud lähtekood, ulatus                                                                                                   |
| [port-map.md](/guide/port-map)                                                                                         | Java pakettide vastendus `src/` moodulitele                                                                                                                      |
| [component-map.md](#komponendikaart)                                                                                   | Ulatusse kuuluvate bundle'ite sõltuvused; käitusaja tuumosad                                                                                                     |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java ja TypeScripti vahelised reeglid                                                                                                                            |
| [../conformance.md](/conformance)                                                                                      | Oraakliga võrdlemise lävi ja protseduur (ilmub hiljem selles missioonis)                                                                                         |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Texti (`.elkt`) portimine, Xtexti alamhulk, runbook ja edasilükatud osad                                                                                     |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSONi (`.elkj`) portimine, laisk linkimine, runbook ja edasilükatud osad                                                                             |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandomi (`.elkr`) juhuslike graafide generaatori portimine, tõendid ja runbook                                                                                  |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Paigutusmootor ning fixed-, box- ja random-pakkujad (missioon 5a)                                                                                                |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-generaator, ootel tüübid, laisad konstandid, regenereerimine                                                                                             |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Keerukuse värav, mis mõõdab iga funktsiooni (`npm run complexity`)                                                                                               |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Kihiline raamistik (missioon 7a): LGraph-mudel, teisendus, etapiklassid, runbook                                                                                 |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Kihiline sõlmede paigutus (missioon 7d): p4nodes, Brandes-Köpf, viis protsessorit, geomeetriaread, runbook                                                       |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Kihiline servade marsruutimine (missioon 7e): p5edges ortogonaalne, polüjoon, splainid, kuus protsessorit, marsruutimisread, runbook                             |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Kihiline torustik (missioon 7f): `ElkLayered`, `GraphConfigurator`, komponendid, neli protsessorit, täispaigutuse read, runneri alamhulk, runbook                |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Kihilised sildid (missioon 7f2): sildi- ja kommentaariprotsessorid, lahtipakkimine, silumisväljund, külastaja, sildiread, sweep, runbook                         |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Kihilised iseseotud servad, mähkimine, tihendamine (missioon 7g): paketi `loops` sisu, murdepunktid, 1D-tihendus, `ComponentsCompactor`, read, sweep, runbook    |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Kihilised liitgraafid (missioon 7h): pakett `compound`, hierarhiline draiver, kogu puu peatused, goldenid, sweep, räsijärjestuse kaksikud, runbook               |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-i sweep oraakli vastu (rida 9): sharditud runner, kokkuvõtte leping, annotatsioonid, aruanne, runbook                                                         |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Ühendatav silditeksti mõõtmine (rida 10): patch 0003, TS-i kaksik, fixed-režiim, tõendid, runbook                                                                |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | ELK-i fikseeritud commit'i nihutamine (rida 13): netodiffi triaaž, paikade seeria, uuesti ehitamine, ümberlindistus, sweepid, viidete diffi triaaž, proovirežiim |

## Mis on elk-engine

`@knowvah/elk-engine` on Eclipse Layout Kernel'i (ELK) truu TypeScripti portimine. Java fikseeritud commit'il
`8bca22f4afa3371562d2f702d59929818f7f7b71` on spetsifikatsioon (AD-1, AD-2). See on teek: brauseriohutu, ilma
käitusaja sõltuvusteta, ilma Javata ja WASM-ita. Selle avalik leping on ElkGraphi objektimudel pluss
`ElkGraphUtil`i fabrikud; ELK JSON on I/O adapter (AD-14). Ulatusse kuulub kolmteist bundle'it kokku umbes
134 600 käsitsi kirjutatud reaga (vt inventuuri). Praegune seis: paigutusmootor (`RecursiveGraphLayoutEngine`,
`LayoutAlgorithmResolver`, `GraphValidator`) ja kolm tuumapakkujat `fixed`, `box` ja `random` on portitud ning
võrduvad oraaklega kureeritud goldenitel (missioon 5a,
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Ka ülejäänud
`core` on portitud (missioon 5b: protsessoritoru, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splainid,
kommentaaride kinnitamine; vt
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Jagatud bundle `alg.common` on täielikult portitud (missioon 6a: geomeetria, võrgusimpleks, 1D-tihendus,
kattuvused, spore, polyomino; missioon 6b: `nodespacing` ja `NodeMicroLayout`, tõestatud 326-realise oraakli
kordusega; vt [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Kihiline raamistik on portitud (missioon 7a: paketi `options` sisu, LGraph-mudel, ElkGraph ↔ LGraph teisendus ja
pakkuja kest, tõestatud kahe oraakli vektorifailiga, 272 ja 330 rida; paigutusfaasid järgnevad missioonides 7b–7h;
vt [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Selle kaks
esimest faasi on portitud (missioon 7b: üksteist tsükli murdjat, üheksa kihistajat ja kümme nende ümber olevat
protsessorit, tõestatud 651 oraakli faasireaga ja 32 652 juhtumiga sweepiga;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Kolmas faas on portitud (missioon 7c: ristumiste minimeerimine loendurite, ahne vahetuse, mudelijärjestuse
komparaatorite ja kaheksa P2 ja P3 vahele jääva protsessoriga, tõestatud 808 oraakli järjestusreaga ja 6728
juhtumiga sweepiga;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Neljas faas on portitud (missioon 7d: neli sõlmepaigutajat koos Brandes-Köpfiga ja viis protsessorit, mida P4
peatus vajab, tõestatud 610 oraakli paigutusreaga koos geomeetriaga ja 8410 juhtumiga sweepiga;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Viies faas on portitud (missioon 7e: ortogonaalne, polüjoone- ja splainimarsruuter ning kuus protsessorit, mida
marsruuditud tulemus vajab, tõestatud 950 oraakli marsruutimisreaga koos servade geomeetriaga ja 6728 juhtumiga
sweepiga;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
Kihiline torustik töötab (missioon 7f: draiver, ühendatud komponentide pakett, suunamuundur, hierarhilise pordi
marsruuter ja kolm protsessorit, tõestatud 1311 oraakli reaga tervetest paigutustest ja peatustest, varasemate
ridade 2351-realise kordusega läbi tegeliku draiveri, 28 portitud JUnit-komplekti ja 6646 juhtumiga sweepiga;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Sildistatud ja kommenteeritud paigutused, kihtide lahtipakkimine ja logiv monitor töötavad samuti (missioon 7f2:
siltide perekond, kommentaariprotsessorid, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` ja
silumisutiliidid, tõestatud 1305 oraakli reaga peatustest ja tervetest paigutustest, 11 baasjoone JUnit-komplektiga
ja 1105 juhtumiga sweepiga, mille 935 ok-juhtumit langevad täpselt kokku;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Iseseotud servad, graafi mähkimine ja tihendamine töötavad samuti (missioon 7g: paketi `loops` sisu, neli
iseseotud serva protsessorit, murdepunkti- ja üksikserva-mähkijad, `HorizontalGraphCompactor`, kihilise `compaction`
paketi sisu ja `ComponentsCompactor`, tõestatud 1627 oraakli reaga (`full` 731, `models` 307, `scenarios` 525,
`sites` 64), 10 baasjoone JUnit-komplektiga, 3073 juhtumiga sweepiga, mille 2997 ok-juhtumit langevad täpselt
kokku ja 76 viset langevad kokku mõlemal poolel, ning üheksa haruga ühendusega, mis jätab 58 haru portituks;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Liitgraafid töötavad samuti (missioon 7h: pakett `compound`, `HierarchicalNodeResizingProcessor` ja viimane haru,
tõestatud 540 oraakli reaga (`full` 355, `models` 73 kogu puu peatustega, `scenarios` 88, `sites` 24), 24 kihilise
goldeniga, üheksa probleemikomplekti ja kolme graph.json-meetodiga, 1169 juhtumiga sweepiga, mille 1164 ok-juhtumit
langevad täpselt kokku ja 5 viset langevad kokku mõlemal poolel;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
Kihiline algoritm töötab nüüd igas hierarhiakäsitluse režiimis: 59 enumi haru on portitud, ühtegi pole ootel ja
etapilist nimekirja pole enam. Ootel on ainult probleemi #58 kolm `elk.stress`-juhtumit (missioon 8b). Ühtegi teist
paigutusalgoritmi veel ei käitata (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex).
Missioonist 8a alates töötavad ka mrtree, radial ja vertiflex (tõestatud 1181 oraakli reaga neljas viites tervetest
paigutustest ja peatustest, 2656-realise ühikvektorite viitega, 40 `trees`-goldeniga, `MrTreeGraphSizeTest`i ja
`CenterOnRootTest`iga tulemustel 6/6 ja 2/2 ning 906 juhtumiga sweepiga algoritmi kohta, milles iga juhtum kas langeb
kokku või on diagnoositud; kaks radial-rida, mille tulemus sõltub puustatud räsikorvi järjestusest, on
klassifitseeritud, mitte kokku viidud;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Missioonist 8b
alates töötavad ka force, stress ja disco (tõestatud 21 420 oraakli reaga kolmes viites tervetest paigutustest ja
peatustest, 45 `force-disco`-goldeniga, `ForceImportTest`i ja `TwoBitGridTest`iga tulemustel 3/3 mõlemal ning
sweepiga algoritmi kohta, milles iga juhtum kas langeb kokku või on diagnoositud; Eadesi `Math.log` on bititäpne
fdlibm-portimine;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)).
Missioonist 8c alates töötavad ka rectpacking, spore (`sporeOverlap`, `sporeCompaction`) ja topdownpacking
(tõestatud 2593 oraakli reaga kolmes viites, 44 `packing`-goldeniga, kaheksa portitud JUnit-komplektiga 30 käivitusel
ning sweepiga algoritmi kohta, milles iga deterministlik juhtum kas langeb kokku või on diagnoositud;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Iga ulatusse
kuuluvat algoritmi on oraakli vastu sweepitud ja algoritmipõhine tulemus avaldatakse paarsusaruandes
([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Seos ELK Java ja oraakliga

![ELK Java, oraakliehituse, golden-viidete ja elk-engine'i vaheline seos](/diagrams/overview-1.svg)

Paikade seeria on selles missioonis tühi (AD-3). Goldenid on sisse commit'itud, nii et CI ei vaja JVM-i
(AD-5). Võrdlus: struktuur täpselt, koordinaadid 1e-6 piires (AD-4).

## Põhivood

Paigutus ELK-is, mida elk-engine taasloob praegu valikutele `fixed`, `box` ja `random` (üksikasjad lehel
[component-map.md](#komponendikaart) ja
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Paigutuskutse käik rekursiivse paigutusmootori kaudu](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): sisenev ELK JSON muudetakse importija abil enne paigutust
ElkGraphiks; pärast paigutust kantakse arvutatud koordinaadid ja servasektsioonid tagasi väljuvasse JSON-i.
Oraakli harness kasutab Java adapterit samas kahes sammus, nii et mõlemal poolel on ühine JSON-i leping.

Tekstiadapter (`graph.text`, `ElkGraphText`): `.elkt`-tekst laetakse ElkGraphiks käsitsi kirjutatud parseri, linkeri ja
valideerija kaudu, mis põhinevad väikesel Xtexti alamhulgal (`src/xtext`), ja ElkGraph serialiseeritakse tagasi
`.elkt`-vormingusse. Sisenemispunkt on sisemine; vt
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Tekstilise JSON-i adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-tekst laetakse sama Xtexti alamhulga peal
käsitsi kirjutatud parseriga ja seotakse laisalt nagu Xtexti `LazyLinker`: servade otspunktid on EMF-i proksid
(`src/emf`), mis lahendatakse lugemisel. ElkGraph serialiseeritakse tagasi `.elkj`-vormingusse grammatikaspetsiifilise
kirjutaja kaudu. Sisenemispunkt on sisemine; vt
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Juhuslike graafide generaator (`core.debug.grandom`, `GRandomText`): `.elkr`-tekst parsitakse käsitsi kirjutatud
lekseri ja parseriga samal Xtexti alamhulgal (`src/xtext`) ning `RandomGraphGenerator` muudab konfiguratsiooni
ElkGraphideks täpse JVM-i `Random`-jadaga. Seemnega väljund on oraakli suhtes baidi täpne ja taastoodab üheksa
faili `test/corpus/generated/*.json`; seemneta teed (servasildi tekst, hierarhiat ületav segamine, puuduv seeme)
kontrollitakse ainult invariantidega. Sisenemispunkt on sisemine; vt
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Tehnoloogiapakk

| Teema            | Valik                                                         |
| ---------------- | ------------------------------------------------------------- |
| Keel             | TypeScript 7.0.2 (natiivne `tsc`), ES2022, NodeNext, `strict` |
| Testid           | vitest 5.0.x koos `@vitest/coverage-v8`-ga (90% läved)        |
| Komplekteerimine | esbuild 0.28.x                                                |
| Skriptikäitaja   | tsx                                                           |
| Käitusaeg        | Node 22 või uuem; `src/` ise on brauseriohutu                 |
| Ainult oraakel   | Maven 3.9+ ja JDK 21 (varuks JDK 17) ELK-i Tycho ehituseks    |

## Fitness-piirangud (AD-8)

Bundle'ite impordisuund järgib faili `test/architecture/bundle-deps.json`; SPDX-päis igas koodifailis; `src/`-s
pole Node'i sisseehitatud mooduleid ega `process.env`-i; ühtki moodulitasemel muudetavat `let`-i väljaspool
lubatud nimekirja.

## Dokumentatsiooni- ja väljalasketööriistad

Lisatud tegevuskava reaga 12; otsused DP1 kuni DP9 failis
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md).
`1.0.0` avaldati 2026-11-23.

| Osa              | Mis see on                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ekspordipind     | Heaks kiidetud (2026-11-23), loetletud failis [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) ja hoitud võrdsena `src/index.ts`-iga testiga `src/index.test.ts`; külmutatud versioonis `1.0.0`, esimene npm-avaldus (AD-14) |
| API viide        | `npm run docs:api`: typedoc privaatses paketis `tools/typedoc/` oma TypeScript 6-ga (typedocil pole TypeScript 7 väljalaset, AD-6), genereeritavasse `/reference/`                                                                                                           |
| Näited           | `test/docs/examples/*.ts`, näidatud saidi alustamislehel lõikudena ja võrreldud oraakli viidetega (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                                                      |
| Linkide kontroll | `npm run docs:linkcheck`: linkinator üle ehitatud saidi, sisemised lingid ja fragmendid, CI-s; välised lingid iganädalaselt (`links.yml`)                                                                                                                                    |
| Paki proov       | `npm run pack:smoke`: paki, kontrolli failinimekirja, paigalda võrguühenduseta puhtasse projekti, impordi, paiguta seal näide ja võrdle seda selle oraakli viitega                                                                                                           |
| Väljalase        | semantic-release'i konfiguratsioon ja `release.yml`, käivitub iga `main`-i pushi peal; runbook failis [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                                       |

# Komponendikaart

| Diagramm                 | Näitab                                                          |
| ------------------------ | --------------------------------------------------------------- |
| 1. Bundle'ite sõltuvused | 13 ulatusse kuuluvat bundle'it ja nende `Require-Bundle` servad |
| 2. Tuuma käitusaeg       | Kuidas paigutusalgoritm mootorisse ühendub                      |

Nimed jätavad prefiksi `org.eclipse.elk.` ära. Ulatus: [inventuur](/guide/inventory).

## 1. Ulatusse kuuluvate bundle'ite sõltuvused

Tõe allikas: `test/architecture/bundle-deps.json`, tuletatud iga bundle'i `META-INF/MANIFEST.MF`-ist
tööriistaga `tools/bundle-deps.ts` ja jõustatud fitness-testiga (AD-8).
Diagrammil on **32 serva**, võrdne JSON-i 32 `requires` kirjega (graph.json x 2,
core x 1, alg.common x 2, üheksa algoritmi x 3). Kolmandate osapoolte nõuded (Guava, EMF, Gson, Xtendi
teegid) ja ulatusest väljas olevad bundle'id on välja jäetud. Nool `A --> B` tähendab, et A nõuab B-d, seega
võib A kataloog importida B kataloogi. `src/java` on igal pool imporditav ja pole näidatud.

![Sõltuvused 13 ulatusse kuuluva ELK-i bundle'i vahel](/diagrams/component-map-1.svg)

Ükski algoritm ei nõua teist algoritmi: ainus ühine sõltuvus algoritmide vahel on
`alg.common`. Uus import algoritmikataloogide vahel kukutab fitness-testi, kui Java manifestil pole sama serva.

## 2. Tuuma käitusaja osad

Klasside asukohad on kataloogi `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` all,
kui pole märgitud teisiti; kontrollitud fikseeritud commit'il.

| Klass                             | Tee                                 | Roll                                                                       |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                     |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Läbib hierarhia, käitab pakkujat iga taseme jaoks                          |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Iga algoritmi baasklass; realiseerib `IGraphLayoutEngine`'i                |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Algoritmi-, valiku- ja kategooriaandmete singleton-register                |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; üks genereeritud algoritmi-bundle'i kohta (`.melk`-ist) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritmi id pluss pakkujate `getInstancePool()`                           |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Tüübitud valikuvõtmed ja `getProperty` taga olev map-hoidja                |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Graafimudel; elemendid on `EMapPropertyHolder`                             |

Portinud missioon 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine` (jaotatud koos `RecursiveGraphLayoutEngineTopdown`iga, M17), `LayoutAlgorithmResolver` ning
`AbstractLayoutProvider`'i alamklassid `FixedLayoutProvider`, `BoxLayoutProvider` ja `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` ja omaduste tüübid tulid varem (missioonid 2 ja 3). Missioon 5b
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) lõpetas
bundle'i: `AlgorithmAssembler` ja `LayoutProcessorConfiguration` (torustik, mida iga algoritmi-bundle kasutab),
`LayoutConfigurator`, `ElkSpacings`, `ElkMath`i lõigud, `ElkGraphAdapters`, `util/selection/*` ja `comments/*`. Selle
JDK shimmid on `src/java/awt/geom` (`Rectangle2D`) ja `src/java/util/regex` (`Pattern`, `WordBoundary`), kataloogi
`src/java/lang` `JavaCharacter`i kõrval; neid tõestavad `awt.json`, `regex.json`, `character.json` ja
`regex-boundary.json`. Missioonid 6a ja 6b
([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portisid kogu
`alg.common`i; 6b lisas `nodespacing`i ja `NodeMicroLayout`i, tõestatud 326-realise `NodeMicroLayout`i oraakli kordusega.

![ELK-i tuuma käitusaja klassidevahelised seosed](/diagrams/component-map-2.svg)

Kuidas algoritm ühendub:

1. Algoritmi-bundle pakub `AbstractLayoutProvider`'i alamklassi (näiteks `alg.layered`i
   `LayeredLayoutProvider`) ja `.melk`-faili, mis deklareerib selle id, valikud ja toetatud
   funktsioonid.
2. `.melk`-kompilaator genereerib `ILayoutMetaDataProvider`'i ja valikuklassi. Selle
   `apply(Registry)` registreerib `LayoutAlgorithmData`, mille eksemplaripuul loob pakkuja.
3. `LayoutMetaDataService` kogub pakkujad. `LayoutAlgorithmResolver` määrab igale sõlmele algoritmi id
   valikust `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` võtab pakkuja sõlme
   `LayoutAlgorithmData.getInstancePool()`-ist ja kutsub `layout(layoutNode, progressMonitor)`, seejärel
   vabastab selle (või kutsub pärast ebaõnnestumist `dispose()`).

elk-engine'is asendatakse `.melk`-samm generaatoriga (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) ja ElkGraphist saavad
lihtsad TS-klassid (AD-11). Vastendus TS-failidele: [portimiskaart](/guide/port-map); reeglid:
[tõlkereeglid](/guide/translation-rules).
