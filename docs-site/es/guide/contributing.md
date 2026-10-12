---
title: Contribuir
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contribuir

Lee primero la [Visión general](/es/guide/overview) y las [Reglas de traducción](/guide/translation-rules). El Java
en el commit fijado es la especificación; ante la duda, lee el Java.

## Gates

Ejecútalos antes de cada commit. Todos deben pasar.

| Comando                | Comprueba                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `npm run format:check` | Formato de Prettier                                           |
| `npm run typecheck`    | Comprobación de tipos de TypeScript (`tsc --noEmit` nativo)   |
| `npm test`             | La suite de vitest, incluida la suite golden                  |
| `npm run coverage`     | La suite con un 90 % de líneas, ramas, funciones y sentencias |

Requiere Node 22 o posterior. Instala las dependencias con `npm ci`.

## Las pruebas son inmutables

Los valores esperados provienen del oráculo, de los vectores de la JVM o del código fuente de Java antes de escribir
la implementación (AD-13). Una vez escrita, una aserción queda congelada: una prueba que falla significa que la
implementación es incorrecta.

Si una prueba solo puede pasar cambiando su aserción, un vector o un golden, detente y registra el caso en el diario
de decisiones de la misión. No relajes una tolerancia, no borres un caso ni regeneres una referencia para ponerlo en
verde. Las referencias golden se regeneran con un script, nunca a mano.

## Flujo de trabajo

1. Crea una rama de feature, por ejemplo `feature/<short-description>`.
2. Escribe los mensajes de commit como [Conventional Commits](https://www.conventionalcommits.org), por ejemplo
   `feat(java): add JavaHashMap`. Los asuntos van en minúsculas y tienen como máximo 72 caracteres.
3. Abre un pull request contra `main`. La CI comprueba el título del pull request como un Conventional Commit.
4. Los commits deben estar firmados; el conjunto de reglas del repositorio lo exige.
5. Los pull requests se fusionan con un commit de merge.

Cada archivo de código lleva una cabecera SPDX, `// SPDX-License-Identifier: EPL-2.0`. Una prueba de fitness la
hace cumplir. Las dependencias deben ser compatibles con EPL-2.0.

## Comandos de documentación

| Comando                | Propósito                                                           |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run docs:dev`     | Inicia el sitio de documentación con recarga en vivo                |
| `npm run docs:build`   | Compila el sitio; un enlace interno roto hace fallar la compilación |
| `npm run docs:preview` | Sirve localmente el sitio compilado                                 |

La mayoría de las páginas de referencia incluyen archivos de `docs/`. Edita el archivo en `docs/`, no la página bajo
`docs-site/`. Los diagramas PlantUML de los archivos incluidos se renderizan a SVG y se versionan en
`docs-site/public/diagrams/`.

## Directorios externos

Los scripts y las pruebas localizan las copias de trabajo hermanas mediante variables de entorno. Los valores por
defecto son relativos a la raíz del repositorio. Solo `tools/` y `test/` leen estas variables; el código de `src/`
nunca lo hace.

| Variable         | Por defecto                    | Contenido                                                |
| ---------------- | ------------------------------ | -------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Código fuente Java de Eclipse ELK en el commit fijado    |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Worktree desacoplado y oráculo compilado                 |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | El corpus elk-models, fijado en el manifiesto del corpus |

La compilación del oráculo requiere Maven 3.9 o posterior y JDK 21 (JDK 17 como alternativa). Consulta
[Conformidad](/es/conformance) para el procedimiento del oráculo.
