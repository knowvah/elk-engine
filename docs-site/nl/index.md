---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Versie 1.0
    details: Alle beoogde ELK-layoutalgoritmen zijn geporteerd en gecontroleerd tegen ELK gebouwd vanuit de broncode.
      De publieke API ligt vast in 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versie 1.0
`@knowvah/elk-engine@1.0.0` staat op npm. Alle beoogde ELK-layoutalgoritmen zijn geporteerd en gecontroleerd tegen
ELK gebouwd vanuit de broncode; de [pariteitsrapportage](/parity) bevat de resultaten, en nog openstaande
verschillen worden bijgehouden als issues. De publieke API, 72 exports, ligt vast in 1.0.0 en versies volgen semver.
Begin met [Aan de slag](/guide/getting-started). Wat er daarna komt, staat in de [routekaart](/guide/roadmap).
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
