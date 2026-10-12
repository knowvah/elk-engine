---
title: Architektúra
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Az elk-engine architektúrájának áttekintése

| Dokumentum                                          | Tartalom                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Minden ELK-bundle: cél, LOC, generált források, hatókör                                |
| [port-map.md](/guide/port-map)                      | A Java-csomagok leképezése a `src/` moduljaira                                         |
| [component-map.md](#komponenstérkép)                | A hatókörbe tartozó bundle-függőségek; a futtatókörnyezet magelemei                    |
| [../translation-rules.md](/guide/translation-rules) | Java–TypeScript szabályok                                                              |
| [../conformance.md](/hu/conformance)                | Az orákulumos összehasonlítás mércéje és eljárása (később érkezik ebben a küldetésben) |

## Mi az elk-engine

A `@knowvah/elk-engine` az Eclipse Layout Kernel (ELK) hű TypeScript-portolása. A rögzített
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` commit Java kódja a specifikáció (AD-1, AD-2). Könyvtár:
böngészőbiztos, futásidejű függőségek nélkül, Java vagy WASM nélkül. Nyilvános szerződése az ElkGraph
objektummodell és az `ElkGraphUtil` factoryk; az ELK JSON I/O-adapter (AD-14). Tizenhárom bundle, összesen
mintegy 134 600 kézzel írt sorral tartozik a hatókörbe (lásd a leltárt). Ez a küldetés csak a vázat szállítja:
egyetlen elrendezési algoritmus sincs még portolva.

## Viszony az ELK Javához és az orákulumhoz

![Az ELK Java, az orákulum-build, a golden referenciák és az elk-engine viszonya](/diagrams/overview-1.svg)

A patchsorozat ebben a küldetésben üres (AD-3). A goldenek commitolva vannak, így a CI-nak nincs szüksége JVM-re
(AD-5). Összehasonlítás: a struktúra pontosan, a koordináták 1e-6-on belül (AD-4).

## Fő folyamatok

Az ELK elrendezése, amelyet az elk-engine újra előállít (részletek: [component-map.md](#komponenstérkép)):

![Egy elrendezési hívás lefutása a rekurzív elrendezési motoron keresztül](/diagrams/overview-2.svg)

JSON-adapter (`graph.json`, `ElkGraphJson`): a bemeneti ELK JSON az elrendezés előtt az importerrel ElkGraph lesz;
az elrendezés után a kiszámított koordinátákat és éltöredékeket visszaírja a kimeneti JSON-ba. Az orákulum-harness
a Java adaptert ugyanebben a két lépésben használja, így mindkét oldal osztozik a JSON-szerződésen.

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

Az elk-engine-ben a `.melk` lépést egy generátor váltja fel (AD-12, jövőbeli küldetés), az ElkGraph pedig egyszerű
TS-osztályok lesznek (AD-11). Leképezés TS-fájlokra: [portolási térkép](/guide/port-map); szabályok:
[fordítási szabályok](/guide/translation-rules).
