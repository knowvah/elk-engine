---
title: Przegląd
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Przegląd

`@knowvah/elk-engine` to wierne portowanie [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javowej biblioteki do layoutu grafów, do TypeScriptu. Nie ma tu Javy ani
WASM: algorytmy layoutu są zaimplementowane od nowa w zwykłym TypeScripcie i zweryfikowane względem implementacji
w Javie.

::: warning Pre-alpha
Żaden algorytm layoutu nie jest jeszcze zportowany. Repozytorium zawiera toolchain, dokumenty architektury, szkielet
weryfikacji i shimy środowiska uruchomieniowego Javy. `src/index.ts` nie eksportuje jeszcze niczego publicznego.
Kolejność, w jakiej pojawią się algorytmy, opisuje [plan rozwoju](/guide/roadmap).
:::

## Java jest specyfikacją

Kod źródłowy Javy z przypiętego commita ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` jest wiążącą specyfikacją.
Portowanie ściśle za nią podąża:

- Algorytmy nie są optymalizowane ani upraszczane. Jeśli Java wygląda na redundantną, redundancja zostaje.
- Każda gałąź jest portowana, a granice metod zostają zachowane, chyba że TypeScript wymusi zmianę.
- Testy JUnit są portowane razem z kodem, który testują.
- Zachowanie środowiska uruchomieniowego Javy, na którym polega ELK (32-bitowa arytmetyka całkowita, kolejność
  iteracji `HashMap`, sekwencje `Random`), jest odtwarzane przez shimy. Zobacz [Podstawy Javy](/pl/guide/java-foundations).

[Reguły tłumaczenia](/guide/translation-rules) wymieniają, jak każde pojęcie z Javy odwzorowuje się na TypeScript.

## Weryfikacja względem wyroczni

Wyrocznia to upstreamowy ELK zbudowany ze źródeł, w odłączonym worktree gita na przypiętym commicie.
Wyniki portu są porównywane z wynikami wyroczni:

- Identyfikatory, liczby elementów, topologia sekcji krawędzi, liczby punktów załamania i wartości nienumeryczne
  muszą zgadzać się dokładnie.
- Współrzędne i rozmiary liczbowe muszą zgadzać się z bezwzględną tolerancją `1e-6`.

Wyselekcjonowane wyniki wyroczni są zatwierdzone jako referencje golden, więc uruchamianie testów nie wymaga JVM.
Pełna procedura znajduje się na stronie [Zgodność](/pl/conformance).

## Publiczny kontrakt

Publiczne API będzie modelem obiektowym ElkGraph plus fabrykami `ElkGraphUtil`. ELK JSON jest adapterem we/wy,
a nie modelem rdzenia. Pierwsza publikacja w npm zamrozi tę powierzchnię.

## Ograniczenia środowiska uruchomieniowego

- `src/` jest bezpieczny dla przeglądarki: bez wbudowanych modułów Node, bez `process.env`, wyłącznie moduły ES.
- Nie ma zależności uruchomieniowych.

## Co dalej

- [Architektura](/pl/guide/architecture): jak wyrocznia, bundle i silnik layoutu współpracują.
- [Mapa portowania](/guide/port-map) i [inwentarz](/guide/inventory): które pakiety Javy odpowiadają którym
  modułom.
- [Współtworzenie](/pl/guide/contributing): bramki i przepływ pracy.
