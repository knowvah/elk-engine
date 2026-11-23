---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, i ren TypeScript
  tagline: En tro TypeScript-portering af Eclipse Layout Kernel. Intet Java, ingen WASM — layoutalgoritmerne er
    genimplementeret i almindelig TypeScript og verificeret mod Java-implementeringen.
  actions:
    - theme: brand
      text: Overblik
      link: /da/guide/overview
    - theme: alt
      text: Galleri
      link: /da/showcase/
    - theme: alt
      text: Se på GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Tro mod ELK Java
    details:
      Java-koden ved en fastlåst ELK-commit er specifikationen. Hver gren bliver porteret, og JUnit-testene bliver
      porteret sammen med den kode, de tester.
  - title: Verificeret mod et orakel
    details: Uddata sammenlignes med ELK bygget fra kildekode. Strukturen stemmer præcist overens; koordinaterne
      stemmer overens inden for 1e-6.
  - title: Browser-nativ, ingen runtime-afhængigheder
    details: Intet Java, ingen WASM, ingen Node-indbyggede moduler i bibliotekskoden. Bundt og udgiv.
  - title: Version 1.0
    details: Alle omfattede ELK-layoutalgoritmer er porteret og kontrolleret mod ELK bygget fra kildekode. Den
      offentlige API er frosset ved 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` er på npm. Alle de ELK-layoutalgoritmer, der er omfattet, er porteret og kontrolleret mod
ELK bygget fra kildekode; [paritetsrapporten](/parity) har resultaterne, og forskelle, der stadig er åbne, spores som
issues. Den offentlige API, 72 eksporter, er frosset ved 1.0.0, og versionerne følger semver. Start med
[Kom i gang](/guide/getting-started), og se [køreplanen](/guide/roadmap) for, hvad der kommer næste gang.
:::

## Vælg din vej

| Jeg vil…                                             | Start her                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Forstå, hvad projektet er, og hvad det ikke er       | [Overblik](/da/guide/overview)                                   |
| Se, hvordan delene hænger sammen                     | [Arkitektur](/da/guide/architecture)                             |
| Vide, hvad „stemmer overens med Java“ betyder        | [Overensstemmelse](/da/conformance)                              |
| Finde ud af, hvor en Java-pakke havner i porteringen | [Porteringskort](/guide/port-map) · [Inventar](/guide/inventory) |
| Lære reglerne fra Java til TypeScript                | [Oversættelsesregler](/guide/translation-rules)                  |
| Se, hvilken Java-runtime-adfærd der er dækket        | [Java-grundlag](/da/guide/java-foundations)                      |
| Se, hvad der er planlagt                             | [Køreplan](/guide/roadmap)                                       |
| Bidrage                                              | [Bidrag](/da/guide/contributing)                                 |
