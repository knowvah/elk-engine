---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Wersja 1.0
    details: Wszystkie algorytmy layoutu ELK objęte zakresem projektu są zportowane i sprawdzone względem ELK
      zbudowanego ze źródeł. Publiczne API jest zamrożone w wersji 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Wersja 1.0
`@knowvah/elk-engine@1.0.0` jest na npm. Wszystkie algorytmy layoutu ELK objęte zakresem projektu są zportowane
i sprawdzone względem ELK zbudowanego ze źródeł; wyniki zawiera [raport zgodności](/parity), a wciąż otwarte różnice
są śledzone jako zgłoszenia (issues). Publiczne API, 72 eksporty, jest zamrożone w wersji 1.0.0, a wersje podlegają
semver. Zacznij od [Pierwszych kroków](/guide/getting-started). Co nastąpi dalej, opisuje
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
