---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK w czystym TypeScripcie
  tagline: Wierne portowanie Eclipse Layout Kernel do TypeScriptu. Bez Javy, bez WASM — algorytmy layoutu są
    zaimplementowane od nowa w zwykłym TypeScripcie i zweryfikowane względem implementacji w Javie.
  actions:
    - theme: brand
      text: Przegląd
      link: /pl/guide/overview
    - theme: alt
      text: Galeria
      link: /pl/showcase/
    - theme: alt
      text: Zobacz na GitHubie
      link: https://github.com/knowvah/elk-engine
features:
  - title: Wierność wobec ELK w Javie
    details:
      Java z przypiętego commita ELK jest specyfikacją. Każda gałąź jest portowana, a testy JUnit są portowane razem
      z kodem, który testują.
  - title: Weryfikacja względem wyroczni
    details: Wyniki są porównywane z ELK zbudowanym ze źródeł. Struktura zgadza się dokładnie; współrzędne zgadzają się
      z dokładnością do 1e-6.
  - title: Natywny dla przeglądarki, bez zależności uruchomieniowych
    details: Bez Javy, bez WASM, bez wbudowanych modułów Node w kodzie biblioteki. Zbundluj i wydaj.
  - title: Pre-1.0
    details: Wszystkie algorytmy layoutu ELK objęte zakresem projektu są zportowane i sprawdzone względem ELK
      zbudowanego ze źródeł. Do wersji 1.0 API może się jeszcze zmienić.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Wszystkie algorytmy layoutu ELK objęte zakresem projektu są zportowane i sprawdzone względem ELK zbudowanego
ze źródeł; wyniki zawiera [raport zgodności](/parity). Publiczna powierzchnia eksportu jest zaakceptowana, ale nie
ma jej jeszcze w `src/index.ts`, więc punkt wejścia pakietu nie eksportuje jeszcze niczego publicznego. Wersje
pozostają 0.x do wersji 1.0, a do tego czasu API może się jeszcze zmienić. Co nastąpi dalej, opisuje
[plan rozwoju](/guide/roadmap).
:::

## Wybierz swoją drogę

| Chcę…                                                 | Zacznij tutaj                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| Zrozumieć, czym projekt jest, a czym nie jest         | [Przegląd](/pl/guide/overview)                                     |
| Zobaczyć, jak części do siebie pasują                 | [Architektura](/pl/guide/architecture)                             |
| Wiedzieć, co znaczy „zgadza się z Javą”               | [Zgodność](/pl/conformance)                                        |
| Znaleźć, gdzie pakiet Javy ląduje w porcie            | [Mapa portowania](/guide/port-map) · [Inwentarz](/guide/inventory) |
| Poznać reguły przekładu z Javy na TypeScript          | [Reguły tłumaczenia](/guide/translation-rules)                     |
| Zobaczyć, jakie zachowania środowiska Javy są pokryte | [Podstawy Javy](/pl/guide/java-foundations)                        |
| Zobaczyć, co jest planowane                           | [Plan rozwoju](/guide/roadmap)                                     |
| Współtworzyć                                          | [Współtworzenie](/pl/guide/contributing)                           |
