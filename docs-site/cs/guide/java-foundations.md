---
title: Základy Javy
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Základy Javy

Výsledky ELK závisejí na chování běhového prostředí Javy: 32bitovém přetékání celých čísel, zaokrouhlování
`float`, pořadí iterace `HashMap`, posloupnostech `Random` a převodu čísel na text.
Mise java-foundations (dokončena 2026-10-11) dodala shimy, které toto chování
reprodukují, a vektory zaznamenané na JVM, které je dokládají.

Shimy se implementují výhradně ze specifikace v Javadocu. Žádný zdrojový kód
OpenJDK se nečte ani nekopíruje (AD-9). Každý shim se ověřuje proti vektorům vygenerovaným na
skutečné JVM.

## Shimy

| Oblast           | Umístění                 | Obsah                                                                                                                                                                                                      |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Čísla a text     | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                            |
| Math             | `src/java/lang/JavaMath` | `l2i` (`(int)` z `long`)                                                                                                                                                                                   |
| Výjimky          | `src/java/lang/`         | Šest tříd výjimek                                                                                                                                                                                          |
| Kolekce          | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                              |
| Náhrady za Guavu | `src/guava/`             | 20 souborů: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` a pět implementací |

`Math.log10` shim nepotřebuje: nativní funkce V8 odpovídá všem 1264 zaznamenaným řádkům.
Guava není nikdy závislostí; `src/guava/` obsahuje malé lokální pomocné funkce.

## Vektory JVM

Vektory zaznamenává `tools/vectors/JavaVectors.java` (a `GuavaVectors.java` pro Guavu
33.3.0-jre). Jsou zmrazené: jejich opětovné vygenerování vytvoří bajtově totožné soubory.

| Skupina | Řádky nebo skripty                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Číselné | `l2i` 78, `Float32` 2704, double na float 72, `log10` 1264, dělení nulou 40, `Int64` 4056                  |
| Hash    | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash KVector 256 |
| Text    | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random  | `setSeed` uprostřed posloupnosti: 4 seedy po 25 operacích                                                  |
| Kolekce | 1206 skriptů `HashMap`, 1172 skriptů `HashSet` a 231 skriptů `PriorityQueue`                               |
| Guava   | 1518 skriptů, 25,611 kroků                                                                                 |

## Známá omezení

- Pořadí záznamů `HashMap` na JVM, jejichž klíče mají stejné hash kódy a nejsou
  `Comparable`, se řídí identitou objektů a nelze ho reprodukovat. Případy shody, které na něm
  závisejí, potřebují záznam mezi známými odchylkami.
- Skripty `HashMap` a `HashSet` závislé na identitě se ve vektorech přeskakují a
  skripty `PriorityQueue(Collection)` se přeskakují, protože pro ně ELK nemá žádného volajícího.
- `Sets.newTreeSet` vrací snímek. Živý shim `TreeSet` je potřeba před portováním
  `ScanlineOverlapCheck` a `ScanlineConstraintCalculator`.

Pravidla překladu kolekcí jsou na stránce [Pravidla pro kolekce](/guide/collections-rules). Další
mise v [plánu vývoje](/guide/roadmap) je systém vlastností a model ElkGraph.
