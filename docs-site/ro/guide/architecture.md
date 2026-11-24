---
title: Arhitectură
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prezentarea arhitecturii elk-engine

| Document                                                                                                               | Conținut                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Fiecare bundle ELK: scop, LOC, surse generate, domeniu                                                                                                                     |
| [port-map.md](/guide/port-map)                                                                                         | Asocierea pachetelor Java cu modulele din `src/`                                                                                                                           |
| [component-map.md](#harta-componentelor)                                                                               | Dependențele bundle-urilor din domeniu; piesele de bază ale runtime-ului                                                                                                   |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Reguli de la Java la TypeScript                                                                                                                                            |
| [../conformance.md](/conformance)                                                                                      | Criteriul și procedura de comparare cu oracolul (sosește mai târziu în această misiune)                                                                                    |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portarea ELK Text (`.elkt`), subsetul Xtext, runbook și amânări                                                                                                            |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portarea ELK Textual JSON (`.elkj`), legare leneșă, runbook și amânări                                                                                                     |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portarea generatorului de grafuri aleatorii grandom (`.elkr`), dovezi și runbook                                                                                           |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Motorul de layout și provider-ii fixed, box și random (misiunea 5a)                                                                                                        |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Generatorul `.melk`, tipuri în așteptare, constante leneșe, regenerare                                                                                                     |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Poarta de complexitate care măsoară fiecare funcție (`npm run complexity`)                                                                                                 |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Cadrul layered (misiunea 7a): modelul LGraph, transformarea, clase pe etape, runbook                                                                                       |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Plasarea nodurilor în layered (misiunea 7d): p4nodes, Brandes-Köpf, cinci procesoare, rânduri de geometrie, runbook                                                        |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Rutarea muchiilor în layered (misiunea 7e): p5edges ortogonal, polilinie, spline-uri, șase procesoare, rânduri de rutare, runbook                                          |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline-ul layered (misiunea 7f): `ElkLayered`, `GraphConfigurator`, componente, patru procesoare, rânduri de layout complet, subsetul runner-ului, runbook               |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Etichetele în layered (misiunea 7f2): procesoarele de etichete și comentarii, unzipping, ieșire de depanare, visitor, rânduri de etichete, sweep, runbook                  |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Self loops, wrapping și compactare în layered (misiunea 7g): pachetul loops, puncte de rupere, compactare 1D, `ComponentsCompactor`, rânduri, sweep, runbook               |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Grafuri compuse în layered (misiunea 7h): pachetul `compound`, driver ierarhic, opriri pe tot arborele, goldens, sweep, gemeni de ordine hash, runbook                     |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep-ul TS față de oracol (rândul 9): runner shardat, contractul rezumatului, adnotări, raport, runbook                                                                   |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Măsurarea conectabilă a textului etichetelor (rândul 10): patch 0003, geamănul TS, modul fixed, dovezi, runbook                                                            |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Mutarea pin-ului ELK (rândul 13): triajul diferenței nete, seria de patch-uri, recompilare, reînregistrare, sweep-uri, triajul diferențelor de referințe, mod de repetiție |

## Ce este elk-engine

`@knowvah/elk-engine` este o portare fidelă în TypeScript a Eclipse Layout Kernel (ELK). Codul Java de la
commit-ul fixat `8bca22f4afa3371562d2f702d59929818f7f7b71` este specificația (AD-1, AD-2). Este o bibliotecă:
sigură pentru browser, fără dependențe de runtime, fără Java sau WASM. Contractul său public este modelul de
obiecte ElkGraph plus fabricile `ElkGraphUtil`; ELK JSON este un adaptor de I/O (AD-14). Treisprezece bundle-uri,
însumând aproximativ 134.600 de linii scrise manual, sunt în domeniu (consultați inventarul). Starea curentă:
motorul de layout (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) și cei trei provideri de bază `fixed`, `box` și `random` sunt portați și egali cu oracolul pe golden-urile curate (misiunea 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Restul bundle-ului `core` este portat și el (misiunea 5b: pipeline-ul de procesoare, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, spline-uri, atașarea comentariilor; vezi [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Bundle-ul comun `alg.common` este portat complet (misiunea 6a: geometrie, network simplex, compactare 1D, suprapuneri, spore, polyomino; misiunea 6b: `nodespacing` și `NodeMicroLayout`, dovedite printr-o reluare de 326 de rânduri față de oracol; vezi [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Cadrul layered este portat (misiunea 7a: pachetul de opțiuni, modelul LGraph, transformarea ElkGraph ↔ LGraph și învelișul provider-ului, dovedite prin două fișiere de vectori ale oracolului de 272 și 330 de rânduri; fazele de layout urmează în 7b–7h; vezi [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Primele sale două faze sunt portate (misiunea 7b: cele unsprezece procese de rupere a ciclurilor, cele nouă layerere și cele zece procesoare din jurul lor, dovedite prin 651 de rânduri de fază ale oracolului și un sweep de 32.652 de cazuri; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). A treia fază este portată (misiunea 7c: minimizarea încrucișărilor cu contoarele sale, greedy switch, comparatoarele de ordine a modelului și cele opt procesoare dintre P2 și P3, dovedite prin 808 rânduri de ordine ale oracolului și un sweep de 6.728 de cazuri; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). A patra fază este portată (misiunea 7d: cele patru plasatoare de noduri cu Brandes-Köpf și cele cinci procesoare de care are nevoie o oprire la P4, dovedite prin 610 rânduri de plasare ale oracolului cu geometrie și un sweep de 8.410 cazuri; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). A cincea fază este portată (misiunea 7e: routerele ortogonal, polilinie și spline, cu cele șase procesoare de care are nevoie un rezultat rutat, dovedite prin 950 de rânduri de rutare ale oracolului cu geometria muchiilor și un sweep de 6.728 de cazuri; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Pipeline-ul layered rulează (misiunea 7f: driverul, pachetul componentelor conexe, transformatorul de direcție, routerul porturilor ierarhice și trei procesoare, dovedite prin 1.311 rânduri de layout-uri complete și opriri ale oracolului, o re-reluare de 2.351 de rânduri a rândurilor anterioare prin driverul real, 28 de suite JUnit portate și un sweep de 6.646 de cazuri; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Rulează și layout-urile cu etichete și comentarii, layer unzipping și un monitor de logare (misiunea 7f2: familia etichetelor, procesoarele de comentarii, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` și utilitarele de depanare, dovedite prin 1.305 rânduri de opriri și layout-uri complete ale oracolului, cele 11 suite JUnit de bază și un sweep de 1.105 cazuri ale cărui 935 de cazuri ok se potrivesc exact; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Rulează și self loops, graph wrapping și compactarea (misiunea 7g: pachetul loops, cele patru procesoare de self loops, wrapper-ele pe puncte de rupere și pe muchie unică, `HorizontalGraphCompactor`, pachetul layered `compaction` și `ComponentsCompactor`, dovedite prin 1.642 de rânduri ale oracolului (`full` 731, `models` 307, `scenarios` 525, `sites` 79), cele 10 suite JUnit de bază, un sweep de 3.073 de cazuri ale cărui 2.997 de cazuri ok se potrivesc exact și ale cărui 76 de excepții aruncate se potrivesc pe ambele părți, și cablarea celor nouă brațe care lasă 58 de brațe portate; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Rulează și grafurile compuse (misiunea 7h: pachetul `compound`, `HierarchicalNodeResizingProcessor` și ultimul braț, dovedite prin 540 de rânduri ale oracolului (`full` 355, `models` 73 cu opriri pe tot arborele, `scenarios` 88, `sites` 24), 24 de golden-uri layered, cele nouă suite de issue-uri și trei metode graph.json, un sweep de 1.169 de cazuri ale cărui 1.164 de cazuri ok se potrivesc exact și ale cărui 5 excepții aruncate se potrivesc pe ambele părți; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Algoritmul layered rulează acum fiecare mod de tratare a ierarhiei: 59 de brațe de enum sunt portate, niciunul nu este în așteptare, iar lista de etapizare este goală. Cele trei cazuri `elk.stress` din issue-ul #58 au așteptat misiunea 8b și rulează de când decizia ei a fost aplicată (misiunea layered-stress-cases). Niciun alt algoritm de layout nu rulează încă (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). De la misiunea 8a rulează și mrtree, radial și vertiflex (dovedite prin 1.181 de rânduri ale oracolului în patru referințe de layout-uri complete și opriri, o referință de vectori unitari de 2.656 de rânduri, 40 de golden-uri `trees`, `MrTreeGraphSizeTest` și `CenterOnRootTest` la 6/6 și 2/2, și un sweep de 906 cazuri per algoritm în care fiecare caz fie se potrivește, fie este diagnosticat; două rânduri radial al căror rezultat depinde de ordinea unui bin hash transformat în arbore sunt clasificate, nu potrivite; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). De la misiunea 8b rulează și force, stress și disco (dovedite prin 21.420 de rânduri ale oracolului în trei referințe de layout-uri complete și opriri, 45 de golden-uri `force-disco`, `ForceImportTest` și `TwoBitGridTest` la 3/3 fiecare, și un sweep per algoritm în care fiecare caz fie se potrivește, fie este diagnosticat; `Math.log` din Eades este o portare fdlibm exactă la nivel de bit; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). De la misiunea 8c rulează și rectpacking, spore (`sporeOverlap`, `sporeCompaction`) și topdownpacking (dovedite prin 2.593 de rânduri ale oracolului în trei referințe, 44 de golden-uri `packing`, cele opt suite JUnit portate la 30 de rulări, și un sweep per algoritm în care fiecare caz determinist fie se potrivește, fie este diagnosticat; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Fiecare algoritm din domeniu este supus unui sweep față de oracol, iar rezultatul per algoritm este publicat în raportul de paritate ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relația cu ELK Java și cu oracolul

![Relația dintre ELK Java, compilarea oracolului, referințele golden și elk-engine](/diagrams/overview-1.svg)

Seria de patch-uri este goală în această misiune (AD-3). Goldens sunt comise, deci CI nu are nevoie de JVM
(AD-5). Comparare: structura exactă, coordonatele în limita a 1e-6 (AD-4).

## Fluxuri principale

Layout-ul în ELK, pe care elk-engine îl reproduce astăzi pentru `fixed`, `box` și `random` (detalii în [component-map.md](#harta-componentelor) și [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Fluxul unui apel de layout prin motorul de layout recursiv](/diagrams/overview-2.svg)

Adaptorul JSON (`graph.json`, `ElkGraphJson`): ELK JSON de intrare devine un ElkGraph prin importator, înainte de
layout; după layout, coordonatele calculate și secțiunile de muchie sunt transferate înapoi în JSON-ul de ieșire.
Harness-ul oracolului folosește adaptorul Java în aceiași doi pași, astfel că ambele părți împart contractul JSON.

Adaptorul de text (`graph.text`, `ElkGraphText`): textul `.elkt` se încarcă într-un ElkGraph printr-un parser,
un linker și un validator scrise manual, construite pe un mic subset Xtext (`src/xtext`), iar un ElkGraph se
serializează înapoi în `.elkt`. Punctul de intrare este intern; vezi [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptorul JSON textual (`graph.json.text`, `ElkGraphJsonText`): textul `.elkj` se încarcă prin același subset Xtext
cu un parser scris manual și se leagă leneș, ca `LazyLinker` din Xtext: capetele muchiilor sunt proxy-uri EMF
(`src/emf`) care se rezolvă la citire. Un ElkGraph se serializează înapoi în `.elkj` printr-un writer specific
gramaticii. Punctul de intrare este intern; vezi [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generatorul de grafuri aleatorii (`core.debug.grandom`, `GRandomText`): textul `.elkr` se parsează printr-un lexer
și un parser scrise manual pe același subset Xtext (`src/xtext`), iar `RandomGraphGenerator` transformă o configurație
în ElkGraph-uri cu secvența exactă a `Random` din JVM. Rezultatul cu seed este identic octet cu octet cu oracolul și
reproduce cele nouă fișiere `test/corpus/generated/*.json`; căile fără seed (textul etichetelor de muchie, amestecarea
între ierarhii, un seed lipsă) sunt verificate doar prin invarianți. Punctul de intrare este intern; vezi [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Lanțul de instrumente pentru documentație și lansare

Adăugat de rândul 12 al foii de parcurs; deciziile DP1–DP9 în
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` a fost publicat pe 2026-11-23.

| Piesă                  | Ce este                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suprafața de export    | Acceptată (2026-11-23), listată în [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) și ținută egală cu `src/index.ts` de `src/index.test.ts`; înghețată la `1.0.0`, prima publicare npm (AD-14) |
| Referința API          | `npm run docs:api`: typedoc în pachetul privat `tools/typedoc/` cu propriul TypeScript 6 (typedoc nu are o versiune pentru TypeScript 7, AD-6), în `/reference/` generat                                                                        |
| Exemple                | `test/docs/examples/*.ts`, afișate pe pagina de început a site-ului ca fragmente și comparate cu referințele oracolului (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                   |
| Verificarea linkurilor | `npm run docs:linkcheck`: linkinator peste site-ul compilat, linkuri interne și fragmente, în CI; linkurile externe săptămânal (`links.yml`)                                                                                                    |
| Repetiția pachetului   | `npm run pack:smoke`: împachetare, verificarea listei de fișiere, instalare offline într-un proiect curat, import, layout al unui exemplu acolo și compararea lui cu referința oracolului                                                       |
| Lansare                | configurația semantic-release și `release.yml`, rulate la fiecare push pe `main`; runbook în [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                   |

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

Portate de misiunea 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (împărțit cu
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` și subclasele `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` și `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
și tipurile de proprietăți au venit mai devreme (misiunile 2 și 3). Misiunea 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) a completat bundle-ul: `AlgorithmAssembler` și
`LayoutProcessorConfiguration` (pipeline-ul folosit de fiecare bundle de algoritm), `LayoutConfigurator`, `ElkSpacings`, secțiunile
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` și `comments/*`. Shim-urile sale JDK sunt `src/java/awt/geom`
(`Rectangle2D`) și `src/java/util/regex` (`Pattern`, `WordBoundary`), alături de `JavaCharacter` în `src/java/lang`;
sunt dovedite prin `awt.json`, `regex.json`, `character.json` și `regex-boundary.json`. Misiunile 6a și 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) au portat tot `alg.common`; 6b a adăugat `nodespacing` și `NodeMicroLayout`, dovedite printr-o reluare de 326 de rânduri `NodeMicroLayout` față de oracol.

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

În elk-engine, pasul `.melk` este înlocuit de un generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), iar ElkGraph devine clase TS
simple (AD-11). Asocierea cu fișierele TS: [Harta portării](/guide/port-map); reguli:
[Reguli de traducere](/guide/translation-rules).
