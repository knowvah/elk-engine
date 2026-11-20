---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK v čistom TypeScripte
  tagline: Verný port Eclipse Layout Kernel do TypeScriptu. Bez Javy, bez WASM — algoritmy rozloženia sú
    znovu implementované v obyčajnom TypeScripte a overené voči implementácii v Jave.
  actions:
    - theme: brand
      text: Prehľad
      link: /sk/guide/overview
    - theme: alt
      text: Galéria
      link: /sk/showcase/
    - theme: alt
      text: Zobraziť na GitHube
      link: https://github.com/knowvah/elk-engine
features:
  - title: Verný ELK Java
    details:
      Java na pripnutom commite ELK je špecifikácia. Portuje sa každá vetva a testy JUnit sa portujú spolu s kódom,
      ktorý testujú.
  - title: Overené voči orákulu
    details: Výstupy sa porovnávajú s ELK zostavenými zo zdrojov. Štruktúra sa zhoduje presne; súradnice sa zhodujú
      v rámci 1e-6.
  - title: Natívne pre prehliadač, bez runtime závislostí
    details: Bez Javy, bez WASM, bez vstavaných modulov Node v kóde knižnice. Zbaľte a nasaďte.
  - title: Pre-1.0
    details: Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči ELK zostavenému zo zdrojov.
      Do verzie 1.0 sa API ešte môže zmeniť.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči ELK zostavenému zo zdrojov;
výsledky nájdete v [správe o zhode](/parity). Verejný exportný povrch je schválený, no zatiaľ nie je v `src/index.ts`,
takže vstupný bod balíka zatiaľ neexportuje nič verejné. Verzie zostávajú 0.x do verzie 1.0 a dovtedy sa API ešte
môže zmeniť. Čo príde ďalej, nájdete v [pláne vývoja](/guide/roadmap).
:::

## Vyberte si svoju cestu

| Chcem…                                                      | Začnite tu                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Pochopiť, čo projekt je a čo nie je                         | [Prehľad](/sk/guide/overview)                                     |
| Vidieť, ako do seba jednotlivé časti zapadajú               | [Architektúra](/sk/guide/architecture)                            |
| Vedieť, čo znamená „zhoduje sa s Javou“                     | [Zhoda](/sk/conformance)                                          |
| Nájsť, kam sa balík Javy v porte zaradí                     | [Mapa portovania](/guide/port-map) · [Inventár](/guide/inventory) |
| Naučiť sa pravidlá Java na TypeScript                       | [Pravidlá prekladu](/guide/translation-rules)                     |
| Vidieť, ktoré správanie behového prostredia Javy je pokryté | [Základy Javy](/sk/guide/java-foundations)                        |
| Vidieť, čo je naplánované                                   | [Plán vývoja](/guide/roadmap)                                     |
| Prispieť                                                    | [Ako prispievať](/sk/guide/contributing)                          |
