---
title: Przegląd
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Przegląd

`@knowvah/elk-engine` to wierne portowanie [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javowej biblioteki do layoutu grafów, do TypeScriptu. Nie ma tu Javy ani
WASM: algorytmy layoutu są zaimplementowane od nowa w zwykłym TypeScripcie i zweryfikowane względem implementacji
w Javie.

::: tip Wersja 1.0
`@knowvah/elk-engine@1.0.0` jest na npm. Wszystkie algorytmy layoutu ELK objęte zakresem projektu są zportowane
i sprawdzone względem ELK zbudowanego ze źródeł; wyniki zawiera [raport zgodności](/parity), a wciąż otwarte różnice
są śledzone jako zgłoszenia (issues). Publiczne API, 72 eksporty, jest zamrożone w wersji 1.0.0, a wersje podlegają
semver. Zacznij od [Pierwszych kroków](/guide/getting-started). Co dalej, opisuje [plan rozwoju](/guide/roadmap).
:::

## Java jest specyfikacją

Kod źródłowy Javy z przypiętego commita ELK `8bca22f4afa3371562d2f702d59929818f7f7b71` jest wiążącą specyfikacją.
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

Publiczne API to powierzchnia eksportu zaakceptowana w
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 eksporty: model obiektowy ElkGraph i fabryki
`ElkGraphUtil`, silnik layoutu, dostawca metadanych i klasa opcji każdego algorytmu, typy wartości opcji
rdzenia, adapter ELK JSON oraz asynchroniczna funkcja `layout`. ELK JSON jest adapterem we/wy, a nie modelem
rdzenia. [Pierwsze kroki](/guide/getting-started) pokazują tę powierzchnię w użyciu. Powierzchnia jest
zamrożona w wersji 1.0.0, a wersje podlegają semver: usunięcie eksportu oznacza nową wersję główną.

## Ograniczenia środowiska uruchomieniowego

- `src/` jest bezpieczny dla przeglądarki: bez wbudowanych modułów Node, bez `process.env`, wyłącznie moduły ES.
- Nie ma zależności uruchomieniowych.

## Co dalej

- [Architektura](/pl/guide/architecture): jak wyrocznia, bundle i silnik layoutu współpracują.
- [Mapa portowania](/guide/port-map) i [inwentarz](/guide/inventory): które pakiety Javy odpowiadają którym
  modułom.
- [Współtworzenie](/pl/guide/contributing): bramki i przepływ pracy.
