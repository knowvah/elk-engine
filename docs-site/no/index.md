---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alpha
    details: Verktøykjeden, arkitekturen, Java-runtime-shimene og verifiseringsoppsettet finnes. Ingen
      layoutalgoritme er portert ennå.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Ingen layoutalgoritme er portert ennå, og `src/index.ts` eksporterer ingenting offentlig. Den første npm-publiseringen
fryser det offentlige API-et. Se [veikartet](/guide/roadmap) for hva som kommer videre.
:::

## Velg din vei

| Jeg vil…                                         | Start her                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Forstå hva prosjektet er og ikke er              | [Oversikt](/no/guide/overview)                                   |
| Se hvordan delene henger sammen                  | [Arkitektur](/no/guide/architecture)                             |
| Vite hva «samsvarer med Java» betyr              | [Samsvar](/no/conformance)                                       |
| Finne ut hvor en Java-pakke havner i porteringen | [Porteringskart](/guide/port-map) · [Inventar](/guide/inventory) |
| Lære reglene fra Java til TypeScript             | [Oversettelsesregler](/guide/translation-rules)                  |
| Se hvilken Java-runtime-atferd som er dekket     | [Java-grunnlag](/no/guide/java-foundations)                      |
| Se hva som er planlagt                           | [Veikart](/guide/roadmap)                                        |
| Bidra                                            | [Bidra](/no/guide/contributing)                                  |
