---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pré-1.0
    details: Todos os algoritmos de layout do ELK previstos foram portados e verificados contra o ELK compilado a partir
      do código-fonte. Até a 1.0, a API ainda pode mudar.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pré-1.0
Todos os algoritmos de layout do ELK previstos foram portados e verificados contra o ELK compilado a partir do
código-fonte; o [relatório de paridade](/parity) traz os resultados. A superfície de exportação pública foi aceita,
mas ainda não está em `src/index.ts`, então a entrada do pacote ainda não exporta nada público. As versões permanecem
0.x até a 1.0, e até lá a API ainda pode mudar. Veja o [roteiro](/guide/roadmap) para saber o que vem a seguir.
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
