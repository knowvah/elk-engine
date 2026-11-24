---
title: Architektura
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Przegląd architektury elk-engine

| Dokument                                                                                                               | Zawartość                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Każdy bundle ELK: cel, LOC, generowane źródła, zakres                                                                                                           |
| [port-map.md](/guide/port-map)                                                                                         | Odwzorowanie pakietów Javy na moduły w `src/`                                                                                                                   |
| [component-map.md](#mapa-komponentów)                                                                                  | Zależności bundli w zakresie; główne elementy środowiska uruchomieniowego                                                                                       |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Reguły przekładu z Javy na TypeScript                                                                                                                           |
| [../conformance.md](/conformance)                                                                                      | Poprzeczka i procedura porównania z wyrocznią (pojawi się później w tej misji)                                                                                  |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Port ELK Text (`.elkt`), podzbiór Xtext, runbook i odroczone elementy                                                                                           |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Port ELK Textual JSON (`.elkj`), leniwe linkowanie, runbook i odroczone elementy                                                                                |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Port generatora grafów losowych grandom (`.elkr`), dowody i runbook                                                                                             |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Silnik layoutu oraz providery fixed, box i random (misja 5a)                                                                                                    |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Generator `.melk`, typy oczekujące, leniwe stałe, regeneracja                                                                                                   |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Bramka złożoności mierząca każdą funkcję (`npm run complexity`)                                                                                                 |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Framework layered (misja 7a): model LGraph, transformacja, klasy etapowe, runbook                                                                               |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Rozmieszczanie węzłów w layered (misja 7d): p4nodes, Brandes-Köpf, pięć procesorów, wiersze geometrii, runbook                                                  |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Prowadzenie krawędzi w layered (misja 7e): p5edges ortogonalne, polilinia, splajny, sześć procesorów, wiersze prowadzenia, runbook                              |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline layered (misja 7f): `ElkLayered`, `GraphConfigurator`, komponenty, cztery procesory, wiersze pełnych layoutów, podzbiór runnera, runbook               |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Etykiety w layered (misja 7f2): procesory etykiet i komentarzy, rozpakowywanie, wyjście debugowania, visitor, wiersze etykiet, sweep, runbook                   |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Pętle własne, zawijanie i kompaktowanie w layered (misja 7g): pakiet loops, punkty przerwania, kompaktowanie 1D, `ComponentsCompactor`, wiersze, sweep, runbook |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Grafy złożone w layered (misja 7h): pakiet `compound`, hierarchiczny driver, zatrzymania na całym drzewie, goldeny, sweep, bliźniaki kolejności hasha, runbook  |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep TS względem wyroczni (wiersz 9): shardowany runner, kontrakt podsumowania, adnotacje, raport, runbook                                                     |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Wymienny pomiar tekstu etykiet (wiersz 10): patch 0003, bliźniak w TS, tryb stały, dowody, runbook                                                              |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Przesuwanie pinu ELK (wiersz 13): triaż różnicy netto, seria patchy, przebudowa, ponowne nagranie, sweepy, triaż różnic refów, tryb próbny                      |

## Czym jest elk-engine

`@knowvah/elk-engine` to wierne portowanie Eclipse Layout Kernel (ELK) do TypeScriptu. Java z przypiętego commita
`8bca22f4afa3371562d2f702d59929818f7f7b71` jest specyfikacją (AD-1, AD-2). To biblioteka: bezpieczna dla
przeglądarki, bez zależności uruchomieniowych, bez Javy i WASM. Jej publiczny kontrakt to model obiektowy ElkGraph
plus fabryki `ElkGraphUtil`; ELK JSON jest adapterem we/wy (AD-14). W zakresie jest trzynaście bundli o łącznej
liczbie około 134 600 ręcznie pisanych linii (zobacz inwentarz). Stan obecny:
silnik layoutu (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) i trzy
providery rdzenia `fixed`, `box` i `random` są zportowane i równe wyroczni na wyselekcjonowanych goldenach
(misja 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Reszta `core` jest również zportowana (misja 5b: pipeline procesorów, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splajny,
dołączanie komentarzy; zobacz [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Współdzielony bundle `alg.common` jest w pełni zportowany (misja 6a: geometria, simpleks sieciowy, kompaktowanie 1D, nakładania, spore, poliomino; misja 6b: `nodespacing` i `NodeMicroLayout`, udowodnione replayem wyroczni na 326 wierszach; zobacz [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Framework layered jest zportowany (misja 7a: pakiet opcji, model LGraph, transformacja ElkGraph ↔ LGraph i powłoka providera, udowodnione dwoma plikami wektorów wyroczni po 272 i 330 wierszy; fazy layoutu następują w 7b–7h; zobacz [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Jego pierwsze dwie fazy są zportowane (misja 7b: jedenaście łamaczy cykli, dziewięć layererów i dziesięć procesorów wokół nich, udowodnione 651 wierszami faz wyroczni i sweepem 32 652 przypadków; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Jego trzecia faza jest zportowana (misja 7c: minimalizacja przecięć z licznikami, greedy switch, komparatory kolejności modelu i osiem procesorów między P2 a P3, udowodnione 808 wierszami kolejności wyroczni i sweepem 6 728 przypadków; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Jego czwarta faza jest zportowana (misja 7d: cztery rozmieszczacze węzłów z Brandes-Köpf i pięć procesorów potrzebnych zatrzymaniu P4, udowodnione 610 wierszami rozmieszczenia wyroczni z geometrią i sweepem 8 410 przypadków; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Jego piąta faza jest zportowana (misja 7e: routery ortogonalny, polilinii i splajnów z sześcioma procesorami potrzebnymi wynikowi z poprowadzonymi krawędziami, udowodnione 950 wierszami prowadzenia wyroczni z geometrią krawędzi i sweepem 6 728 przypadków; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Pipeline layered działa (misja 7f: driver, pakiet spójnych składowych, transformator kierunku, hierarchiczny router portów i trzy procesory, udowodnione 1 311 wierszami wyroczni z pełnymi layoutami i zatrzymaniami, ponownym odtworzeniem 2 351 wierszy wcześniejszych wierszy przez prawdziwy driver, 28 zportowanymi zestawami JUnit i sweepem 6 646 przypadków; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouty z etykietami i komentarzami, rozpakowywanie warstw i monitor logujący również działają (misja 7f2: rodzina etykiet, procesory komentarzy, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` i narzędzia debugowania, udowodnione 1 305 wierszami wyroczni z zatrzymaniami i pełnymi layoutami, 11 bazowymi zestawami JUnit i sweepem 1 105 przypadków, w którym 935 przypadków ok zgadza się dokładnie; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Pętle własne, zawijanie grafu i kompaktowanie też działają (misja 7g: pakiet loops, cztery procesory pętli własnych, wrappery punktów przerwania i pojedynczych krawędzi, `HorizontalGraphCompactor`, pakiet layered `compaction` i `ComponentsCompactor`, udowodnione 1 642 wierszami wyroczni (`full` 731, `models` 307, `scenarios` 525, `sites` 79), 10 bazowymi zestawami JUnit, sweepem 3 073 przypadków, w którym 2 997 przypadków ok zgadza się dokładnie, a 76 rzuceń zgadza się po obu stronach, oraz dziewięcioramiennym okablowaniem, które zostawia 58 ramion zportowanych; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Grafy złożone też działają (misja 7h: pakiet `compound`, `HierarchicalNodeResizingProcessor` i ostatnie ramię, udowodnione 540 wierszami wyroczni (`full` 355, `models` 73 z zatrzymaniami na całym drzewie, `scenarios` 88, `sites` 24), 24 goldenami layered, dziewięcioma zestawami issue i trzema metodami graph.json, sweepem 1 169 przypadków, w którym 1 164 przypadki ok zgadzają się dokładnie, a 5 rzuceń zgadza się po obu stronach; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Algorytm layered uruchamia teraz każdy tryb obsługi hierarchii: 59 ramion enuma jest zportowanych, żadne nie oczekuje, a lista etapowa jest pusta. Trzy przypadki `elk.stress` z issue #58 czekały na misję 8b i działają od wykonania jej rozstrzygnięcia (misja layered-stress-cases). Żaden inny algorytm layoutu jeszcze nie działa (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Od misji 8a działają także mrtree, radial i vertiflex (udowodnione 1 181 wierszami wyroczni w czterech refach pełnych layoutów i zatrzymań, refem wektorów jednostkowych na 2 656 wierszy, 40 goldenami `trees`, `MrTreeGraphSizeTest` i `CenterOnRootTest` przy 6/6 i 2/2 oraz sweepem 906 przypadków na algorytm, w którym każdy przypadek albo się zgadza, albo jest zdiagnozowany; dwa wiersze radial, których wynik zależy od kolejności w zdrzewiałym koszyku hasha, są sklasyfikowane, nie dopasowane; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Od misji 8b działają także force, stress i disco (udowodnione 21 420 wierszami wyroczni w trzech refach pełnych layoutów i zatrzymań, 45 goldenami `force-disco`, `ForceImportTest` i `TwoBitGridTest` po 3/3 oraz sweepem na algorytm, w którym każdy przypadek albo się zgadza, albo jest zdiagnozowany; `Math.log` z Eades jest bitowo dokładnym portem fdlibm; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Od misji 8c działają także rectpacking, spore (`sporeOverlap`, `sporeCompaction`) i topdownpacking (udowodnione 2 593 wierszami wyroczni w trzech refach, 44 goldenami `packing`, ośmioma zportowanymi zestawami JUnit przy 30 uruchomieniach oraz sweepem na algorytm, w którym każdy deterministyczny przypadek albo się zgadza, albo jest zdiagnozowany; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Każdy algorytm w zakresie jest przepuszczony przez sweep względem wyroczni, a wynik dla każdego algorytmu jest opublikowany w raporcie parytetu ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relacja do ELK w Javie i do wyroczni

![Relacja między ELK w Javie, buildem wyroczni, referencjami golden i elk-engine](/diagrams/overview-1.svg)

Seria patchy jest w tej misji pusta (AD-3). Goldeny są zatwierdzone, więc CI nie potrzebuje JVM (AD-5). Porównanie:
struktura dokładnie, współrzędne z dokładnością do 1e-6 (AD-4).

## Kluczowe przepływy

Layout w ELK, który elk-engine odtwarza dziś dla `fixed`, `box` i `random` (szczegóły w
[component-map.md](#mapa-komponentów) i [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Przebieg wywołania layoutu przez rekurencyjny silnik layoutu](/diagrams/overview-2.svg)

Adapter JSON (`graph.json`, `ElkGraphJson`): wejściowy ELK JSON staje się ElkGraph przez importer przed layoutem; po
layoucie obliczone współrzędne i sekcje krawędzi są przenoszone z powrotem do wyjściowego JSON. Harness wyroczni
używa adaptera javowego w tych samych dwóch krokach, więc obie strony dzielą kontrakt JSON.

Adapter tekstowy (`graph.text`, `ElkGraphText`): tekst `.elkt` ładuje się do ElkGraph przez ręcznie napisany
parser, linker i walidator zbudowane na małym podzbiorze Xtext (`src/xtext`), a ElkGraph serializuje się z powrotem
do `.elkt`. Punkt wejścia jest wewnętrzny; zobacz [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adapter tekstowego JSON (`graph.json.text`, `ElkGraphJsonText`): tekst `.elkj` ładuje się przez ten sam podzbiór Xtext
z ręcznie napisanym parserem i linkuje leniwie jak `LazyLinker` z Xtext: końce krawędzi są proxy EMF
(`src/emf`), które rozwiązują się przy odczycie. ElkGraph serializuje się z powrotem do `.elkj` przez writer specyficzny
dla gramatyki. Punkt wejścia jest wewnętrzny; zobacz [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generator grafów losowych (`core.debug.grandom`, `GRandomText`): tekst `.elkr` jest parsowany przez ręcznie napisany
lekser i parser na tym samym podzbiorze Xtext (`src/xtext`), a `RandomGraphGenerator` zamienia konfigurację
na ElkGraphy z dokładnie taką samą sekwencją `Random` z JVM. Wyjście z seedem jest bajt w bajt zgodne z wyrocznią
i odtwarza dziewięć plików `test/corpus/generated/*.json`; ścieżki bez seeda (tekst etykiet krawędzi, tasowanie
między poziomami hierarchii, brakujący seed) są sprawdzane tylko niezmiennikami. Punkt wejścia jest wewnętrzny; zobacz [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Stos technologiczny

| Zagadnienie           | Wybór                                                           |
| --------------------- | --------------------------------------------------------------- |
| Język                 | TypeScript 7.0.2 (natywny `tsc`), ES2022, NodeNext, `strict`    |
| Testy                 | vitest 5.0.x z `@vitest/coverage-v8` (progi 90%)                |
| Bundlowanie           | esbuild 0.28.x                                                  |
| Uruchamianie skryptów | tsx                                                             |
| Środowisko            | Node 22 lub nowszy; sam `src/` jest bezpieczny dla przeglądarki |
| Tylko dla wyroczni    | Maven 3.9+ i JDK 21 (awaryjnie JDK 17) do builda Tycho w ELK    |

## Ograniczenia architektury (AD-8)

Kierunek importów między bundlami wynika z `test/architecture/bundle-deps.json`; nagłówek SPDX w każdym pliku
z kodem; brak wbudowanych modułów Node ani `process.env` w `src/`; brak modułowego zmiennego `let` poza listą
dozwolonych.

## Toolchain dokumentacji i wydań

Dodane przez wiersz 12 roadmapy; decyzje DP1 do DP9 w
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` opublikowano 2026-11-23.

| Element               | Czym jest                                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Powierzchnia eksportu | Zaakceptowana (2026-11-23), wymieniona w [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) i utrzymywana równą `src/index.ts` przez `src/index.test.ts`; zamrożona przy `1.0.0`, pierwszej publikacji npm (AD-14) |
| Referencja API        | `npm run docs:api`: typedoc w prywatnym pakiecie `tools/typedoc/` z własnym TypeScript 6 (typedoc nie ma wydania dla TypeScript 7, AD-6), do generowanego `/reference/`                                                                                          |
| Przykłady             | `test/docs/examples/*.ts`, pokazane jako fragmenty na stronie getting-started witryny i porównane z refami wyroczni (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                        |
| Kontrola linków       | `npm run docs:linkcheck`: linkinator nad zbudowaną witryną, linki wewnętrzne i fragmenty, w CI; linki zewnętrzne co tydzień (`links.yml`)                                                                                                                        |
| Próba paczki          | `npm run pack:smoke`: spakuj, sprawdź listę plików, zainstaluj offline w czystym projekcie, zaimportuj, ułóż tam przykład i porównaj go z jego refem wyroczni                                                                                                    |
| Wydanie               | konfiguracja semantic-release i `release.yml`, uruchamiane przy każdym pushu do `main`; runbook w [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                               |

# Mapa komponentów

| Diagram                              | Pokazuje                                              |
| ------------------------------------ | ----------------------------------------------------- |
| 1. Zależności bundli                 | 13 bundli w zakresie i ich krawędzie `Require-Bundle` |
| 2. Rdzeń środowiska uruchomieniowego | Jak algorytm layoutu wpina się w silnik               |

Nazwy pomijają prefiks `org.eclipse.elk.`. Zakres: [inwentarz](/guide/inventory).

## 1. Zależności bundli w zakresie

Źródło prawdy: `test/architecture/bundle-deps.json`, wyprowadzone z `META-INF/MANIFEST.MF` każdego bundla przez
`tools/bundle-deps.ts` i wymuszane przez test architektury (AD-8).
Diagram ma **32 krawędzie**, tyle samo co 32 wpisy `requires` w JSON (graph.json x 2,
core x 1, alg.common x 2, dziewięć algorytmów x 3). Wymagania zewnętrzne (Guava, EMF, Gson, biblioteki Xtend)
i bundle poza zakresem zostały pominięte. Strzałka `A --> B` oznacza, że A wymaga B, więc katalog B może być
importowany przez katalog A. `src/java` jest importowalny wszędzie i nie jest pokazany.

![Zależności między 13 bundlami ELK w zakresie](/diagrams/component-map-1.svg)

Żaden algorytm nie wymaga innego algorytmu: jedyną wspólną zależnością algorytmów jest `alg.common`. Nowy import
między katalogami algorytmów powoduje niepowodzenie testu architektury, chyba że manifest Javy ma taką samą krawędź.

## 2. Elementy rdzenia środowiska uruchomieniowego

Lokalizacje klas znajdują się w `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
o ile nie zaznaczono inaczej; zweryfikowane na przypiętym commicie.

| Klasa                             | Ścieżka                             | Rola                                                                     |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                   |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Przechodzi hierarchię, uruchamia providera na każdym poziomie            |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Klasa bazowa każdego algorytmu; implementuje `IGraphLayoutEngine`        |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singletonowy rejestr danych algorytmów, opcji i kategorii                |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; po jednym generowanym na bundle algorytmu (z `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Identyfikator algorytmu plus `getInstancePool()` providerów              |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typowane klucze opcji i mapowy holder stojący za `getProperty`           |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Model grafu; elementy są `EMapPropertyHolder`                            |

Zportowane przez misję 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (podzielony z
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` oraz podklasy `AbstractLayoutProvider`:
`FixedLayoutProvider`, `BoxLayoutProvider` i `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
i typy właściwości pojawiły się wcześniej (misje 2 i 3). Misja 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) dokończyła bundle: `AlgorithmAssembler` i
`LayoutProcessorConfiguration` (pipeline używany przez każdy bundle algorytmu), `LayoutConfigurator`, `ElkSpacings`,
sekcje `ElkMath`, `ElkGraphAdapters`, `util/selection/*` i `comments/*`. Jej shimy JDK to `src/java/awt/geom`
(`Rectangle2D`) i `src/java/util/regex` (`Pattern`, `WordBoundary`), obok `JavaCharacter` w `src/java/lang`;
są udowodnione przez `awt.json`, `regex.json`, `character.json` i `regex-boundary.json`. Misje 6a i 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) zportowały całe `alg.common`; 6b dodała `nodespacing` i `NodeMicroLayout`, udowodnione replayem wyroczni `NodeMicroLayout` na 326 wierszach.

![Relacje między klasami rdzenia środowiska uruchomieniowego ELK](/diagrams/component-map-2.svg)

Jak wpina się algorytm:

1. Bundle algorytmu dostarcza podklasę `AbstractLayoutProvider` (na przykład `LayeredLayoutProvider` z `alg.layered`)
   oraz plik `.melk` deklarujący jego identyfikator, opcje i obsługiwane funkcje.
2. Kompilator `.melk` generuje `ILayoutMetaDataProvider` i klasę opcji. Jego `apply(Registry)` rejestruje
   `LayoutAlgorithmData`, którego pula instancji tworzy providera.
3. `LayoutMetaDataService` zbiera providery. `LayoutAlgorithmResolver` ustawia identyfikator algorytmu na każdym węźle
   na podstawie opcji `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` pobiera providera z `LayoutAlgorithmData.getInstancePool()` węzła
   i wywołuje `layout(layoutNode, progressMonitor)`, a następnie go zwalnia (lub po awarii wywołuje `dispose()`).

W elk-engine krok `.melk` zastępuje generator (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), a ElkGraph staje się zwykłymi klasami TS
(AD-11). Odwzorowanie na pliki TS: [mapa portowania](/guide/port-map); reguły:
[reguły tłumaczenia](/guide/translation-rules).
