---
title: Architektúra
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Az elk-engine architektúrájának áttekintése

| Dokumentum                                                                                                             | Tartalom                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Minden ELK-bundle: cél, LOC, generált források, hatókör                                                                                                  |
| [port-map.md](/guide/port-map)                                                                                         | A Java-csomagok leképezése a `src/` moduljaira                                                                                                           |
| [component-map.md](#komponenstérkép)                                                                                   | A hatókörbe tartozó bundle-függőségek; a futtatókörnyezet magelemei                                                                                      |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java–TypeScript szabályok                                                                                                                                |
| [../conformance.md](/conformance)                                                                                      | Az orákulumos összehasonlítás mércéje és eljárása (később érkezik ebben a küldetésben)                                                                   |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Az ELK Text (`.elkt`) portolása, az Xtext részhalmaza, runbook és elhalasztott részek                                                                    |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Az ELK Textual JSON (`.elkj`) portolása, lusta linkelés, runbook és elhalasztott részek                                                                  |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | A grandom (`.elkr`) véletlengráf-generátor portolása, bizonyítékok és runbook                                                                            |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Az elrendezési motor és a fixed, box és random providerek (5a küldetés)                                                                                  |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | A `.melk`-generátor, függő típusok, lusta konstansok, újragenerálás                                                                                      |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | A komplexitási kapu, amely minden függvényt mér (`npm run complexity`)                                                                                   |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered keretrendszer (7a küldetés): LGraph-modell, transzformáció, fázisosztályok, runbook                                                              |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered csomópont-elhelyezés (7d küldetés): p4nodes, Brandes-Köpf, öt processzor, geometriasorok, runbook                                                |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered élvezetés (7e küldetés): p5edges ortogonális, töröttvonal, spline-ok, hat processzor, útvonalsorok, runbook                                      |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered pipeline (7f küldetés): `ElkLayered`, `GraphConfigurator`, komponensek, négy processzor, teljes elrendezési sorok, a runner részhalmaza, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered címkék (7f2 küldetés): címke- és megjegyzésprocesszorok, kicsomagolás, debug-kimenet, visitor, címkesorok, sweep, runbook                        |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered önhurkok, wrapping, tömörítés (7g küldetés): loops csomag, töréspontok, 1D-tömörítés, `ComponentsCompactor`, sorok, sweep, runbook               |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered összetett gráfok (7h küldetés): `compound` csomag, hierarchikus driver, teljes fa megállásai, goldenek, sweep, hash-sorrendű ikrek, runbook      |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep az orákulum ellen (9. sor): shardolt runner, összegzési szerződés, annotációk, jelentés, runbook                                                |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Cserélhető címkeszöveg-mérés (10. sor): 0003-as patch, a TS-iker, fixed mód, bizonyítékok, runbook                                                       |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Az ELK rögzített commitjának mozgatása (13. sor): nettó diff triázsa, patchsorozat, újraépítés, újrarögzítés, sweepek, referenciadiff triázsa, próbamód  |

## Mi az elk-engine

A `@knowvah/elk-engine` az Eclipse Layout Kernel (ELK) hű TypeScript-portolása. A rögzített
`8bca22f4afa3371562d2f702d59929818f7f7b71` commit Java kódja a specifikáció (AD-1, AD-2). Könyvtár:
böngészőbiztos, futásidejű függőségek nélkül, Java vagy WASM nélkül. Nyilvános szerződése az ElkGraph
objektummodell és az `ElkGraphUtil` factoryk; az ELK JSON I/O-adapter (AD-14). Tizenhárom bundle, összesen
mintegy 134 600 kézzel írt sorral tartozik a hatókörbe (lásd a leltárt). Jelenlegi állapot: az elrendezési motor
(`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) és a három magprovider, a `fixed`, a `box`
és a `random` portolva van, és megegyezik az orákulummal a válogatott goldeneken (5a küldetés,
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). A `core`
többi része is portolva van (5b küldetés: processzor-pipeline, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`,
spline-ok, megjegyzések csatolása; lásd
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
A közös `alg.common` bundle teljesen portolva van (6a küldetés: geometria, hálózati szimplex, 1D-tömörítés,
átfedések, spore, polyomino; 6b küldetés: `nodespacing` és `NodeMicroLayout`, 326 soros orákulum-visszajátszással
bizonyítva; lásd [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
A layered keretrendszer portolva van (7a küldetés: az options csomag, az LGraph-modell, az ElkGraph ↔ LGraph
transzformáció és a provider-héj, két orákulum-vektorfájllal bizonyítva, 272 és 330 sorral; az elrendezési fázisok
a 7b–7h küldetésekben következnek; lásd
[alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Első két fázisa
portolva van (7b küldetés: a tizenegy ciklustörő, a kilenc rétegező és a körülöttük lévő tíz processzor, 651
orákulum-fázissorral és egy 32 652 esetes sweeppel bizonyítva;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Harmadik fázisa portolva van (7c küldetés: a keresztezések minimalizálása a számlálóival, a greedy switch, a
modellsorrend-komparátorok és a P2 és P3 közötti nyolc processzor, 808 orákulum-sorrendsorral és egy 6 728 esetes
sweeppel bizonyítva;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Negyedik fázisa portolva van (7d küldetés: a négy csomópont-elhelyező a Brandes-Köpffel és az öt processzor, amelyet
egy P4-megállás igényel, 610 orákulum-elhelyezési sorral geometriával és egy 8 410 esetes sweeppel bizonyítva;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Ötödik fázisa portolva van (7e küldetés: az ortogonális, a töröttvonalas és a spline-útválasztó a hat processzorral,
amelyet egy útvonalazott eredmény igényel, 950 orákulum-útvonalsorral élgeometriával és egy 6 728 esetes sweeppel
bizonyítva;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
A layered pipeline fut (7f küldetés: a driver, az összefüggő komponensek csomagja, az irányátalakító, a hierarchikus
portok útválasztója és három processzor, 1 311 orákulumsorral teljes elrendezésekről és megállásokról, a korábbi
sorok 2 351 soros újrajátszásával a valódi driveren át, 28 portolt JUnit-csomaggal és egy 6 646 esetes sweeppel
bizonyítva;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
A címkézett és megjegyzésekkel ellátott elrendezések, a rétegek kicsomagolása és egy naplózó monitor is futnak
(7f2 küldetés: a címkecsalád, a megjegyzésprocesszorok, az `AlternatingLayerUnzipper`,
az `InteractiveLayeredGraphVisitor` és a debug-segédeszközök, 1 305 orákulumsorral megállásokról és teljes
elrendezésekről, a 11 alap JUnit-csomaggal és egy 1 105 esetes sweeppel bizonyítva, amelynek 935 ok esete pontosan
egyezik;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Az önhurkok, a gráf wrappingje és a tömörítés is futnak (7g küldetés: a loops csomag, a négy önhurok-processzor, a
töréspont- és az egyéleres wrapperek, a `HorizontalGraphCompactor`, a layered `compaction` csomag és a
`ComponentsCompactor`, 1 642 orákulumsorral (`full` 731, `models` 307, `scenarios` 525, `sites` 79), a 10 alap
JUnit-csomaggal, egy 3 073 esetes sweeppel, amelynek 2 997 ok esete pontosan egyezik és 76 kivétele mindkét oldalon
egyezik, valamint a kilencágú bekötéssel bizonyítva, amely 58 ágat hagy portolva;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Az összetett gráfok is futnak (7h küldetés: a `compound` csomag, a `HierarchicalNodeResizingProcessor` és az utolsó
ág, 540 orákulumsorral (`full` 355, `models` 73 teljes fa megállásaival, `scenarios` 88, `sites` 24), 24 layered
goldennel, a kilenc issue-csomaggal és három graph.json-metódussal, egy 1 169 esetes sweeppel bizonyítva, amelynek
1 164 ok esete pontosan egyezik és 5 kivétele mindkét oldalon egyezik;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
A layered algoritmus most már minden hierarchiakezelési módot futtat: 59 enumág portolva van, egy sem függőben, és a
fokozatos lista üres. A #58-as issue három `elk.stress` esete a 8b küldetésre várt, és a döntése végrehajtása óta fut (layered-stress-cases küldetés). Más elrendezési algoritmus még
nem fut (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). A 8a küldetés óta az mrtree, a
radial és a vertiflex is fut (1 181 orákulumsorral négy, teljes elrendezéseket és megállásokat tartalmazó
referenciában, egy 2 656 soros egységvektor-referenciával, 40 `trees` goldennel, a `MrTreeGraphSizeTest` és a
`CenterOnRootTest` 6/6 és 2/2 eredményével, valamint algoritmusonként egy 906 esetes sweeppel bizonyítva, amelyben
minden eset vagy egyezik, vagy diagnosztizált; két radial sor, amelynek eredménye egy fává alakított hash-kosár
sorrendjétől függ, osztályozott, nem egyeztetett;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). A 8b küldetés óta a
force, a stress és a disco is fut (21 420 orákulumsorral három, teljes elrendezéseket és megállásokat tartalmazó
referenciában, 45 `force-disco` goldennel, a `ForceImportTest` és a `TwoBitGridTest` 3/3 eredményével, valamint
algoritmusonként egy sweeppel bizonyítva, amelyben minden eset vagy egyezik, vagy diagnosztizált; az Eades-féle
`Math.log` bitpontos fdlibm-portolás;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). A 8c
küldetés óta a rectpacking, a spore (`sporeOverlap`, `sporeCompaction`) és a topdownpacking is fut (2 593
orákulumsorral három referenciában, 44 `packing` goldennel, a nyolc portolt JUnit-csomaggal 30 futtatással, valamint
algoritmusonként egy sweeppel bizonyítva, amelyben minden determinisztikus eset vagy egyezik, vagy diagnosztizált;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Minden
hatókörbe tartozó algoritmust sweepeltek az orákulum ellen, és az algoritmusonkénti eredmény a paritásjelentésben
jelenik meg
([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Viszony az ELK Javához és az orákulumhoz

![Az ELK Java, az orákulum-build, a golden referenciák és az elk-engine viszonya](/diagrams/overview-1.svg)

A patchsorozat ebben a küldetésben üres (AD-3). A goldenek commitolva vannak, így a CI-nak nincs szüksége JVM-re
(AD-5). Összehasonlítás: a struktúra pontosan, a koordináták 1e-6-on belül (AD-4).

## Fő folyamatok

Az ELK elrendezése, amelyet az elk-engine ma a `fixed`, a `box` és a `random` esetében újra előállít (részletek:
[component-map.md](#komponenstérkép) és
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Egy elrendezési hívás lefutása a rekurzív elrendezési motoron keresztül](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): a bemeneti ELK JSON az elrendezés előtt az importerrel ElkGraph lesz;
az elrendezés után a kiszámított koordinátákat és éltöredékeket visszaírja a kimeneti JSON-ba. Az orákulum-harness
a Java adaptert ugyanebben a két lépésben használja, így mindkét oldal osztozik a JSON-szerződésen.

Szöveges adapter (`graph.text`, `ElkGraphText`): az `.elkt` szöveg kézzel írt parser, linker és validátor révén
töltődik be ElkGraphként, egy kis Xtext-részhalmazra (`src/xtext`) építve, az ElkGraph pedig visszaszerializálódik
`.elkt` formátumba. A belépési pont belső; lásd
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Szöveges JSON adapter (`graph.json.text`, `ElkGraphJsonText`): az `.elkj` szöveg ugyanazon az Xtext-részhalmazon
keresztül töltődik be kézzel írt parserrel, és lustán linkelődik, mint az Xtext `LazyLinker`-e: az élvégpontok EMF
proxyk (`src/emf`), amelyek olvasáskor oldódnak fel. Az ElkGraph visszaszerializálódik `.elkj` formátumba egy
grammatikaspecifikus íróval. A belépési pont belső; lásd
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Véletlengráf-generátor (`core.debug.grandom`, `GRandomText`): az `.elkr` szöveget kézzel írt lexer és parser
elemzi ugyanazon az Xtext-részhalmazon (`src/xtext`), a `RandomGraphGenerator` pedig a konfigurációból ElkGraphokat
állít elő a JVM `Random` pontos sorozatával. A magolt kimenet bájtra pontos az orákulummal szemben, és
reprodukálja a kilenc `test/corpus/generated/*.json` fájlt; a mag nélküli utakat (élcímke szövege, hierarchiákon
átívelő keverés, hiányzó mag) csak invariánsokkal ellenőrzik. A belépési pont belső; lásd
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Technológiai stack

| Szempont            | Választás                                                       |
| ------------------- | --------------------------------------------------------------- |
| Nyelv               | TypeScript 7.0.2 (natív `tsc`), ES2022, NodeNext, `strict`      |
| Tesztek             | vitest 5.0.x az `@vitest/coverage-v8`-cal (90%-os küszöbök)     |
| Csomagolás          | esbuild 0.28.x                                                  |
| Szkriptfuttató      | tsx                                                             |
| Futtatókörnyezet    | Node 22 vagy újabb; maga a `src/` böngészőbiztos                |
| Csak az orákulumhoz | Maven 3.9+ és JDK 21 (tartalék: JDK 17) az ELK Tycho-buildjéhez |

## Fitness-megszorítások (AD-8)

A bundle-ök importiránya a `test/architecture/bundle-deps.json` fájlt követi; SPDX-fejléc minden kódfájlon;
nincsenek Node beépített modulok vagy `process.env` a `src/` alatt; nincs modulszintű módosítható `let` az
engedélyezőlistán kívül.

## Dokumentációs és kiadási eszközlánc

A 12. ütemterv-sor adta hozzá; a DP1–DP9 döntések a
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md)
fájlban vannak. Az `1.0.0` 2026-11-23-án jelent meg.

| Elem           | Mi ez                                                                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exportfelület  | Elfogadva (2026-11-23), a [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) sorolja fel, és a `src/index.test.ts` tartja egyenlőnek a `src/index.ts`-sel; az `1.0.0`-ra befagyasztva, az első npm-kiadás (AD-14) |
| API-referencia | `npm run docs:api`: typedoc a privát `tools/typedoc/` csomagban a saját TypeScript 6-jával (a typedocnak nincs TypeScript 7 kiadása, AD-6), a generált `/reference/` mappába                                                                                    |
| Példák         | `test/docs/examples/*.ts`, a webhely első lépések oldalán részletekként mutatva és az orákulum-referenciákkal összevetve (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                  |
| Linkellenőrzés | `npm run docs:linkcheck`: linkinator az elkészült webhelyen, belső linkek és fragmentek, CI-ben; külső linkek hetente (`links.yml`)                                                                                                                             |
| Csomagpróba    | `npm run pack:smoke`: csomagolás, a fájllista ellenőrzése, offline telepítés egy tiszta projektbe, importálás, egy példa elrendezése ott és összevetése az orákulum-referenciájával                                                                             |
| Kiadás         | semantic-release konfiguráció és `release.yml`, minden `main`-re történő push-nál fut; runbook a [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md) fájlban                                                                       |

# Komponenstérkép

| Diagram                  | Mit mutat                                                 |
| ------------------------ | --------------------------------------------------------- |
| 1. Bundle-függőségek     | A 13 hatókörbe tartozó bundle és a `Require-Bundle` éleik |
| 2. Futtatókörnyezeti mag | Hogyan csatlakozik egy elrendezési algoritmus a motorhoz  |

A nevek elhagyják az `org.eclipse.elk.` előtagot. Hatókör: [leltár](/guide/inventory).

## 1. A hatókörbe tartozó bundle-függőségek

Mérvadó forrás: `test/architecture/bundle-deps.json`, amelyet a `tools/bundle-deps.ts` az egyes bundle-ök
`META-INF/MANIFEST.MF` fájljából származtat, és amelyet a fitness-teszt kikényszerít (AD-8).
A diagramnak **32 éle** van, ami megegyezik a JSON 32 `requires` bejegyzésével (graph.json x 2,
core x 1, alg.common x 2, kilenc algoritmus x 3). A külső követelmények (Guava, EMF, Gson, Xtend
könyvtárak) és a hatókörön kívüli bundle-ök kimaradnak. Az `A --> B` nyíl azt jelenti, hogy A igényli B-t, így
B könyvtárát A könyvtára importálhatja. A `src/java` mindenhol importálható, és nincs ábrázolva.

![A 13 hatókörbe tartozó ELK-bundle közti függőségek](/diagrams/component-map-1.svg)

Egyetlen algoritmus sem igényel másik algoritmust: az algoritmusok közötti egyetlen közös függőség az
`alg.common`. Az algoritmuskönyvtárak közötti új import megbuktatja a fitness-tesztet, hacsak a Java-manifestben
nincs ugyanaz az él.

## 2. A futtatókörnyezeti mag elemei

Az osztályok helye a `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` alatt van,
ha nincs másként jelezve; a rögzített commitnál ellenőrizve.

| Osztály                           | Útvonal                             | Szerep                                                                      |
| --------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                      |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Bejárja a hierarchiát, szintenként futtatja a providert                     |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Minden algoritmus alaposztálya; megvalósítja az `IGraphLayoutEngine`-t      |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Az algoritmus-, opció- és kategóriaadatok singleton registryje              |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; algoritmus-bundle-önként egy generálódik (a `.melk`-ből) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritmusazonosító plusz a providerek `getInstancePool()` készlete         |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Típusos opciókulcsok és a `getProperty` mögötti map-tároló                  |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Gráfmodell; az elemek `EMapPropertyHolder`-ek                               |

Az 5a küldetés portolta ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
a `RecursiveGraphLayoutEngine` (a `RecursiveGraphLayoutEngineTopdown`-nal megosztva, M17), a
`LayoutAlgorithmResolver`, valamint az `AbstractLayoutProvider` alosztályai, a `FixedLayoutProvider`, a
`BoxLayoutProvider` és a `RandomLayoutProvider`. A `LayoutMetaDataService`, a `LayoutAlgorithmData` és a
tulajdonságtípusok korábban jöttek (2. és 3. küldetés). Az 5b küldetés
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))
befejezte a bundle-t: `AlgorithmAssembler` és `LayoutProcessorConfiguration` (a pipeline, amelyet minden
algoritmus-bundle használ), `LayoutConfigurator`, `ElkSpacings`, az `ElkMath` szakaszai, `ElkGraphAdapters`,
`util/selection/*` és `comments/*`. JDK-shimjei a `src/java/awt/geom` (`Rectangle2D`) és a `src/java/util/regex`
(`Pattern`, `WordBoundary`), a `src/java/lang` alatti `JavaCharacter` mellett; ezeket az `awt.json`, a `regex.json`,
a `character.json` és a `regex-boundary.json` bizonyítja. A 6a és 6b küldetés
([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portolta az egész
`alg.common`-t; a 6b hozzáadta a `nodespacing`-et és a `NodeMicroLayout`-ot, egy 326 soros `NodeMicroLayout`
orákulum-visszajátszással bizonyítva.

![Az ELK futtatókörnyezeti magjának osztálykapcsolatai](/diagrams/component-map-2.svg)

Hogyan csatlakozik egy algoritmus:

1. Az algoritmus-bundle szállít egy `AbstractLayoutProvider` alosztályt (például az `alg.layered`
   `LayeredLayoutProvider` osztályát) és egy `.melk` fájlt, amely deklarálja az azonosítóját, az opcióit és a
   támogatott képességeit.
2. A `.melk`-fordító generál egy `ILayoutMetaDataProvider`-t és egy opcióosztályt. Ennek
   `apply(Registry)` metódusa regisztrál egy `LayoutAlgorithmData`-t, amelynek példánykészlete létrehozza a providert.
3. A `LayoutMetaDataService` összegyűjti a providereket. A `LayoutAlgorithmResolver` az `algorithm` opció alapján
   beállítja az algoritmusazonosítót minden csomóponton.
4. A `RecursiveGraphLayoutEngine.executeAlgorithm` lekér egy providert a csomópont
   `LayoutAlgorithmData.getInstancePool()` készletéből, és meghívja a `layout(layoutNode, progressMonitor)` metódust, majd
   felszabadítja (vagy hiba után a `dispose()` metódust hívja).

Az elk-engine-ben a `.melk` lépést egy generátor váltja fel (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), az ElkGraph pedig egyszerű
TS-osztályok lesznek (AD-11). Leképezés TS-fájlokra: [portolási térkép](/guide/port-map); szabályok:
[fordítási szabályok](/guide/translation-rules).
