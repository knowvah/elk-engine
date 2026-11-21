---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details: Alle omfattede ELK-layoutalgoritmer er porteret og kontrolleret mod ELK bygget fra kildekode. Indtil 1.0
      kan API'en stadig ændre sig.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Alle de ELK-layoutalgoritmer, der er omfattet, er porteret og kontrolleret mod ELK bygget fra kildekode;
[paritetsrapporten](/parity) har resultaterne. Den offentlige eksportoverflade er godkendt, men endnu ikke i
`src/index.ts`, så pakkens indgang eksporterer endnu intet offentligt. Versionerne forbliver 0.x indtil 1.0, og
indtil da kan API'en stadig ændre sig. Se [køreplanen](/guide/roadmap) for, hvad der kommer næste gang.
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
