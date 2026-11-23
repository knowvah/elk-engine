---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, i ren TypeScript
  tagline: En tro TypeScript-portering av Eclipse Layout Kernel. Ingen Java, ingen WASM — layoutalgoritmene er
    implementert på nytt i vanlig TypeScript og verifisert mot Java-implementeringen.
  actions:
    - theme: brand
      text: Oversikt
      link: /no/guide/overview
    - theme: alt
      text: Galleri
      link: /no/showcase/
    - theme: alt
      text: Se på GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Tro mot ELK Java
    details: Java-koden ved en festet ELK-commit er spesifikasjonen. Hver gren er portert, og JUnit-testene er portert
      sammen med koden de tester.
  - title: Verifisert mot et orakel
    details: Utdataene sammenlignes med ELK bygd fra kildekode. Strukturen samsvarer nøyaktig; koordinatene samsvarer
      innenfor 1e-6.
  - title: Nettleser-nativ, ingen kjøretidsavhengigheter
    details: Ingen Java, ingen WASM, ingen Node-innebygde moduler i bibliotekskoden. Bundle og send.
  - title: Versjon 1.0
    details: Alle ELK-layoutalgoritmer innenfor prosjektets omfang er portert og sjekket mot ELK bygd fra kildekode.
      Det offentlige API-et er fryst i 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versjon 1.0
`@knowvah/elk-engine@1.0.0` ligger på npm. Alle ELK-layoutalgoritmer innenfor prosjektets omfang er portert og
sjekket mot ELK bygd fra kildekode; [paritetsrapporten](/parity) har resultatene, og forskjeller som fortsatt er
åpne, følges opp som issues. Det offentlige API-et, 72 eksporter, er fryst i 1.0.0, og versjonene følger semver.
Begynn med [Kom i gang](/guide/getting-started). Se [veikartet](/guide/roadmap) for hva som kommer videre.
:::

## Velg din vei

| Jeg vil…                                         | Start her                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Forstå hva prosjektet er og ikke er              | [Oversikt](/no/guide/overview)                                   |
| Se hvordan delene henger sammen                  | [Arkitektur](/no/guide/architecture)                             |
| Vite hva «samsvarer med Java» betyr              | [Samsvar](/conformance)                                          |
| Finne ut hvor en Java-pakke havner i porteringen | [Porteringskart](/guide/port-map) · [Inventar](/guide/inventory) |
| Lære reglene fra Java til TypeScript             | [Oversettelsesregler](/guide/translation-rules)                  |
| Se hvilken Java-runtime-atferd som er dekket     | [Java-grunnlag](/no/guide/java-foundations)                      |
| Se hva som er planlagt                           | [Veikart](/guide/roadmap)                                        |
| Bidra                                            | [Bidra](/no/guide/contributing)                                  |
