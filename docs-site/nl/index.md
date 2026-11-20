---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, in puur TypeScript
  tagline: Een getrouwe TypeScript-portering van de Eclipse Layout Kernel. Geen Java, geen WASM — de
    layoutalgoritmen zijn opnieuw geïmplementeerd in gewoon TypeScript en geverifieerd tegen de Java-implementatie.
  actions:
    - theme: brand
      text: Overzicht
      link: /nl/guide/overview
    - theme: alt
      text: Galerie
      link: /nl/showcase/
    - theme: alt
      text: Bekijk op GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Getrouw aan ELK Java
    details: De Java-code op een vastgepinde ELK-commit is de specificatie. Elke vertakking wordt geporteerd, en de
      JUnit-tests worden geporteerd samen met de code die ze testen.
  - title: Geverifieerd tegen een orakel
    details: De uitvoer wordt vergeleken met ELK gebouwd vanuit de broncode. De structuur komt exact overeen; de
      coördinaten komen overeen binnen 1e-6.
  - title: Browser-native, zonder runtime-afhankelijkheden
    details: Geen Java, geen WASM, geen Node-built-ins in de bibliotheekcode. Bundelen en uitleveren.
  - title: Pre-1.0
    details: Alle beoogde ELK-layoutalgoritmen zijn geporteerd en gecontroleerd tegen ELK gebouwd vanuit de broncode.
      Tot 1.0 kan de API nog wijzigen.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Alle beoogde ELK-layoutalgoritmen zijn geporteerd en gecontroleerd tegen ELK gebouwd vanuit de broncode; de
[pariteitsrapportage](/parity) bevat de resultaten. Het publieke exportoppervlak is goedgekeurd maar staat nog
niet in `src/index.ts`, dus de pakketingang exporteert nog niets publieks. De versies blijven 0.x tot 1.0, en tot
die tijd kan de API nog wijzigen. Wat er daarna komt, staat in de [routekaart](/guide/roadmap).
:::

## Kies uw route

| Ik wil…                                                  | Begin hier                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| Begrijpen wat het project wel en niet is                 | [Overzicht](/nl/guide/overview)                                  |
| Zien hoe de onderdelen in elkaar passen                  | [Architectuur](/nl/guide/architecture)                           |
| Weten wat "komt overeen met de Java" betekent            | [Conformiteit](/nl/conformance)                                  |
| Vinden waar een Java-package in de portering terechtkomt | [Porteerkaart](/guide/port-map) · [Inventaris](/guide/inventory) |
| De regels van Java naar TypeScript leren                 | [Vertaalregels](/guide/translation-rules)                        |
| Zien welk Java-runtimegedrag gedekt is                   | [Java-fundamenten](/nl/guide/java-foundations)                   |
| Zien wat er gepland is                                   | [Routekaart](/guide/roadmap)                                     |
| Bijdragen                                                | [Bijdragen](/nl/guide/contributing)                              |
