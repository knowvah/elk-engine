---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details: Toți algoritmii de layout ELK prevăzuți sunt portați și verificați față de ELK compilat din surse. Până la
      1.0, API-ul se mai poate schimba.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Toți algoritmii de layout ELK prevăzuți sunt portați și verificați față de ELK compilat din surse; [raportul de
paritate](/parity) conține rezultatele. Suprafața de export publică este acceptată, dar nu se află încă în
`src/index.ts`, astfel că punctul de intrare al pachetului nu exportă încă nimic public. Versiunile rămân 0.x până la
1.0, iar până atunci API-ul se mai poate schimba. Consultați [foaia de parcurs](/guide/roadmap) pentru ce urmează.
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
