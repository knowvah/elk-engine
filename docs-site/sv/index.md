---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, i ren TypeScript
  tagline: En trogen TypeScript-portering av Eclipse Layout Kernel. Ingen Java, ingen WASM — layoutalgoritmerna är
    omimplementerade i vanlig TypeScript och verifierade mot Java-implementationen.
  actions:
    - theme: brand
      text: Översikt
      link: /sv/guide/overview
    - theme: alt
      text: Galleri
      link: /sv/showcase/
    - theme: alt
      text: Visa på GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Trogen ELK Java
    details: Java-koden vid en fastlåst ELK-commit är specifikationen. Varje gren porteras, och JUnit-testerna porteras
      tillsammans med koden de testar.
  - title: Verifierad mot ett orakel
    details: Utdata jämförs med ELK byggt från källkod. Strukturen stämmer exakt; koordinaterna stämmer inom 1e-6.
  - title: Webbläsarnativ, utan körtidsberoenden
    details: Ingen Java, ingen WASM, inga inbyggda Node-moduler i bibliotekskoden. Bundla och leverera.
  - title: Version 1.0
    details: Alla ingående ELK-layoutalgoritmer är portade och kontrollerade mot ELK byggt från källkod. Det publika
      API:et är fruset vid 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` finns på npm. Alla ELK-layoutalgoritmer som ingår är portade och kontrollerade mot ELK
byggt från källkod; [paritetsrapporten](/parity) har resultaten, och skillnader som fortfarande är öppna spåras som
issues. Det publika API:et, 72 exporter, är fruset vid 1.0.0 och versionerna följer semver. Börja med
[Kom igång](/guide/getting-started) och se [färdplanen](/guide/roadmap) för vad som kommer härnäst.
:::

## Välj din väg

| Jag vill…                                     | Börja här                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Förstå vad projektet är och inte är           | [Översikt](/sv/guide/overview)                                       |
| Se hur delarna passar ihop                    | [Arkitektur](/sv/guide/architecture)                                 |
| Veta vad ”stämmer överens med Java” betyder   | [Överensstämmelse](/conformance)                                     |
| Hitta var ett Java-paket hamnar i porteringen | [Porteringskarta](/guide/port-map) · [Inventarium](/guide/inventory) |
| Lära mig reglerna från Java till TypeScript   | [Översättningsregler](/guide/translation-rules)                      |
| Se vilket Java-runtime-beteende som täcks     | [Java-grunder](/sv/guide/java-foundations)                           |
| Se vad som är planerat                        | [Färdplan](/guide/roadmap)                                           |
| Bidra                                         | [Bidra](/sv/guide/contributing)                                      |
