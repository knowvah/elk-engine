---
title: Arquitetura
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visão geral da arquitetura do elk-engine

| Documento                                                                                                              | Conteúdo                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Todo bundle do ELK: finalidade, LOC, fontes geradas, escopo                                                                                                        |
| [port-map.md](/guide/port-map)                                                                                         | Mapeamento dos pacotes Java para módulos de `src/`                                                                                                                 |
| [component-map.md](#mapa-de-componentes)                                                                               | Dependências dos bundles no escopo; peças centrais do runtime                                                                                                      |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regras de Java para TypeScript                                                                                                                                     |
| [../conformance.md](/conformance)                                                                                      | Critério e procedimento de comparação com o oráculo (chega mais tarde nesta missão)                                                                                |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Port do ELK Text (`.elkt`), o subconjunto do Xtext, runbook e adiamentos                                                                                           |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Port do ELK Textual JSON (`.elkj`), ligação preguiçosa, runbook e adiamentos                                                                                       |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Port do gerador de grafos aleatórios grandom (`.elkr`), evidências e runbook                                                                                       |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Motor de layout e os providers fixed, box e random (missão 5a)                                                                                                     |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | O gerador de `.melk`, tipos pendentes, constantes preguiçosas, regeneração                                                                                         |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | O portão de complexidade que mede cada função (`npm run complexity`)                                                                                               |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Framework layered (missão 7a): modelo LGraph, transformação, classes em estágios, runbook                                                                          |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Posicionamento de nós do layered (missão 7d): p4nodes, Brandes-Köpf, cinco processadores, linhas de geometria, runbook                                             |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Roteamento de arestas do layered (missão 7e): p5edges ortogonal, polilinha, splines, seis processadores, linhas de roteamento, runbook                             |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline do layered (missão 7f): `ElkLayered`, `GraphConfigurator`, componentes, quatro processadores, linhas de layouts completos, subconjunto do runner, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Rótulos do layered (missão 7f2): processadores de rótulos e comentários, desempacotamento, saída de depuração, visitor, linhas de rótulos, sweep, runbook          |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Laços próprios, wrapping e compactação do layered (missão 7g): pacote loops, pontos de quebra, compactação 1D, `ComponentsCompactor`, linhas, sweep, runbook       |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Grafos compostos do layered (missão 7h): pacote `compound`, driver hierárquico, paradas na árvore inteira, goldens, sweep, gêmeos de ordem de hash, runbook        |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep do TS contra o oráculo (linha 9): runner fragmentado, contrato de resumo, anotações, relatório, runbook                                                      |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Medição plugável do texto de rótulos (linha 10): patch 0003, o gêmeo em TS, modo fixo, evidências, runbook                                                         |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Mover o pin do ELK (linha 13): triagem da diferença líquida, série de patches, recompilação, nova gravação, sweeps, triagem de diferenças de refs, modo de ensaio  |

## O que é o elk-engine

`@knowvah/elk-engine` é um port fiel do Eclipse Layout Kernel (ELK) para TypeScript. O Java no commit fixado
`8bca22f4afa3371562d2f702d59929818f7f7b71` é a especificação (AD-1, AD-2). É uma biblioteca: segura para o
navegador, sem dependências de runtime, sem Java nem WASM. Seu contrato público é o modelo de objetos ElkGraph
mais as fábricas `ElkGraphUtil`; ELK JSON é um adaptador de E/S (AD-14). Treze bundles, com cerca de 134.600
linhas escritas à mão no total, estão no escopo (veja o inventário). Estado atual:
o motor de layout (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) e os três
providers centrais `fixed`, `box` e `random` estão portados e iguais ao oráculo nos goldens curados
(missão 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). O restante do `core` também está portado (missão 5b: pipeline de processadores, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines,
anexação de comentários; veja [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). O bundle compartilhado `alg.common` está totalmente portado (missão 6a: geometria, simplex de rede, compactação 1D, sobreposições, spore, poliminó; missão 6b: `nodespacing` e `NodeMicroLayout`, provados por um replay do oráculo de 326 linhas; veja [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
O framework layered está portado (missão 7a: o pacote de opções, o modelo LGraph, a transformação ElkGraph ↔ LGraph e a casca do provider, provados por dois arquivos de vetores do oráculo de 272 e 330 linhas; as fases de layout vêm em 7b–7h; veja [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Suas duas primeiras fases estão portadas (missão 7b: os onze quebradores de ciclos, os nove layerers e os dez processadores ao redor deles, provados por 651 linhas de fase do oráculo e um sweep de 32.652 casos; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Sua terceira fase está portada (missão 7c: minimização de cruzamentos com seus contadores, o greedy switch, os comparadores de ordem do modelo e os oito processadores entre P2 e P3, provados por 808 linhas de ordem do oráculo e um sweep de 6.728 casos; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Sua quarta fase está portada (missão 7d: os quatro posicionadores de nós com Brandes-Köpf e os cinco processadores de que uma parada em P4 precisa, provados por 610 linhas de posicionamento do oráculo com geometria e um sweep de 8.410 casos; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Sua quinta fase está portada (missão 7e: os roteadores ortogonal, de polilinha e de splines com os seis processadores de que um resultado roteado precisa, provados por 950 linhas de roteamento do oráculo com geometria de arestas e um sweep de 6.728 casos; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). O pipeline layered roda (missão 7f: o driver, o pacote de componentes conexos, o transformador de direção, o roteador hierárquico de portas e três processadores, provados por 1.311 linhas do oráculo de layouts completos e paradas, um re-replay de 2.351 linhas das linhas anteriores pelo driver real, 28 suítes JUnit portadas e um sweep de 6.646 casos; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouts com rótulos e comentários, o desempacotamento de camadas e um monitor de log também rodam (missão 7f2: a família de rótulos, os processadores de comentários, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` e os utilitários de depuração, provados por 1.305 linhas do oráculo de paradas e layouts completos, as 11 suítes JUnit de base e um sweep de 1.105 casos cujos 935 casos ok coincidem exatamente; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Laços próprios, wrapping de grafo e compactação também rodam (missão 7g: o pacote loops, os quatro processadores de laços próprios, os wrappers de pontos de quebra e de aresta única, `HorizontalGraphCompactor`, o pacote layered `compaction` e `ComponentsCompactor`, provados por 1.642 linhas do oráculo (`full` 731, `models` 307, `scenarios` 525, `sites` 79), as 10 suítes JUnit de base, um sweep de 3.073 casos cujos 2.997 casos ok coincidem exatamente e 76 throws coincidem nos dois lados, e a fiação de nove braços que deixa 58 braços portados; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Grafos compostos também rodam (missão 7h: o pacote `compound`, `HierarchicalNodeResizingProcessor` e o último braço, provados por 540 linhas do oráculo (`full` 355, `models` 73 com paradas na árvore inteira, `scenarios` 88, `sites` 24), 24 goldens do layered, as nove suítes de issues e três métodos de graph.json, um sweep de 1.169 casos cujos 1.164 casos ok coincidem exatamente e 5 throws coincidem nos dois lados; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). O algoritmo layered agora roda todos os modos de tratamento de hierarquia: 59 braços de enum estão portados, nenhum está pendente, e a lista em estágios está vazia. Os três casos `elk.stress` da issue #58 aguardavam a missão 8b e rodam desde que sua decisão foi aplicada (missão layered-stress-cases). Nenhum outro algoritmo de layout roda ainda (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Desde a missão 8a, mrtree, radial e vertiflex também rodam (provados por 1.181 linhas do oráculo em quatro refs de layouts completos e paradas, uma ref de vetores unitários de 2.656 linhas, 40 goldens `trees`, `MrTreeGraphSizeTest` e `CenterOnRootTest` em 6/6 e 2/2, e um sweep de 906 casos por algoritmo em que todo caso ou coincide ou é diagnosticado; duas linhas do radial cujo resultado depende da ordem de um bin de hash treeificado estão classificadas, não casadas; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Desde a missão 8b, force, stress e disco também rodam (provados por 21.420 linhas do oráculo em três refs de layouts completos e paradas, 45 goldens `force-disco`, `ForceImportTest` e `TwoBitGridTest` em 3/3 cada, e um sweep por algoritmo em que todo caso ou coincide ou é diagnosticado; o `Math.log` de Eades é um port fdlibm bit a bit exato; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Desde a missão 8c, rectpacking, spore (`sporeOverlap`, `sporeCompaction`) e topdownpacking também rodam (provados por 2.593 linhas do oráculo em três refs, 44 goldens `packing`, as oito suítes JUnit portadas em 30 execuções, e um sweep por algoritmo em que todo caso determinístico ou coincide ou é diagnosticado; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Todo algoritmo no escopo é varrido contra o oráculo, e o resultado por algoritmo é publicado no relatório de paridade ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relação com o ELK Java e o oráculo

![Relação entre o ELK Java, a compilação do oráculo, as referências golden e o elk-engine](/diagrams/overview-1.svg)

A série de patches está vazia nesta missão (AD-3). Os goldens são versionados, então a CI não precisa de JVM
(AD-5). Comparação: estrutura exata, coordenadas dentro de 1e-6 (AD-4).

## Fluxos principais

O layout no ELK, que o elk-engine reproduz hoje para `fixed`, `box` e `random` (detalhes em
[component-map.md](#mapa-de-componentes) e [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Fluxo de uma chamada de layout pelo motor de layout recursivo](/diagrams/overview-2.svg)

Adaptador JSON (`graph.json`, `ElkGraphJson`): antes do layout, o importador transforma o ELK JSON de entrada em
um ElkGraph; depois do layout, as coordenadas calculadas e as seções de aresta são transferidas de volta para o
JSON de saída. O harness do oráculo usa o adaptador Java nos mesmos dois passos, de modo que os dois lados
compartilham o contrato JSON.

Adaptador de texto (`graph.text`, `ElkGraphText`): o texto `.elkt` é carregado em um ElkGraph por um parser, um
linker e um validador escritos à mão, construídos sobre um pequeno subconjunto do Xtext (`src/xtext`), e um ElkGraph
é serializado de volta para `.elkt`. O ponto de entrada é interno; veja [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptador de JSON textual (`graph.json.text`, `ElkGraphJsonText`): o texto `.elkj` é carregado pelo mesmo subconjunto
do Xtext com um parser escrito à mão, e liga de forma preguiçosa como o `LazyLinker` do Xtext: os extremos das arestas
são proxies EMF (`src/emf`) que se resolvem quando lidos. Um ElkGraph é serializado de volta para `.elkj` por um writer
específico da gramática. O ponto de entrada é interno; veja [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Gerador de grafos aleatórios (`core.debug.grandom`, `GRandomText`): o texto `.elkr` é analisado por um lexer e um
parser escritos à mão sobre o mesmo subconjunto do Xtext (`src/xtext`), e `RandomGraphGenerator` transforma uma
configuração em ElkGraphs com a sequência exata do `Random` da JVM. A saída com seed é idêntica byte a byte ao oráculo
e reproduz os nove arquivos `test/corpus/generated/*.json`; os caminhos sem seed (texto de rótulo de aresta, shuffle
entre hierarquias, seed ausente) são verificados apenas por invariantes. O ponto de entrada é interno; veja [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Docs e toolchain de release

Adicionado pela linha 12 do roadmap; decisões DP1 a DP9 em
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). O `1.0.0` foi publicado em 2026-11-23.

| Peça                     | O que é                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superfície de exportação | Aceita (2026-11-23), listada em [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) e mantida igual a `src/index.ts` por `src/index.test.ts`; congelada no `1.0.0`, a primeira publicação no npm (AD-14) |
| Referência da API        | `npm run docs:api`: typedoc no pacote privado `tools/typedoc/` com o TypeScript 6 próprio dele (o typedoc não tem versão para TypeScript 7, AD-6), para o `/reference/` gerado                                                                        |
| Exemplos                 | `test/docs/examples/*.ts`, exibidos como trechos na página getting-started do site e comparados com refs do oráculo (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                             |
| Verificação de links     | `npm run docs:linkcheck`: linkinator sobre o site compilado, links internos e fragmentos, na CI; links externos semanalmente (`links.yml`)                                                                                                            |
| Ensaio do pacote         | `npm run pack:smoke`: empacotar, conferir a lista de arquivos, instalar offline em um projeto limpo, importar, gerar o layout de um exemplo ali e compará-lo com a sua ref do oráculo                                                                 |
| Release                  | configuração do semantic-release e `release.yml`, executados a cada push para `main`; runbook em [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                     |

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

Portado pela missão 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (dividido com
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` e as subclasses de `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` e `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
e os tipos de propriedade vieram antes (missões 2 e 3). A missão 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) completou o bundle: `AlgorithmAssembler` e
`LayoutProcessorConfiguration` (o pipeline que todo bundle de algoritmo usa), `LayoutConfigurator`, `ElkSpacings`, as
seções de `ElkMath`, `ElkGraphAdapters`, `util/selection/*` e `comments/*`. Seus shims do JDK são `src/java/awt/geom`
(`Rectangle2D`) e `src/java/util/regex` (`Pattern`, `WordBoundary`), ao lado de `JavaCharacter` em `src/java/lang`;
são provados por `awt.json`, `regex.json`, `character.json` e `regex-boundary.json`. As missões 6a e 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portaram todo o `alg.common`; a 6b adicionou `nodespacing` e `NodeMicroLayout`, provados por um replay do oráculo de `NodeMicroLayout` com 326 linhas.

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

No elk-engine, a etapa `.melk` é substituída por um gerador (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) e o ElkGraph
vira classes TS simples (AD-11). Mapeamento para arquivos TS: [mapa do port](/guide/port-map); regras:
[regras de tradução](/guide/translation-rules).
