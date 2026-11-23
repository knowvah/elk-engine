---
title: Visão geral
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visão geral

`@knowvah/elk-engine` é um port fiel para TypeScript do [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), a biblioteca Java de layout de grafos. Não há Java nem
WASM: os algoritmos de layout são reimplementados em TypeScript simples e verificados contra a
implementação em Java.

::: tip Versão 1.0
`@knowvah/elk-engine@1.0.0` está no npm. Todos os algoritmos de layout do ELK previstos foram portados e verificados
contra o ELK compilado a partir do código-fonte; o [relatório de paridade](/parity) traz os resultados, e as
diferenças ainda em aberto são acompanhadas como issues. A API pública, com 72 exports, está congelada na 1.0.0 e as
versões seguem semver. Comece pelos [Primeiros passos](/guide/getting-started). Veja o [roteiro](/guide/roadmap) para
saber o que vem a seguir.
:::

## O Java é a especificação

O código-fonte Java no commit fixado do ELK `8bca22f4afa3371562d2f702d59929818f7f7b71` é a
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

A API pública é a superfície de exportação aceita em
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exports: o modelo de objetos ElkGraph e as fábricas
`ElkGraphUtil`, o motor de layout, o provedor de metadados e a classe de opções de cada algoritmo, os tipos de valor
das opções centrais, o adaptador ELK JSON e a função assíncrona `layout`. ELK JSON é um adaptador de E/S, não o modelo
central. [Primeiros passos](/guide/getting-started) mostra a superfície em uso. A superfície está congelada na 1.0.0 e
as versões seguem semver: remover um export é uma versão major.

## Restrições de runtime

- `src/` é seguro para o navegador: sem built-ins do Node, sem `process.env`, apenas módulos ES.
- Não há dependências de runtime.

## Para onde ir em seguida

- [Arquitetura](/pt-br/guide/architecture): como o oráculo, os bundles e o motor de layout se encaixam.
- [Mapa do port](/guide/port-map) e [inventário](/guide/inventory): quais pacotes Java correspondem a quais
  módulos.
- [Contribuir](/pt-br/guide/contributing): gates e fluxo de trabalho.
