---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alfa
    details: Værktøjskæden, arkitekturen, Java-runtime-shims og verifikationsstilladset findes. Endnu er ingen
      layoutalgoritme porteret.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alfa
Endnu er ingen layoutalgoritme porteret, og `src/index.ts` eksporterer intet offentligt. Den første npm-udgivelse
fryser den offentlige API. Se [køreplanen](/guide/roadmap) for, hvad der kommer næste gang.
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
