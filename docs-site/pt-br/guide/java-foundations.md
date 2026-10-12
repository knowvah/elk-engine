---
title: Fundamentos de Java
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fundamentos de Java

Os resultados do ELK dependem do comportamento do runtime Java: overflow de inteiros de 32 bits,
arredondamento de `float`, ordem de iteração de `HashMap`, sequências de `Random` e conversão de
número para texto. A missão java-foundations (concluída em 2026-10-11) entregou os shims que
reproduzem esse comportamento e os vetores gravados na JVM que os comprovam.

Os shims são implementados somente a partir da especificação no Javadoc. Nenhum código-fonte do
OpenJDK é lido ou copiado (AD-9). Cada shim é verificado contra vetores gerados em uma JVM real.

## Shims

| Área                 | Local                    | Conteúdo                                                                                                                                                                                                        |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Números e texto      | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                 |
| Math                 | `src/java/lang/JavaMath` | `l2i` (o `(int)` de um `long`)                                                                                                                                                                                  |
| Exceções             | `src/java/lang/`         | Seis classes de exceção                                                                                                                                                                                         |
| Coleções             | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                   |
| Substitutos do Guava | `src/guava/`             | 20 arquivos: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` e cinco implementações |

`Math.log10` não precisa de shim: a função nativa do V8 coincide com todas as 1264 linhas gravadas.
O Guava nunca é uma dependência; `src/guava/` contém pequenos auxiliares locais.

## Vetores da JVM

Os vetores são gravados por `tools/vectors/JavaVectors.java` (e `GuavaVectors.java` para o Guava
33.3.0-jre). Eles são congelados: regenerá-los produz arquivos idênticos byte a byte.

| Grupo    | Linhas ou scripts                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Numérico | `l2i` 78, `Float32` 2704, double para float 72, `log10` 1264, divisão por zero 40, `Int64` 4056               |
| Hash     | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash de KVector 256 |
| Texto    | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                              |
| Random   | `setSeed` no meio da sequência: 4 seeds com 25 operações cada                                                 |
| Coleções | 1206 scripts de `HashMap`, 1172 de `HashSet` e 231 de `PriorityQueue`                                         |
| Guava    | 1518 scripts, 25,611 passos                                                                                   |

## Limites conhecidos

- A ordem na JVM das entradas de `HashMap` cujas chaves têm hash codes iguais e não são `Comparable`
  segue a identidade do objeto e não pode ser reproduzida. Os casos de conformidade que dependem
  disso precisam de uma entrada de divergência conhecida.
- Os scripts de `HashMap` e `HashSet` que dependem de identidade são ignorados nos vetores, e os
  scripts de `PriorityQueue(Collection)` são ignorados porque o ELK não tem chamador para eles.
- `Sets.newTreeSet` retorna um snapshot. Um shim de `TreeSet` ativo é necessário antes de
  `ScanlineOverlapCheck` e `ScanlineConstraintCalculator` serem portados.

As regras de tradução de coleções estão na página [Regras de coleções](/guide/collections-rules). A
próxima missão no [Roteiro](/guide/roadmap) é o sistema de propriedades e o modelo ElkGraph.
