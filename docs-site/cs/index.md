---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK v čistém TypeScriptu
  tagline: Věrné portování Eclipse Layout Kernel do TypeScriptu. Žádná Java, žádné WASM — algoritmy rozvržení jsou
    znovu implementovány v obyčejném TypeScriptu a ověřeny proti implementaci v Javě.
  actions:
    - theme: brand
      text: Přehled
      link: /cs/guide/overview
    - theme: alt
      text: Galerie
      link: /cs/showcase/
    - theme: alt
      text: Zobrazit na GitHubu
      link: https://github.com/knowvah/elk-engine
features:
  - title: Věrné ELK v Javě
    details:
      Java v zafixovaném commitu ELK je specifikací. Každá větev je portována a testy JUnit se portují spolu s kódem,
      který testují.
  - title: Ověřeno proti orákulu
    details: Výstupy se porovnávají s ELK sestaveným ze zdrojů. Struktura se shoduje přesně; souřadnice se shodují v
      rozmezí 1e-6.
  - title: Nativní pro prohlížeč, bez závislostí za běhu
    details: Žádná Java, žádné WASM, žádné vestavěné moduly Node v kódu knihovny. Zabalte a nasaďte.
  - title: Verze 1.0
    details:
      Všechny algoritmy rozvržení ELK v rozsahu projektu jsou portovány a ověřeny proti ELK sestavenému ze zdrojů.
      Veřejné API je zmrazeno ve verzi 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Verze 1.0
`@knowvah/elk-engine@1.0.0` je na npm. Všechny algoritmy rozvržení ELK v rozsahu projektu jsou portovány a ověřeny
proti ELK sestavenému ze zdrojů; výsledky najdete ve [zprávě o shodě](/parity), rozdíly, které jsou stále otevřené,
se sledují jako issues. Veřejné API, 72 exportů, je od verze 1.0.0 zmrazeno a verze se řídí semver. Začněte
v [Začínáme](/guide/getting-started). Co přijde dál, najdete v [plánu vývoje](/guide/roadmap).
:::

## Vyberte si svou cestu

| Chci…                                                   | Začněte zde                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Pochopit, čím projekt je a čím není                     | [Přehled](/cs/guide/overview)                                    |
| Vidět, jak do sebe díly zapadají                        | [Architektura](/cs/guide/architecture)                           |
| Vědět, co znamená „shoduje se s Javou“                  | [Shoda](/conformance)                                            |
| Zjistit, kam v portování zapadne balíček Javy           | [Mapa portování](/guide/port-map) · [Inventář](/guide/inventory) |
| Naučit se pravidla překladu z Javy do TypeScriptu       | [Pravidla překladu](/guide/translation-rules)                    |
| Vidět, které chování běhového prostředí Javy je pokryto | [Základy Javy](/cs/guide/java-foundations)                       |
| Vidět, co je plánováno                                  | [Plán vývoje](/guide/roadmap)                                    |
| Přispět                                                 | [Jak přispívat](/cs/guide/contributing)                          |
