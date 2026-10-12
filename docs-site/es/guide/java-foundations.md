---
title: Fundamentos de Java
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fundamentos de Java

Los resultados de ELK dependen del comportamiento del runtime de Java: el desbordamiento cíclico de
enteros de 32 bits, el redondeo de `float`, el orden de iteración de `HashMap`, las secuencias de
`Random` y la conversión de números a texto. La misión java-foundations (completada el 2026-10-11)
entregó los shims que reproducen este comportamiento y los vectores registrados en la JVM que los
demuestran.

Los shims se implementan únicamente a partir de la especificación del Javadoc. No se lee ni se copia
código fuente de OpenJDK (AD-9). Cada shim se comprueba contra vectores generados en una JVM real.

## Shims

| Área                | Ubicación                | Contenido                                                                                                                                                                                                         |
| ------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Números y texto     | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                   |
| Math                | `src/java/lang/JavaMath` | `l2i` (el `(int)` de un `long`)                                                                                                                                                                                   |
| Excepciones         | `src/java/lang/`         | Seis clases de excepción                                                                                                                                                                                          |
| Colecciones         | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                     |
| Reemplazos de Guava | `src/guava/`             | 20 archivos: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` y cinco implementaciones |

`Math.log10` no necesita shim: la función nativa de V8 coincide con las 1264 filas registradas. Guava
nunca es una dependencia; `src/guava/` contiene pequeños helpers locales.

## Vectores de la JVM

Los vectores los registra `tools/vectors/JavaVectors.java` (y `GuavaVectors.java` para Guava
33.3.0-jre). Están congelados: regenerarlos produce archivos idénticos byte a byte.

| Grupo       | Filas o scripts                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Numérico    | `l2i` 78, `Float32` 2704, double a float 72, `log10` 1264, división por cero 40, `Int64` 4056                 |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash de KVector 256 |
| Texto       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                              |
| Random      | `setSeed` a mitad de la secuencia: 4 semillas con 25 operaciones cada una                                     |
| Colecciones | 1206 scripts de `HashMap`, 1172 de `HashSet` y 231 de `PriorityQueue`                                         |
| Guava       | 1518 scripts, 25,611 pasos                                                                                    |

## Límites conocidos

- El orden en la JVM de las entradas de `HashMap` cuyas claves tienen códigos hash iguales y no son
  `Comparable` sigue la identidad del objeto y no se puede reproducir. Los casos de conformidad que
  dependen de ello necesitan una entrada de divergencia conocida.
- Los scripts de `HashMap` y `HashSet` que dependen de la identidad se omiten en los vectores, y los
  scripts de `PriorityQueue(Collection)` se omiten porque ELK no tiene ningún llamador para ellos.
- `Sets.newTreeSet` devuelve una instantánea. Hace falta un shim de `TreeSet` vivo antes de portar
  `ScanlineOverlapCheck` y `ScanlineConstraintCalculator`.

Las reglas de traducción de colecciones están en la página de [reglas de colecciones](/guide/collections-rules). La
siguiente misión de la [hoja de ruta](/guide/roadmap) es el sistema de propiedades y el modelo ElkGraph.
