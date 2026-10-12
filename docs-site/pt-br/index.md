---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, em TypeScript puro
  tagline: Um port fiel do Eclipse Layout Kernel para TypeScript. Sem Java, sem WASM — os algoritmos de layout são
    reimplementados em TypeScript simples e verificados contra a implementação em Java.
  actions:
    - theme: brand
      text: Visão geral
      link: /pt-br/guide/overview
    - theme: alt
      text: Galeria
      link: /pt-br/showcase/
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Fiel ao ELK Java
    details:
      O Java em um commit fixado do ELK é a especificação. Todo ramo é portado, e os testes JUnit são portados junto
      com o código que testam.
  - title: Verificado contra um oráculo
    details: As saídas são comparadas com o ELK compilado a partir do código-fonte. A estrutura coincide exatamente; as
      coordenadas coincidem dentro de 1e-6.
  - title: Nativo do navegador, sem dependências de runtime
    details: Sem Java, sem WASM, sem built-ins do Node no código da biblioteca. Empacote e publique.
  - title: Pré-alfa
    details: A toolchain, a arquitetura, os shims do runtime Java e a estrutura de verificação existem. Nenhum algoritmo
      de layout foi portado ainda.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pré-alfa
Nenhum algoritmo de layout foi portado ainda, e `src/index.ts` não exporta nada público. A primeira publicação no npm
vai congelar a API pública. Veja o [roteiro](/guide/roadmap) para saber o que vem a seguir.
:::

## Escolha o seu caminho

| Eu quero…                                        | Comece aqui                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Entender o que o projeto é e o que não é         | [Visão geral](/pt-br/guide/overview)                             |
| Ver como as peças se encaixam                    | [Arquitetura](/pt-br/guide/architecture)                         |
| Saber o que significa "coincide com o Java"      | [Conformidade](/pt-br/conformance)                               |
| Descobrir onde um pacote Java cai no port        | [Mapa do port](/guide/port-map) · [Inventário](/guide/inventory) |
| Aprender as regras de Java para TypeScript       | [Regras de tradução](/guide/translation-rules)                   |
| Ver qual comportamento do runtime Java é coberto | [Fundamentos de Java](/pt-br/guide/java-foundations)             |
| Ver o que está planejado                         | [Roteiro](/guide/roadmap)                                        |
| Contribuir                                       | [Contribuir](/pt-br/guide/contributing)                          |
