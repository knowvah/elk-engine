---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alfa
    details: Toolchain, architektura, shimy běhového prostředí Javy a ověřovací kostra existují. Zatím není portován
      žádný algoritmus rozvržení.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alfa
Zatím není portován žádný algoritmus rozvržení a `src/index.ts` neexportuje nic veřejného. První publikace na npm
zafixuje veřejné API. Co přijde dál, najdete v [plánu vývoje](/guide/roadmap).
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
