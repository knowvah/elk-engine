---
title: Základy Javy
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Základy Javy

Výsledky ELK závisia od správania behového prostredia Javy: 32-bitové pretekanie celých čísel,
zaokrúhľovanie `float`, poradie iterácie `HashMap`, postupnosti `Random` a prevod čísel na text.
Misia java-foundations (dokončená 2026-10-11) dodala shimy, ktoré toto správanie reprodukujú,
a vektory zaznamenané na JVM, ktoré ho dokazujú.

Shimy sa implementujú výhradne zo špecifikácie v Javadoc. Zdrojový kód OpenJDK sa nečíta ani
nekopíruje (AD-9). Každý shim sa overuje voči vektorom vygenerovaným na skutočnej JVM.

## Shimy

| Oblasť           | Umiestnenie              | Obsah                                                                                                                                                                                                       |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Čísla a text     | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                             |
| Math             | `src/java/lang/JavaMath` | `l2i` (`(int)` z `long`)                                                                                                                                                                                    |
| Výnimky          | `src/java/lang/`         | Šesť tried výnimiek                                                                                                                                                                                         |
| Kolekcie         | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                               |
| Náhrady za Guavu | `src/guava/`             | 20 súborov: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` a päť implementácií |

`Math.log10` nepotrebuje shim: natívna funkcia V8 sa zhoduje so všetkými 1264 zaznamenanými
riadkami. Guava nikdy nie je závislosťou; `src/guava/` obsahuje malé lokálne pomocné funkcie.

## Vektory JVM

Vektory zaznamenáva `tools/vectors/JavaVectors.java` (a `GuavaVectors.java` pre Guavu
33.3.0-jre). Sú zmrazené: ich opätovné vygenerovanie vytvorí bajtovo identické súbory.

| Skupina   | Riadky alebo skripty                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Numerické | `l2i` 78, `Float32` 2704, double na float 72, `log10` 1264, delenie nulou 40, `Int64` 4056                 |
| Hash      | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash KVector 256 |
| Text      | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random    | `setSeed` uprostred postupnosti: 4 seedy po 25 operáciách                                                  |
| Kolekcie  | 1206 skriptov `HashMap`, 1172 `HashSet` a 231 `PriorityQueue`                                              |
| Guava     | 1518 skriptov, 25,611 krokov                                                                               |

## Známe limity

- Poradie záznamov `HashMap` na JVM, ktorých kľúče majú rovnaké hash kódy a nie sú
  `Comparable`, sa riadi identitou objektu a nedá sa reprodukovať. Prípady zhody, ktoré od
  neho závisia, potrebujú záznam v známych odchýlkach.
- Skripty `HashMap` a `HashSet` závislé od identity sa vo vektoroch preskakujú a skripty
  `PriorityQueue(Collection)` sa preskakujú, pretože ELK pre ne nemá volajúceho.
- `Sets.newTreeSet` vracia snímku. Skôr než sa portujú `ScanlineOverlapCheck`
  a `ScanlineConstraintCalculator`, je potrebný živý shim `TreeSet`.

Pravidlá prekladu kolekcií sú na stránke [Pravidlá pre kolekcie](/guide/collections-rules).
Ďalšou misiou v [pláne vývoja](/guide/roadmap) je systém vlastností a model ElkGraph.
