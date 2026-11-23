---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Verzia 1.0
    details: Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči ELK zostavenému zo zdrojov.
      Verejné API je zmrazené vo verzii 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Verzia 1.0
`@knowvah/elk-engine@1.0.0` je na npm. Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči
ELK zostavenému zo zdrojov; výsledky nájdete v [správe o zhode](/parity) a stále otvorené rozdiely sa sledujú ako
issues. Verejné API, 72 exportov, je zmrazené vo verzii 1.0.0 a verzie sa riadia semver. Začnite stránkou
[Začíname](/guide/getting-started); čo príde ďalej, nájdete v [pláne vývoja](/guide/roadmap).
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
