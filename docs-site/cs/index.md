---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details:
      Všechny algoritmy rozvržení ELK v rozsahu projektu jsou portovány a ověřeny proti ELK sestavenému ze zdrojů.
      Do verze 1.0 se API ještě může změnit.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Všechny algoritmy rozvržení ELK v rozsahu projektu jsou portovány a ověřeny proti ELK sestavenému ze zdrojů;
výsledky najdete ve [zprávě o shodě](/parity). Veřejný exportní povrch je schválen, ale zatím není v `src/index.ts`,
takže vstupní bod balíčku zatím neexportuje nic veřejného. Verze zůstávají 0.x do verze 1.0 a do té doby se API ještě
může změnit. Co přijde dál, najdete v [plánu vývoje](/guide/roadmap).
:::

## Vyberte si svou cestu

| Chci…                                                   | Začněte zde                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Pochopit, čím projekt je a čím není                     | [Přehled](/cs/guide/overview)                                    |
| Vidět, jak do sebe díly zapadají                        | [Architektura](/cs/guide/architecture)                           |
| Vědět, co znamená „shoduje se s Javou“                  | [Shoda](/cs/conformance)                                         |
| Zjistit, kam v portování zapadne balíček Javy           | [Mapa portování](/guide/port-map) · [Inventář](/guide/inventory) |
| Naučit se pravidla překladu z Javy do TypeScriptu       | [Pravidla překladu](/guide/translation-rules)                    |
| Vidět, které chování běhového prostředí Javy je pokryto | [Základy Javy](/cs/guide/java-foundations)                       |
| Vidět, co je plánováno                                  | [Plán vývoje](/guide/roadmap)                                    |
| Přispět                                                 | [Jak přispívat](/cs/guide/contributing)                          |
