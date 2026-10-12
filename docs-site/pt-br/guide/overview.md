---
title: Visão geral
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visão geral

`@knowvah/elk-engine` é um port fiel para TypeScript do [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), a biblioteca Java de layout de grafos. Não há Java nem
WASM: os algoritmos de layout são reimplementados em TypeScript simples e verificados contra a
implementação em Java.

::: warning Pré-alfa
Nenhum algoritmo de layout foi portado ainda. O repositório contém a toolchain, os documentos de arquitetura,
a estrutura de verificação e os shims do runtime Java. `src/index.ts` ainda não exporta nada público.
Veja o [roteiro](/guide/roadmap) para a ordem em que os algoritmos chegam.
:::

## O Java é a especificação

O código-fonte Java no commit fixado do ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` é a
especificação canônica. O port a segue de perto:

- Os algoritmos não são otimizados nem simplificados. Se o Java parece redundante, a redundância é mantida.
- Todo ramo é portado, e as fronteiras dos métodos são mantidas, a menos que o TypeScript force uma mudança.
- Os testes JUnit são portados junto com o código que testam.
- O comportamento do runtime Java de que o ELK depende (aritmética de inteiros de 32 bits, ordem de iteração de
  `HashMap`, sequências de `Random`) é reproduzido por shims. Veja [Fundamentos de Java](/pt-br/guide/java-foundations).

As [regras de tradução](/guide/translation-rules) listam como cada conceito de Java é mapeado para TypeScript.

## Verificação contra um oráculo

O oráculo é o ELK upstream compilado a partir do código-fonte, em um worktree git desanexado no commit fixado.
As saídas do port são comparadas com as saídas do oráculo:

- Ids, contagens de elementos, topologia de seções de aresta, contagens de pontos de dobra e valores não
  numéricos devem coincidir exatamente.
- Coordenadas e tamanhos numéricos devem coincidir dentro de uma tolerância absoluta de `1e-6`.

As saídas curadas do oráculo são versionadas como referências golden, então executar os testes não exige JVM. O
procedimento completo está na página de [conformidade](/pt-br/conformance).

## Contrato público

A API pública será o modelo de objetos ElkGraph mais as fábricas `ElkGraphUtil`. ELK JSON é um adaptador de
E/S, não o modelo central. A primeira publicação no npm congela essa superfície.

## Restrições de runtime

- `src/` é seguro para o navegador: sem built-ins do Node, sem `process.env`, apenas módulos ES.
- Não há dependências de runtime.

## Para onde ir em seguida

- [Arquitetura](/pt-br/guide/architecture): como o oráculo, os bundles e o motor de layout se encaixam.
- [Mapa do port](/guide/port-map) e [inventário](/guide/inventory): quais pacotes Java correspondem a quais
  módulos.
- [Contribuir](/pt-br/guide/contributing): gates e fluxo de trabalho.
