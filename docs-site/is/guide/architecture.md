---
title: Arkitektúr
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yfirlit yfir arkitektúr elk-engine

| Skjal                                                                                                                  | Innihald                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Hver ELK-búnti: tilgangur, LOC, mynduð frumkóði, umfang                                                                                                   |
| [port-map.md](/guide/port-map)                                                                                         | Varpning Java-pakka á einingar í `src/`                                                                                                                   |
| [component-map.md](#íhlutakort)                                                                                        | Búntaháðindi innan umfangs; kjarnahlutar keyrslutíma                                                                                                      |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Reglur frá Java yfir í TypeScript                                                                                                                         |
| [../conformance.md](/conformance)                                                                                      | Viðmið og verklag véfréttarsamanburðar (kemur síðar í þessu verkefni)                                                                                     |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Yfirfærsla ELK Text (`.elkt`), Xtext-hlutmengið, verklag og frestanir                                                                                     |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Yfirfærsla ELK Textual JSON (`.elkj`), löt tenging, verklag og frestanir                                                                                  |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Yfirfærsla grandom (`.elkr`), rafalls handahófskenndra grafa, sönnunargögn og verklag                                                                     |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Uppröðunarvélin og veiturnar fixed, box og random (verkefni 5a)                                                                                           |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-rafallinn, biðgerðir, löt fastagildi, endurmyndun                                                                                                 |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Flækjuhliðið sem mælir sérhvert fall (`npm run complexity`)                                                                                               |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Lagskipt rammaverk (verkefni 7a): LGraph-líkan, umbreyting, stigskiptir klasar, verklag                                                                   |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Lagskipt hnútastaðsetning (verkefni 7d): p4nodes, Brandes-Köpf, fimm vinnsluhlutar, rúmfræðiraðir, verklag                                                |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Lagskipt leggjaleiðsögn (verkefni 7e): p5edges orthogonal, polyline, splines, sex vinnsluhlutar, leiðsagnarraðir, verklag                                 |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Lagskipt vinnslurás (verkefni 7f): `ElkLayered`, `GraphConfigurator`, íhlutir, fjórir vinnsluhlutar, raðir heilla uppröðunar, undirmengi keyrslu, verklag |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Lagskipt merki (verkefni 7f2): merkja- og athugasemdavinnsluhlutar, afpörun laga, villuleitarúttak, heimsóknaraðili, merkjaraðir, sweep, verklag          |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Lagskiptar sjálflykkjur, umbrot, samþjöppun (verkefni 7g): loops-pakkinn, brotpunktar, 1D-samþjöppun, `ComponentsCompactor`, raðir, sweep, verklag        |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Lagskipt samsett graf (verkefni 7h): `compound`-pakkinn, stigveldisrekill, stopp á öllu trénu, golden-viðmið, sweep, tvíburar hass-raðar, verklag         |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep gegn véfréttinni (röð 9): sneiðskipt keyrsla, samantektarsamningur, athugasemdir, skýrsla, verklag                                               |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Skiptanleg textamæling merkja (röð 10): plástur 0003, TS-tvíburinn, fastur hamur, sönnunargögn, verklag                                                   |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Að færa ELK-festinguna (röð 13): flokkun nettó-mismunar, plástraröð, endurbygging, endurskráning, sweep, flokkun á ref-mismun, æfingahamur                |

## Hvað elk-engine er

`@knowvah/elk-engine` er trú yfirfærsla Eclipse Layout Kernel (ELK) yfir í TypeScript. Java-kóðinn
á fasta commitinu `8bca22f4afa3371562d2f702d59929818f7f7b71` er skilgreiningin (AD-1, AD-2). Þetta er
safn: öruggt í vafra, án keyrsluháðinda, án Java eða WASM. Opinber samningur þess er
ElkGraph-hlutalíkanið ásamt `ElkGraphUtil`-smiðjum; ELK JSON er I/O-millistykki (AD-14). Þrettán
búntar með alls um 134.600 handskrifuðum línum eru innan umfangs (sjá yfirlitsskrána). Núverandi
staða: uppröðunarvélin (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) og
veiturnar þrjár í kjarnanum, `fixed`, `box` og `random`, eru yfirfærðar og jafngilda véfréttinni á völdum
golden-viðmiðum (verkefni 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)).
Afgangur `core` er einnig yfirfærður (verkefni 5b: vinnsluhlutaröðin, `LayoutConfigurator`, `ElkSpacings`,
`ElkMath`, splines, tenging athugasemda; sjá
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Sameiginlegi búntinn `alg.common` er fullyfirfærður (verkefni 6a: rúmfræði, network simplex, 1D-samþjöppun,
skörun, spore, polyomino; verkefni 6b: `nodespacing` og `NodeMicroLayout`, sannað með 326 raða
véfréttarendurspilun; sjá [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Lagskipta rammaverkið er yfirfært (verkefni 7a: valkostapakkinn, LGraph-líkanið, umbreyting ElkGraph ↔ LGraph
og veituskelin, sannað með tveimur véfréttarvigurskrám með 272 og 330 röðum; uppröðunarstigin fylgja í
7b–7h; sjá [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)).
Fyrstu tvö stig þess eru yfirfærð (verkefni 7b: hringrofarnir ellefu, lagskiptin níu og vinnsluhlutarnir tíu
í kringum þau, sannað með 651 véfréttarstigsröð og 32.652 tilvika sweep;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Þriðja stig þess er yfirfært (verkefni 7c: minnkun skurðpunkta með teljurum sínum, greedy switch,
líkanaraðarsamanburðarföllin og vinnsluhlutarnir átta milli P2 og P3, sannað með 808 véfréttarröðunarröðum og
6.728 tilvika sweep;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Fjórða stig þess er yfirfært (verkefni 7d: hnútastaðsetjararnir fjórir með Brandes-Köpf og vinnsluhlutarnir
fimm sem P4-stopp þarfnast, sannað með 610 véfréttarstaðsetningarröðum með rúmfræði og 8.410 tilvika sweep;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Fimmta stig þess er yfirfært (verkefni 7e: orthogonal-, polyline- og spline-leiðsagnarnir með vinnsluhlutunum
sex sem leiðsagt niðurstaða þarfnast, sannað með 950 véfréttarleiðsagnarröðum með leggjarúmfræði og 6.728
tilvika sweep;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
Lagskipti vinnsluráskerfið keyrir (verkefni 7f: reklinn, pakki samhangandi þátta, stefnuumbreytirinn,
stigveldisgáttaleiðsögnin og þrír vinnsluhlutar, sannað með 1.311 véfréttarröðum heilla uppröðunar og stoppa,
2.351 raða endurspilun fyrri raða í gegnum raunverulega rekilinn, 28 yfirfærðum JUnit-söfnum og 6.646 tilvika
sweep;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Uppröðun með merkjum og athugasemdum, afpörun laga og skráningarvöktun keyrir einnig (verkefni 7f2:
merkjafjölskyldan, athugasemdavinnsluhlutarnir, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`
og villuleitartólin, sannað með 1.305 véfréttarröðum stoppa og heilla uppröðunar, grunn-JUnit-söfnunum 11 og
1.105 tilvika sweep þar sem 935 ok-tilvik stemma nákvæmlega;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Sjálflykkjur, umbrot grafa og samþjöppun keyra líka (verkefni 7g: loops-pakkinn, vinnsluhlutarnir fjórir fyrir
sjálflykkjur, brotpunkta- og einleggjaumbrotsrarnir, `HorizontalGraphCompactor`, layered-pakkinn `compaction`
og `ComponentsCompactor`, sannað með 1.627 véfréttarröðum (`full` 731, `models` 307, `scenarios` 525, `sites`
64), JUnit-söfnunum 10 í grunni, 3.073 tilvika sweep þar sem 2.997 ok-tilvik stemma nákvæmlega og 76 undantekningar
stemma báðum megin, og níu arma tengingunni sem skilur eftir 58 yfirfærða arma;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Samsett graf keyra líka (verkefni 7h: `compound`-pakkinn, `HierarchicalNodeResizingProcessor` og síðasti armurinn,
sannað með 540 véfréttarröðum (`full` 355, `models` 73 með stoppum á öllu trénu, `scenarios` 88, `sites` 24),
24 layered golden-viðmiðum, níu issue-söfnum og þremur graph.json-aðferðum, 1.169 tilvika sweep þar sem 1.164
ok-tilvik stemma nákvæmlega og 5 undantekningar stemma báðum megin;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
Lagskipta algrímið keyrir nú alla stigveldishami: 59 enum-armar eru yfirfærðir, enginn bíður og stigskipti
listinn er tómur. Aðeins þrjú `elk.stress`-tilvik issue #58 bíða (verkefni 8b). Ekkert annað
uppröðunaralgrím keyrir enn (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex).
Frá og með verkefni 8a keyra mrtree, radial og vertiflex einnig (sannað með 1.181 véfréttarröð í fjórum
ref-skrám heilla uppröðunar og stoppa, 2.656 raða einingarvigur-ref, 40 `trees` golden-viðmiðum,
`MrTreeGraphSizeTest` og `CenterOnRootTest` á 6/6 og 2/2, og 906 tilvika sweep fyrir hvert algrím þar sem
sérhvert tilvik annaðhvort stemmir eða er greint; tvær radial-raðir þar sem niðurstaðan ræðst af röð
treeified hash-bing eru flokkaðar, ekki látnar stemma;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)).
Frá og með verkefni 8b keyra force, stress og disco einnig (sannað með 21.420 véfréttarröðum í þremur
ref-skrám heilla uppröðunar og stoppa, 45 `force-disco` golden-viðmiðum, `ForceImportTest` og
`TwoBitGridTest` á 3/3 hvort, og sweep fyrir hvert algrím þar sem sérhvert tilvik annaðhvort stemmir eða er
greint; `Math.log` í Eades er bitnákvæm fdlibm-yfirfærsla;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)).
Frá og með verkefni 8c keyra rectpacking, spore (`sporeOverlap`, `sporeCompaction`) og topdownpacking einnig
(sannað með 2.593 véfréttarröðum í þremur ref-skrám, 44 `packing` golden-viðmiðum, JUnit-söfnunum átta á 30
keyrslum, og sweep fyrir hvert algrím þar sem sérhvert ákvarðanabundið tilvik stemmir eða er greint;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)).
Sérhvert algrím innan umfangs er sweepað gegn véfréttinni og niðurstaða hvers algríms er birt í
samanburðarskýrslunni ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Tengsl við ELK Java og véfréttina

![Tengsl milli ELK Java, véfréttarbyggingarinnar, golden-viðmiða og elk-engine](/diagrams/overview-1.svg)

Plástraröðin er tóm í þessu verkefni (AD-3). Golden-viðmið eru vistuð í geymslunni, því CI þarf ekki JVM
(AD-5). Samanburður: uppbygging nákvæm, hnit innan 1e-6 (AD-4).

## Helstu ferli

Uppröðun í ELK, sem elk-engine endurgerir í dag fyrir `fixed`, `box` og `random` (nánar í
[component-map.md](#íhlutakort) og
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Ferli uppröðunarkalls í gegnum rekursífu uppröðunarvélina](/diagrams/overview-2.svg)

JSON-millistykki (`graph.json`, `ElkGraphJson`): ELK JSON inn verður að ElkGraph með innflytjandanum
fyrir uppröðun; eftir uppröðun eru útreiknuð hnit og leggjahlutar færð aftur í JSON-úttakið.
Véfréttarhringurinn notar Java-millistykkið í sömu tveimur skrefum, svo báðar hliðar deila JSON-samningnum.

Textamillistykki (`graph.text`, `ElkGraphText`): `.elkt`-texti hleðst inn í ElkGraph í gegnum handskrifaðan
þáttara, tengil og sannprófara sem byggja á litlu Xtext-hlutmengi (`src/xtext`), og ElkGraph er raðgreint aftur
í `.elkt`. Inngangspunkturinn er innri; sjá [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Textamillistykki fyrir JSON (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-texti hleðst inn í gegnum sama
Xtext-hlutmengi með handskrifuðum þáttara og tengist lati eins og `LazyLinker` í Xtext: endapunktar leggja eru
EMF-staðgenglar (`src/emf`) sem leysast þegar þeir eru lesnir. ElkGraph er raðgreint aftur í `.elkj` með
ritara sem er sértækur fyrir málfræðina. Inngangspunkturinn er innri; sjá
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Rafall handahófskenndra grafa (`core.debug.grandom`, `GRandomText`): `.elkr`-texti er þáttaður með handskrifuðum
lesara og þáttara á sama Xtext-hlutmengi (`src/xtext`), og `RandomGraphGenerator` breytir stillingu í ElkGraph
með nákvæmlega sömu `Random`-runu JVM. Úttak með fræi er bætisnákvæmt gegn véfréttinni og endurskapar skrárnar
níu `test/corpus/generated/*.json`; leiðir án fræs (texti leggjamerkja, stokkun milli stigvelda, vantandi
fræ) eru aðeins prófaðar með gildum sem alltaf eiga að haldast. Inngangspunkturinn er innri; sjá
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Skjöl og útgáfuverkfæri

Bætt við með vegvísisröð 12; ákvarðanir DP1 til DP9 í
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md).
`1.0.0` var gefin út 2026-11-23.

| Hluti             | Hvað það er                                                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Útflutningsflötur | Samþykktur (2026-11-23), skráður í [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) og haldið jöfnum `src/index.ts` með `src/index.test.ts`; frystur við `1.0.0`, fyrstu npm-útgáfuna (AD-14) |
| API-tilvísun      | `npm run docs:api`: typedoc í einkapakkanum `tools/typedoc/` með eigin TypeScript 6 (typedoc hefur enga TypeScript 7 útgáfu, AD-6), í myndaða `/reference/`                                                                                   |
| Dæmi              | `test/docs/examples/*.ts`, sýnd á byrjunarsíðu vefsins sem brot og borin saman við véfréttar-ref (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                        |
| Hlekkjaathugun    | `npm run docs:linkcheck`: linkinator yfir smíðaða vefinn, innri hlekkir og brotamerki, í CI; ytri hlekkir vikulega (`links.yml`)                                                                                                              |
| Pökkunaræfing     | `npm run pack:smoke`: pakka, athuga skráalistann, setja upp án nets í hreinu verkefni, flytja inn, raða upp dæmi þar og bera það saman við véfréttar-ref þess                                                                                 |
| Útgáfa            | stillingar semantic-release og `release.yml`, keyrt við hverja ýtingu á `main`; verklag í [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                    |

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

Yfirfært með verkefni 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine` (skipt með `RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver`, og
undirklasar `AbstractLayoutProvider`: `FixedLayoutProvider`, `BoxLayoutProvider` og `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` og eiginleikagerðirnar komu fyrr (verkefni 2 og 3). Verkefni 5b
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))
lauk búntanum: `AlgorithmAssembler` og `LayoutProcessorConfiguration` (rásin sem sérhver algrímabúnti notar),
`LayoutConfigurator`, `ElkSpacings`, `ElkMath`-hlutarnir, `ElkGraphAdapters`, `util/selection/*` og
`comments/*`. JDK-skeljar þess eru `src/java/awt/geom` (`Rectangle2D`) og `src/java/util/regex` (`Pattern`,
`WordBoundary`), við hlið `JavaCharacter` í `src/java/lang`; þær eru sannaðar með `awt.json`, `regex.json`,
`character.json` og `regex-boundary.json`. Verkefni 6a og 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md))
yfirfærðu allt `alg.common`; 6b bætti við `nodespacing` og `NodeMicroLayout`, sannað með 326 raða
`NodeMicroLayout`-véfréttarendurspilun.

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

Í elk-engine kemur rafall í stað `.melk`-skrefsins (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) og ElkGraph
verður að venjulegum TS-klösum (AD-11). Varpning á TS-skrár: [yfirfærslukort](/guide/port-map); reglur:
[þýðingarreglur](/guide/translation-rules).
