---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, în TypeScript pur
  tagline: O portare fidelă în TypeScript a Eclipse Layout Kernel. Fără Java, fără WASM — algoritmii de layout sunt
    reimplementați în TypeScript simplu și verificați față de implementarea Java.
  actions:
    - theme: brand
      text: Prezentare generală
      link: /ro/guide/overview
    - theme: alt
      text: Galerie
      link: /ro/showcase/
    - theme: alt
      text: Vedeți pe GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Fidel față de ELK Java
    details: Codul Java de la un commit ELK fixat este specificația. Fiecare ramură este portată, iar testele JUnit sunt
      portate odată cu codul pe care îl testează.
  - title: Verificat față de un oracol
    details: Ieșirile sunt comparate cu ELK compilat din surse. Structura corespunde exact; coordonatele corespund în
      limita a 1e-6.
  - title: Nativ în browser, fără dependențe de runtime
    details: Fără Java, fără WASM, fără module încorporate Node în codul bibliotecii. Îl includeți în bundle și îl
      livrați.
  - title: Versiunea 1.0
    details: Toți algoritmii de layout ELK prevăzuți sunt portați și verificați față de ELK compilat din surse. API-ul
      public este înghețat la 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versiunea 1.0
`@knowvah/elk-engine@1.0.0` este pe npm. Toți algoritmii de layout ELK prevăzuți sunt portați și verificați față de
ELK compilat din surse; [raportul de paritate](/parity) conține rezultatele, iar diferențele încă deschise sunt
urmărite ca issue-uri. API-ul public, cu 72 de exporturi, este înghețat la 1.0.0, iar versiunile urmează semver.
Începeți cu [Primii pași](/guide/getting-started) și consultați [foaia de parcurs](/guide/roadmap) pentru ce urmează.
:::

## Alegeți drumul dumneavoastră

| Vreau să…                                           | Începeți aici                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Înțeleg ce este și ce nu este proiectul             | [Prezentare generală](/ro/guide/overview)                        |
| Văd cum se îmbină componentele                      | [Arhitectură](/ro/guide/architecture)                            |
| Știu ce înseamnă „corespunde cu Java”               | [Conformitate](/ro/conformance)                                  |
| Găsesc unde ajunge un pachet Java în portare        | [Harta portării](/guide/port-map) · [Inventar](/guide/inventory) |
| Învăț regulile de la Java la TypeScript             | [Reguli de traducere](/guide/translation-rules)                  |
| Văd ce comportament al runtime-ului Java e acoperit | [Fundamente Java](/ro/guide/java-foundations)                    |
| Văd ce este planificat                              | [Foaie de parcurs](/guide/roadmap)                               |
| Contribui                                           | [Contribuire](/ro/guide/contributing)                            |
