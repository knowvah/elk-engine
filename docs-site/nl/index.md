---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alpha
    details: De toolchain, de architectuur, de Java-runtime-shims en de verificatie-infrastructuur bestaan. Er is nog
      geen layoutalgoritme geporteerd.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Er is nog geen layoutalgoritme geporteerd, en `src/index.ts` exporteert niets publieks. De eerste npm-publicatie
bevriest de publieke API. Wat er daarna komt, staat in de [routekaart](/guide/roadmap).
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
