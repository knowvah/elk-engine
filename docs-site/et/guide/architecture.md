---
title: Arhitektuur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine'i arhitektuuri ülevaade

| Dokument                                            | Sisu                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | Iga ELK-i bundle: eesmärk, LOC, genereeritud lähtekood, ulatus           |
| [port-map.md](/guide/port-map)                      | Java pakettide vastendus `src/` moodulitele                              |
| [component-map.md](#komponendikaart)                | Ulatusse kuuluvate bundle'ite sõltuvused; käitusaja tuumosad             |
| [../translation-rules.md](/guide/translation-rules) | Java ja TypeScripti vahelised reeglid                                    |
| [../conformance.md](/et/conformance)                | Oraakliga võrdlemise lävi ja protseduur (ilmub hiljem selles missioonis) |

## Mis on elk-engine

`@knowvah/elk-engine` on Eclipse Layout Kernel'i (ELK) truu TypeScripti portimine. Java fikseeritud commit'il
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` on spetsifikatsioon (AD-1, AD-2). See on teek: brauseriohutu, ilma
käitusaja sõltuvusteta, ilma Javata ja WASM-ita. Selle avalik leping on ElkGraphi objektimudel pluss
`ElkGraphUtil`i fabrikud; ELK JSON on I/O adapter (AD-14). Ulatusse kuulub kolmteist bundle'it kokku umbes
134 600 käsitsi kirjutatud reaga (vt inventuuri). See missioon annab ainult tugikonstruktsiooni: ühtegi
paigutusalgoritmi pole veel portitud.

## Seos ELK Java ja oraakliga

![ELK Java, oraakliehituse, golden-viidete ja elk-engine'i vaheline seos](/diagrams/overview-1.svg)

Paikade seeria on selles missioonis tühi (AD-3). Goldenid on sisse commit'itud, nii et CI ei vaja JVM-i
(AD-5). Võrdlus: struktuur täpselt, koordinaadid 1e-6 piires (AD-4).

## Põhivood

Paigutus ELK-is, mida elk-engine taasloob (üksikasjad lehel [component-map.md](#komponendikaart)):

![Paigutuskutse käik rekursiivse paigutusmootori kaudu](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): sisenev ELK JSON muudetakse importija abil enne paigutust
ElkGraphiks; pärast paigutust kantakse arvutatud koordinaadid ja servasektsioonid tagasi väljuvasse JSON-i.
Oraakli harness kasutab Java adapterit samas kahes sammus, nii et mõlemal poolel on ühine JSON-i leping.

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

elk-engine'is asendatakse `.melk`-samm generaatoriga (AD-12, tulevane missioon) ja ElkGraphist saavad
lihtsad TS-klassid (AD-11). Vastendus TS-failidele: [portimiskaart](/guide/port-map); reeglid:
[tõlkereeglid](/guide/translation-rules).
