---
title: Java-grundlag
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-grundlag

ELK's resultater afhænger af Java-runtime-adfærd: 32-bit heltalsoverløb, afrunding af `float`,
iterationsrækkefølgen i `HashMap`, `Random`-sekvenser og konvertering af tal til tekst. Missionen
java-foundations (afsluttet 2026-10-11) leverede de shims, der reproducerer denne adfærd, og de
JVM-optagne vektorer, der beviser dem.

Shims implementeres udelukkende ud fra specifikationen i Javadoc. Ingen OpenJDK-kildekode læses
eller kopieres (AD-9). Hver shim kontrolleres mod vektorer, der er genereret på en rigtig JVM.

## Shims

| Område             | Placering                | Indhold                                                                                                                                                                                                       |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tal og tekst       | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                               |
| Math               | `src/java/lang/JavaMath` | `l2i` (`(int)` af en `long`)                                                                                                                                                                                  |
| Exceptions         | `src/java/lang/`         | Seks exception-klasser                                                                                                                                                                                        |
| Collections        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                 |
| Guava-erstatninger | `src/guava/`             | 20 filer: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` og fem implementeringer |

`Math.log10` behøver ingen shim: den native V8-funktion matcher alle 1264 optagne rækker. Guava er
aldrig en afhængighed; `src/guava/` rummer små lokale hjælpefunktioner.

## JVM-vektorer

Vektorerne optages af `tools/vectors/JavaVectors.java` (og `GuavaVectors.java` til Guava
33.3.0-jre). De er frosne: regenerering giver byte-identiske filer.

| Gruppe      | Rækker eller scripts                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numerisk    | `l2i` 78, `Float32` 2704, double til float 72, `log10` 1264, division med nul 40, `Int64` 4056             |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Tekst       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` midt i sekvensen: 4 seeds med 25 operationer hver                                                |
| Collections | 1206 `HashMap`-, 1172 `HashSet`- og 231 `PriorityQueue`-scripts                                            |
| Guava       | 1518 scripts, 25,611 trin                                                                                  |

## Kendte grænser

- JVM-rækkefølgen af `HashMap`-poster, hvis nøgler har samme hashkoder og ikke er `Comparable`,
  følger objektidentitet og kan ikke reproduceres. Overensstemmelsestilfælde, der afhænger af den,
  kræver en post for kendte afvigelser.
- Identitetsafhængige `HashMap`- og `HashSet`-scripts springes over i vektorerne, og
  `PriorityQueue(Collection)`-scripts springes over, fordi ELK ikke har nogen kalder til dem.
- `Sets.newTreeSet` returnerer et øjebliksbillede. En levende `TreeSet`-shim er nødvendig, før
  `ScanlineOverlapCheck` og `ScanlineConstraintCalculator` porteres.

Oversættelsesreglerne for collections står på siden [Regler for collections](/guide/collections-rules).
Den næste mission på [køreplanen](/guide/roadmap) er egenskabssystemet og ElkGraph-modellen.
