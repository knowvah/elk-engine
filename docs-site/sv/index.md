---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alfa
    details: Verktygskedjan, arkitekturen, Java-runtime-shimmarna och verifieringsställningen finns. Ännu är ingen
      layoutalgoritm portad.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alfa
Ännu är ingen layoutalgoritm portad, och `src/index.ts` exporterar inget publikt. Den första npm-publiceringen
fryser det publika API:et. Se [färdplanen](/guide/roadmap) för vad som kommer härnäst.
:::

## Välj din väg

| Jag vill…                                     | Börja här                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Förstå vad projektet är och inte är           | [Översikt](/sv/guide/overview)                                       |
| Se hur delarna passar ihop                    | [Arkitektur](/sv/guide/architecture)                                 |
| Veta vad ”stämmer överens med Java” betyder   | [Överensstämmelse](/sv/conformance)                                  |
| Hitta var ett Java-paket hamnar i porteringen | [Porteringskarta](/guide/port-map) · [Inventarium](/guide/inventory) |
| Lära mig reglerna från Java till TypeScript   | [Översättningsregler](/guide/translation-rules)                      |
| Se vilket Java-runtime-beteende som täcks     | [Java-grunder](/sv/guide/java-foundations)                           |
| Se vad som är planerat                        | [Färdplan](/guide/roadmap)                                           |
| Bidra                                         | [Bidra](/sv/guide/contributing)                                      |
