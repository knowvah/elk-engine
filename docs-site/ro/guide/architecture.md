---
title: Arhitectură
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prezentarea arhitecturii elk-engine

| Document                                            | Conținut                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Fiecare bundle ELK: scop, LOC, surse generate, domeniu                                  |
| [port-map.md](/guide/port-map)                      | Asocierea pachetelor Java cu modulele din `src/`                                        |
| [component-map.md](#harta-componentelor)            | Dependențele bundle-urilor din domeniu; piesele de bază ale runtime-ului                |
| [../translation-rules.md](/guide/translation-rules) | Reguli de la Java la TypeScript                                                         |
| [../conformance.md](/ro/conformance)                | Criteriul și procedura de comparare cu oracolul (sosește mai târziu în această misiune) |

## Ce este elk-engine

`@knowvah/elk-engine` este o portare fidelă în TypeScript a Eclipse Layout Kernel (ELK). Codul Java de la
commit-ul fixat `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` este specificația (AD-1, AD-2). Este o bibliotecă:
sigură pentru browser, fără dependențe de runtime, fără Java sau WASM. Contractul său public este modelul de
obiecte ElkGraph plus fabricile `ElkGraphUtil`; ELK JSON este un adaptor de I/O (AD-14). Treisprezece bundle-uri,
însumând aproximativ 134.600 de linii scrise manual, sunt în domeniu (consultați inventarul). Această misiune
livrează doar scheletul: încă nu a fost portat niciun algoritm de layout.

## Relația cu ELK Java și cu oracolul

![Relația dintre ELK Java, compilarea oracolului, referințele golden și elk-engine](/diagrams/overview-1.svg)

Seria de patch-uri este goală în această misiune (AD-3). Goldens sunt comise, deci CI nu are nevoie de JVM
(AD-5). Comparare: structura exactă, coordonatele în limita a 1e-6 (AD-4).

## Fluxuri principale

Layout-ul în ELK, pe care elk-engine îl reproduce (detalii în [component-map.md](#harta-componentelor)):

![Fluxul unui apel de layout prin motorul de layout recursiv](/diagrams/overview-2.svg)

Adaptorul JSON (`graph.json`, `ElkGraphJson`): ELK JSON de intrare devine un ElkGraph prin importator, înainte de
layout; după layout, coordonatele calculate și secțiunile de muchie sunt transferate înapoi în JSON-ul de ieșire.
Harness-ul oracolului folosește adaptorul Java în aceiași doi pași, astfel că ambele părți împart contractul JSON.

## Stiva tehnologică

| Aspect           | Alegere                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| Limbaj           | TypeScript 7.0.2 (`tsc` nativ), ES2022, NodeNext, `strict`             |
| Teste            | vitest 5.0.x cu `@vitest/coverage-v8` (praguri de 90 %)                |
| Bundling         | esbuild 0.28.x                                                         |
| Rulare scripturi | tsx                                                                    |
| Runtime          | Node 22 sau mai nou; `src/` în sine este sigur pentru browser          |
| Doar oracol      | Maven 3.9+ și JDK 21 (alternativ JDK 17) pentru compilarea Tycho a ELK |

## Constrângeri fitness (AD-8)

Direcția importurilor între bundle-uri urmează `test/architecture/bundle-deps.json`; antet SPDX în fiecare fișier
de cod; fără module încorporate Node sau `process.env` în `src/`; fără `let` mutabil la nivel de modul în afara
listei de permisiuni.

# Harta componentelor

| Diagramă                      | Arată                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| 1. Dependențele bundle-urilor | Cele 13 bundle-uri din domeniu și muchiile lor `Require-Bundle` |
| 2. Runtime-ul de bază         | Cum se conectează un algoritm de layout la motor                |

Numele omit prefixul `org.eclipse.elk.`. Domeniu: [inventar](/guide/inventory).

## 1. Dependențele bundle-urilor din domeniu

Sursa de adevăr: `test/architecture/bundle-deps.json`, derivat din `META-INF/MANIFEST.MF` al fiecărui bundle de
către `tools/bundle-deps.ts` și impus de testul fitness (AD-8).
Diagrama are **32 de muchii**, egal cu cele 32 de intrări `requires` din JSON (graph.json x 2,
core x 1, alg.common x 2, nouă algoritmi x 3). Cerințele terțe (Guava, EMF, Gson, bibliotecile Xtend) și
bundle-urile din afara domeniului sunt omise. O săgeată `A --> B` înseamnă că A necesită B, deci directorul lui B
poate fi importat de directorul lui A. `src/java` poate fi importat oriunde și nu este afișat.

![Dependențele dintre cele 13 bundle-uri ELK din domeniu](/diagrams/component-map-1.svg)

Niciun algoritm nu necesită un alt algoritm: singura dependență comună dintre algoritmi este
`alg.common`. Un import nou între directoarele algoritmilor face testul fitness să eșueze, cu excepția cazului în
care manifestul Java are aceeași muchie.

## 2. Piesele runtime-ului de bază

Locațiile claselor se află sub `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
dacă nu se specifică altfel; verificate la commit-ul fixat.

| Clasă                             | Cale                                | Rol                                                                             |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                          |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Parcurge ierarhia, rulează provider-ul la fiecare nivel                         |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Clasa de bază a fiecărui algoritm; implementează `IGraphLayoutEngine`           |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Registru singleton al datelor despre algoritmi, opțiuni și categorii            |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; unul generat pentru fiecare bundle de algoritm (din `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Id-ul algoritmului plus `getInstancePool()` de provideri                        |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Chei de opțiuni tipizate și deținătorul de tip map din spatele `getProperty`    |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Modelul de graf; elementele sunt `EMapPropertyHolder`                           |

![Relațiile dintre clasele runtime-ului de bază ELK](/diagrams/component-map-2.svg)

Cum se conectează un algoritm:

1. Bundle-ul algoritmului furnizează o subclasă a `AbstractLayoutProvider` (de exemplu
   `LayeredLayoutProvider` din `alg.layered`) și un fișier `.melk` care declară id-ul, opțiunile și
   funcționalitățile suportate.
2. Compilatorul `.melk` generează un `ILayoutMetaDataProvider` și o clasă de opțiuni. `apply(Registry)` al acestuia
   înregistrează un `LayoutAlgorithmData` al cărui pool de instanțe creează provider-ul.
3. `LayoutMetaDataService` colectează provider-ii. `LayoutAlgorithmResolver` setează id-ul algoritmului
   pe fiecare nod din opțiunea `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` preia un provider din
   `LayoutAlgorithmData.getInstancePool()` al nodului și apelează `layout(layoutNode, progressMonitor)`, apoi îl
   eliberează (sau apelează `dispose()` după un eșec).

În elk-engine, pasul `.melk` este înlocuit de un generator (AD-12, misiune viitoare), iar ElkGraph devine clase TS
simple (AD-11). Asocierea cu fișierele TS: [Harta portării](/guide/port-map); reguli:
[Reguli de traducere](/guide/translation-rules).
