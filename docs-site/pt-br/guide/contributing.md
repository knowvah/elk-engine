---
title: Contribuir
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contribuir

Leia primeiro a [Visão geral](/pt-br/guide/overview) e as [Regras de tradução](/guide/translation-rules). O Java
no commit fixado é a especificação; na dúvida, leia o Java.

## Gates

Execute estes antes de cada commit. Todos devem passar.

| Comando                | Verifica                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run format:check` | Formatação do Prettier                                              |
| `npm run typecheck`    | Verificação de tipos do TypeScript (`tsc --noEmit` nativo)          |
| `npm test`             | A suíte vitest, incluindo a suíte golden                            |
| `npm run coverage`     | A suíte com 90% de cobertura de linhas, ramos, funções e instruções |

Requer Node 22 ou mais recente. Instale as dependências com `npm ci`.

## Os testes são imutáveis

Os valores esperados vêm do oráculo, dos vetores da JVM ou do código-fonte Java antes de a implementação ser
escrita (AD-13). Depois de escrita, uma asserção fica congelada: um teste que falha significa que a implementação
está errada.

Se um teste só pode passar alterando sua asserção, um vetor ou um golden, pare e registre o caso no diário de
decisões da missão. Não afrouxe uma tolerância, não apague um caso e não regenere uma referência só para ficar
verde. As referências golden são regeneradas por script, nunca à mão.

## Fluxo de trabalho

1. Crie um branch de feature, por exemplo `feature/<short-description>`.
2. Escreva as mensagens de commit como [Conventional Commits](https://www.conventionalcommits.org), por exemplo
   `feat(java): add JavaHashMap`. Os assuntos ficam em minúsculas e têm no máximo 72 caracteres.
3. Abra um pull request contra `main`. A CI valida o título do pull request como um Conventional Commit.
4. Os commits devem ser assinados; o conjunto de regras do repositório exige isso.
5. Os pull requests são mesclados com um merge commit.

Todo arquivo de código carrega um cabeçalho SPDX, `// SPDX-License-Identifier: EPL-2.0`. Um teste de fitness
o impõe. As dependências devem ser compatíveis com a EPL-2.0.

## Comandos de documentação

| Comando                | Finalidade                                                       |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run docs:dev`     | Inicia o site de documentação com recarga ao vivo                |
| `npm run docs:build`   | Compila o site; um link interno quebrado faz a compilação falhar |
| `npm run docs:preview` | Serve localmente o site compilado                                |

A maioria das páginas de referência inclui arquivos de `docs/`. Edite o arquivo em `docs/`, não a página em
`docs-site/`. Os diagramas PlantUML nos arquivos incluídos são renderizados em SVG e versionados em
`docs-site/public/diagrams/`.

## Diretórios externos

Scripts e testes localizam checkouts vizinhos por meio de variáveis de ambiente. Os padrões são relativos à raiz do
repositório. Apenas `tools/` e `test/` leem essas variáveis; o código em `src/` nunca as lê.

| Variável         | Padrão                         | Conteúdo                                           |
| ---------------- | ------------------------------ | -------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Código-fonte Java do Eclipse ELK no commit fixado  |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Worktree desanexado e oráculo compilado            |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | O corpus elk-models, fixado no manifesto do corpus |

A compilação do oráculo exige Maven 3.9 ou mais recente e JDK 21 (JDK 17 como alternativa). Veja a
[Conformidade](/pt-br/conformance) para o procedimento do oráculo.
