---
title: Architektura
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Przegląd architektury elk-engine

| Dokument                                            | Zawartość                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | Każdy bundle ELK: cel, LOC, generowane źródła, zakres                          |
| [port-map.md](/guide/port-map)                      | Odwzorowanie pakietów Javy na moduły w `src/`                                  |
| [component-map.md](#mapa-komponentów)               | Zależności bundli w zakresie; główne elementy środowiska uruchomieniowego      |
| [../translation-rules.md](/guide/translation-rules) | Reguły przekładu z Javy na TypeScript                                          |
| [../conformance.md](/pl/conformance)                | Poprzeczka i procedura porównania z wyrocznią (pojawi się później w tej misji) |

## Czym jest elk-engine

`@knowvah/elk-engine` to wierne portowanie Eclipse Layout Kernel (ELK) do TypeScriptu. Java z przypiętego commita
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` jest specyfikacją (AD-1, AD-2). To biblioteka: bezpieczna dla
przeglądarki, bez zależności uruchomieniowych, bez Javy i WASM. Jej publiczny kontrakt to model obiektowy ElkGraph
plus fabryki `ElkGraphUtil`; ELK JSON jest adapterem we/wy (AD-14). W zakresie jest trzynaście bundli o łącznej
liczbie około 134 600 ręcznie pisanych linii (zobacz inwentarz). Ta misja dostarcza tylko szkielet: żaden algorytm
layoutu nie jest jeszcze zportowany.

## Relacja do ELK w Javie i do wyroczni

![Relacja między ELK w Javie, buildem wyroczni, referencjami golden i elk-engine](/diagrams/overview-1.svg)

Seria patchy jest w tej misji pusta (AD-3). Goldeny są zatwierdzone, więc CI nie potrzebuje JVM (AD-5). Porównanie:
struktura dokładnie, współrzędne z dokładnością do 1e-6 (AD-4).

## Kluczowe przepływy

Layout w ELK, który elk-engine odtwarza (szczegóły w [component-map.md](#mapa-komponentów)):

![Przebieg wywołania layoutu przez rekurencyjny silnik layoutu](/diagrams/overview-2.svg)

Adapter JSON (`graph.json`, `ElkGraphJson`): wejściowy ELK JSON staje się ElkGraph przez importer przed layoutem; po
layoucie obliczone współrzędne i sekcje krawędzi są przenoszone z powrotem do wyjściowego JSON. Harness wyroczni
używa adaptera javowego w tych samych dwóch krokach, więc obie strony dzielą kontrakt JSON.

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

W elk-engine krok `.melk` zastępuje generator (AD-12, przyszła misja), a ElkGraph staje się zwykłymi klasami TS
(AD-11). Odwzorowanie na pliki TS: [mapa portowania](/guide/port-map); reguły:
[reguły tłumaczenia](/guide/translation-rules).
