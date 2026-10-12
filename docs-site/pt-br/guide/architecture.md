---
title: Arquitetura
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visão geral da arquitetura do elk-engine

| Documento                                           | Conteúdo                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Todo bundle do ELK: finalidade, LOC, fontes geradas, escopo                         |
| [port-map.md](/guide/port-map)                      | Mapeamento dos pacotes Java para módulos de `src/`                                  |
| [component-map.md](#mapa-de-componentes)            | Dependências dos bundles no escopo; peças centrais do runtime                       |
| [../translation-rules.md](/guide/translation-rules) | Regras de Java para TypeScript                                                      |
| [../conformance.md](/pt-br/conformance)             | Critério e procedimento de comparação com o oráculo (chega mais tarde nesta missão) |

## O que é o elk-engine

`@knowvah/elk-engine` é um port fiel do Eclipse Layout Kernel (ELK) para TypeScript. O Java no commit fixado
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` é a especificação (AD-1, AD-2). É uma biblioteca: segura para o
navegador, sem dependências de runtime, sem Java nem WASM. Seu contrato público é o modelo de objetos ElkGraph
mais as fábricas `ElkGraphUtil`; ELK JSON é um adaptador de E/S (AD-14). Treze bundles, com cerca de 134.600
linhas escritas à mão no total, estão no escopo (veja o inventário). Esta missão entrega apenas a estrutura de
base: nenhum algoritmo de layout foi portado ainda.

## Relação com o ELK Java e o oráculo

![Relação entre o ELK Java, a compilação do oráculo, as referências golden e o elk-engine](/diagrams/overview-1.svg)

A série de patches está vazia nesta missão (AD-3). Os goldens são versionados, então a CI não precisa de JVM
(AD-5). Comparação: estrutura exata, coordenadas dentro de 1e-6 (AD-4).

## Fluxos principais

O layout no ELK, que o elk-engine reproduz (detalhes em [component-map.md](#mapa-de-componentes)):

![Fluxo de uma chamada de layout pelo motor de layout recursivo](/diagrams/overview-2.svg)

Adaptador JSON (`graph.json`, `ElkGraphJson`): antes do layout, o importador transforma o ELK JSON de entrada em
um ElkGraph; depois do layout, as coordenadas calculadas e as seções de aresta são transferidas de volta para o
JSON de saída. O harness do oráculo usa o adaptador Java nos mesmos dois passos, de modo que os dois lados
compartilham o contrato JSON.

## Stack tecnológica

| Aspecto             | Escolha                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Linguagem           | TypeScript 7.0.2 (`tsc` nativo), ES2022, NodeNext, `strict`        |
| Testes              | vitest 5.0.x com `@vitest/coverage-v8` (limites de 90%)            |
| Empacotamento       | esbuild 0.28.x                                                     |
| Executor de scripts | tsx                                                                |
| Runtime             | Node 22 ou mais recente; `src/` em si é seguro para o navegador    |
| Só para o oráculo   | Maven 3.9+ e JDK 21 (alternativa JDK 17) para o build Tycho do ELK |

## Restrições de fitness (AD-8)

A direção de importação dos bundles segue `test/architecture/bundle-deps.json`; cabeçalho SPDX em todo arquivo de
código; sem built-ins do Node nem `process.env` em `src/`; sem `let` mutável em nível de módulo fora da allowlist.

# Mapa de componentes

| Diagrama                   | Mostra                                                  |
| -------------------------- | ------------------------------------------------------- |
| 1. Dependências de bundles | Os 13 bundles no escopo e suas arestas `Require-Bundle` |
| 2. Runtime central         | Como um algoritmo de layout se conecta ao motor         |

Os nomes omitem o prefixo `org.eclipse.elk.`. Escopo: [inventário](/guide/inventory).

## 1. Dependências dos bundles no escopo

Fonte da verdade: `test/architecture/bundle-deps.json`, derivado do `META-INF/MANIFEST.MF` de cada bundle por
`tools/bundle-deps.ts` e imposto pelo teste de fitness (AD-8).
O diagrama tem **32 arestas**, igual às 32 entradas `requires` no JSON (graph.json x 2,
core x 1, alg.common x 2, nove algoritmos x 3). Requisitos de terceiros (Guava, EMF, Gson, bibliotecas Xtend)
e bundles fora do escopo foram omitidos. Uma seta `A --> B` significa que A requer B, de modo que o
diretório de B pode ser importado pelo diretório de A. `src/java` pode ser importado em qualquer lugar e não é
mostrado.

![Dependências entre os 13 bundles do ELK no escopo](/diagrams/component-map-1.svg)

Nenhum algoritmo requer outro algoritmo: a única dependência compartilhada entre algoritmos é
`alg.common`. Uma nova importação entre diretórios de algoritmos faz o teste de fitness falhar, a menos que o
manifesto Java tenha a mesma aresta.

## 2. Peças centrais do runtime

Os caminhos das classes ficam em `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
salvo indicação em contrário; verificado no commit fixado.

| Classe                            | Caminho                             | Papel                                                                      |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                     |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Percorre a hierarquia, executa o provider em cada nível                    |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Classe base de todo algoritmo; implementa `IGraphLayoutEngine`             |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Registro singleton de dados de algoritmos, opções e categorias             |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; um gerado por bundle de algoritmo (a partir de `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Id do algoritmo mais o `getInstancePool()` de providers                    |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Chaves de opção tipadas e o holder de mapa por trás de `getProperty`       |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Modelo de grafo; os elementos são `EMapPropertyHolder`                     |

![Relações entre classes do runtime central do ELK](/diagrams/component-map-2.svg)

Como um algoritmo se conecta:

1. O bundle do algoritmo fornece uma subclasse de `AbstractLayoutProvider` (por exemplo,
   `LayeredLayoutProvider` de `alg.layered`) e um arquivo `.melk` que declara seu id, opções e
   recursos suportados.
2. O compilador `.melk` gera um `ILayoutMetaDataProvider` e uma classe de opções. O `apply(Registry)` dele
   registra um `LayoutAlgorithmData` cujo pool de instâncias cria o provider.
3. `LayoutMetaDataService` coleta os providers. `LayoutAlgorithmResolver` define o id do algoritmo
   em cada nó a partir da opção `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` busca um provider no
   `LayoutAlgorithmData.getInstancePool()` do nó e chama `layout(layoutNode, progressMonitor)`, depois
   o libera (ou chama `dispose()` após uma falha).

No elk-engine, a etapa `.melk` é substituída por um gerador (AD-12, missão futura) e o ElkGraph
vira classes TS simples (AD-11). Mapeamento para arquivos TS: [mapa do port](/guide/port-map); regras:
[regras de tradução](/guide/translation-rules).
