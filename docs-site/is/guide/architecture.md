---
title: Arkitektúr
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yfirlit yfir arkitektúr elk-engine

| Skjal                                               | Innihald                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Hver ELK-búnti: tilgangur, LOC, mynduð frumkóði, umfang               |
| [port-map.md](/guide/port-map)                      | Varpning Java-pakka á einingar í `src/`                               |
| [component-map.md](#íhlutakort)                     | Búntaháðindi innan umfangs; kjarnahlutar keyrslutíma                  |
| [../translation-rules.md](/guide/translation-rules) | Reglur frá Java yfir í TypeScript                                     |
| [../conformance.md](/is/conformance)                | Viðmið og verklag véfréttarsamanburðar (kemur síðar í þessu verkefni) |

## Hvað elk-engine er

`@knowvah/elk-engine` er trú yfirfærsla Eclipse Layout Kernel (ELK) yfir í TypeScript. Java-kóðinn
á fasta commitinu `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er skilgreiningin (AD-1, AD-2). Þetta er
safn: öruggt í vafra, án keyrsluháðinda, án Java eða WASM. Opinber samningur þess er
ElkGraph-hlutalíkanið ásamt `ElkGraphUtil`-smiðjum; ELK JSON er I/O-millistykki (AD-14). Þrettán
búntar með alls um 134.600 handskrifuðum línum eru innan umfangs (sjá yfirlitsskrána). Þetta verkefni
skilar aðeins grindinni: ekkert uppröðunaralgrím hefur verið yfirfært enn.

## Tengsl við ELK Java og véfréttina

![Tengsl milli ELK Java, véfréttarbyggingarinnar, golden-viðmiða og elk-engine](/diagrams/overview-1.svg)

Plástraröðin er tóm í þessu verkefni (AD-3). Golden-viðmið eru vistuð í geymslunni, því CI þarf ekki JVM
(AD-5). Samanburður: uppbygging nákvæm, hnit innan 1e-6 (AD-4).

## Helstu ferli

Uppröðun í ELK, sem elk-engine endurgerir (nánar í [component-map.md](#íhlutakort)):

![Ferli uppröðunarkalls í gegnum rekursífu uppröðunarvélina](/diagrams/overview-2.svg)

JSON-millistykki (`graph.json`, `ElkGraphJson`): ELK JSON inn verður að ElkGraph með innflytjandanum
fyrir uppröðun; eftir uppröðun eru útreiknuð hnit og leggjahlutar færð aftur í JSON-úttakið.
Véfréttarhringurinn notar Java-millistykkið í sömu tveimur skrefum, svo báðar hliðar deila JSON-samningnum.

## Tæknistafli

| Viðfangsefni   | Val                                                          |
| -------------- | ------------------------------------------------------------ |
| Tungumál       | TypeScript 7.0.2 (innfætt `tsc`), ES2022, NodeNext, `strict` |
| Próf           | vitest 5.0.x með `@vitest/coverage-v8` (90% þröskuldar)      |
| Pökkun         | esbuild 0.28.x                                               |
| Skriftukeyrsla | tsx                                                          |
| Keyrslutími    | Node 22 eða nýrra; `src/` sjálft er öruggt í vafra           |
| Aðeins véfrétt | Maven 3.9+ og JDK 21 (JDK 17 til vara) fyrir Tycho-smíði ELK |

## Fitness-skorður (AD-8)

Innflutningsstefna búnta fylgir `test/architecture/bundle-deps.json`; SPDX-haus á sérhverri kóðaskrá;
engin innbyggð Node-söfn eða `process.env` í `src/`; ekkert breytanlegt `let` á einingarstigi utan
leyfislistans.

# Íhlutakort

| Skýringarmynd         | Sýnir                                                     |
| --------------------- | --------------------------------------------------------- |
| 1. Búntaháðindi       | Búntana 13 innan umfangs og `Require-Bundle`-leggi þeirra |
| 2. Kjarni keyrslutíma | Hvernig uppröðunaralgrím tengist vélinni                  |

Nöfn sleppa forskeytinu `org.eclipse.elk.`. Umfang: [yfirlitsskrá](/guide/inventory).

## 1. Búntaháðindi innan umfangs

Heimild sannleikans: `test/architecture/bundle-deps.json`, leidd úr `META-INF/MANIFEST.MF` hvers búnta
með `tools/bundle-deps.ts` og framfylgt með fitness-prófinu (AD-8).
Skýringarmyndin hefur **32 leggi**, jafnmarga og 32 `requires`-færslurnar í JSON (graph.json x 2,
core x 1, alg.common x 2, níu algrím x 3). Þriðja aðila kröfur (Guava, EMF, Gson, Xtend-söfn) og
búntar utan umfangs eru undanskildir. Ör `A --> B` merkir að A krefst B, svo mappa B má flytja inn
úr möppu A. `src/java` má flytja inn alls staðar og er ekki sýnt.

![Háðindi milli búntanna 13 í ELK innan umfangs](/diagrams/component-map-1.svg)

Ekkert algrím krefst annars algríms: eina sameiginlega háðið milli algríma er
`alg.common`. Nýr innflutningur milli algrímamappa lætur fitness-prófið mistakast nema
Java-manifestið hafi sama legg.

## 2. Kjarnahlutar keyrslutíma

Slóðir klasa eru undir `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
nema annað sé tekið fram; sannprófað á fasta commitinu.

| Klasi                             | Slóð                                | Hlutverk                                                               |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                 |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Gengur um stigveldið, keyrir veituna á hverju stigi                    |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Grunnklasi hvers algríms; útfærir `IGraphLayoutEngine`                 |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Einstæð skrá yfir gögn um algrím, valkosti og flokka                   |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; einn myndaður fyrir hvern algrímabúnta (úr `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Auðkenni algríms ásamt `getInstancePool()` yfir veitur                 |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Gerðir valkostalyklar og map-haldarinn á bak við `getProperty`         |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Grafalíkan; þættir eru `EMapPropertyHolder`                            |

![Klasatengsl í kjarna ELK-keyrslutíma](/diagrams/component-map-2.svg)

Hvernig algrím tengist:

1. Algrímabúntinn leggur til undirklasa af `AbstractLayoutProvider` (til dæmis
   `LayeredLayoutProvider` úr `alg.layered`) og `.melk`-skrá sem lýsir auðkenni þess, valkostum og
   studdum eiginleikum.
2. `.melk`-þýðandinn myndar `ILayoutMetaDataProvider` og valkostaklasa. `apply(Registry)` hans
   skráir `LayoutAlgorithmData` sem hefur tilvikasafn sem býr til veituna.
3. `LayoutMetaDataService` safnar veitunum. `LayoutAlgorithmResolver` setur auðkenni algríms
   á hvern hnút út frá valkostinum `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` sækir veitu í `LayoutAlgorithmData.getInstancePool()`
   hnútsins og kallar á `layout(layoutNode, progressMonitor)`, og skilar henni síðan
   (eða kallar á `dispose()` eftir bilun).

Í elk-engine kemur rafall í stað `.melk`-skrefsins (AD-12, framtíðarverkefni) og ElkGraph
verður að venjulegum TS-klösum (AD-11). Varpning á TS-skrár: [yfirfærslukort](/guide/port-map); reglur:
[þýðingarreglur](/guide/translation-rules).
