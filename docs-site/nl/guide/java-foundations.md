---
title: Java-fundamenten
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-fundamenten

De resultaten van ELK hangen af van het gedrag van de Java-runtime: 32-bit-integeroverloop, afronding van
`float`, de iteratievolgorde van `HashMap`, `Random`-reeksen en de omzetting van getallen naar tekst.
De mission java-foundations (afgerond op 2026-10-11) leverde de shims die dit gedrag
reproduceren, en de op de JVM opgenomen vectoren die ze bewijzen.

De shims worden uitsluitend geïmplementeerd vanuit de specificatie in de Javadoc. Er wordt geen
OpenJDK-broncode gelezen of gekopieerd (AD-9). Elke shim wordt gecontroleerd tegen vectoren die op een
echte JVM zijn gegenereerd.

## Shims

| Gebied            | Locatie                  | Inhoud                                                                                                                                                                                                           |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Getallen en tekst | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                  |
| Math              | `src/java/lang/JavaMath` | `l2i` (de `(int)` van een `long`)                                                                                                                                                                                |
| Exceptions        | `src/java/lang/`         | Zes exceptionklassen                                                                                                                                                                                             |
| Collections       | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                    |
| Guava-vervangers  | `src/guava/`             | 20 bestanden: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` en vijf implementaties |

`Math.log10` heeft geen shim nodig: de native V8-functie komt overeen met alle 1264 opgenomen rijen. Guava is nooit een
afhankelijkheid; `src/guava/` bevat kleine lokale hulpfuncties.

## JVM-vectoren

Vectoren worden opgenomen door `tools/vectors/JavaVectors.java` (en `GuavaVectors.java` voor Guava
33.3.0-jre). Ze zijn bevroren: opnieuw genereren levert byte-identieke bestanden op.

| Groep       | Rijen of scripts                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numeriek    | `l2i` 78, `Float32` 2704, double naar float 72, `log10` 1264, deling door nul 40, `Int64` 4056             |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Tekst       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` midden in de reeks: 4 seeds met elk 25 bewerkingen                                               |
| Collections | 1206 `HashMap`-, 1172 `HashSet`- en 231 `PriorityQueue`-scripts                                            |
| Guava       | 1518 scripts, 25,611 stappen                                                                               |

## Bekende grenzen

- De JVM-volgorde van `HashMap`-vermeldingen waarvan de sleutels gelijke hashcodes hebben en niet
  `Comparable` zijn, volgt de objectidentiteit en kan niet worden gereproduceerd. Conformiteitsgevallen
  die ervan afhangen, hebben een vermelding bij de bekende afwijkingen nodig.
- Identiteitsafhankelijke `HashMap`- en `HashSet`-scripts worden in de vectoren overgeslagen, evenals
  `PriorityQueue(Collection)`-scripts, omdat ELK er geen aanroeper voor heeft.
- `Sets.newTreeSet` geeft een momentopname terug. Een levende `TreeSet`-shim is nodig voordat
  `ScanlineOverlapCheck` en `ScanlineConstraintCalculator` worden geporteerd.

De vertaalregels voor collections staan op de pagina [Regels voor collections](/guide/collections-rules).
De volgende mission op de [routekaart](/guide/roadmap) is het property-systeem en het ElkGraph-model.
