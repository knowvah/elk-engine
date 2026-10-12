---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alpha
    details: Toolchain, architektura, shimy środowiska uruchomieniowego Javy i szkielet weryfikacji już istnieją. Żaden
      algorytm layoutu nie jest jeszcze zportowany.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Żaden algorytm layoutu nie jest jeszcze zportowany, a `src/index.ts` nie eksportuje niczego publicznego. Pierwsza
publikacja w npm zamrozi publiczne API. Co nastąpi dalej, opisuje [plan rozwoju](/guide/roadmap).
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
