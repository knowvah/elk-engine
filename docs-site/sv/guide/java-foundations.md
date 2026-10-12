---
title: Java-grunder
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-grunder

ELK:s resultat beror på beteendet hos Java-runtimen: 32-bitars heltalsomslag, avrundning av `float`,
iterationsordningen hos `HashMap`, `Random`-följder och omvandling av tal till text.
Missionen java-foundations (avslutad 2026-10-11) levererade de shims som återger detta beteende,
samt de JVM-inspelade vektorer som bevisar dem.

Shims implementeras enbart utifrån specifikationen i Javadoc. Ingen OpenJDK-källkod läses eller
kopieras (AD-9). Varje shim kontrolleras mot vektorer som genererats på en riktig JVM.

## Shims

| Område             | Plats                    | Innehåll                                                                                                                                                                                                       |
| ------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tal och text       | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                |
| Math               | `src/java/lang/JavaMath` | `l2i` (`(int)` av en `long`)                                                                                                                                                                                   |
| Exceptions         | `src/java/lang/`         | Sex exceptionklasser                                                                                                                                                                                           |
| Collections        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                  |
| Guava-ersättningar | `src/guava/`             | 20 filer: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` och fem implementationer |

`Math.log10` behöver ingen shim: den inbyggda V8-funktionen stämmer med alla 1264 inspelade rader.
Guava är aldrig ett beroende; `src/guava/` innehåller små lokala hjälpfunktioner.

## JVM-vektorer

Vektorerna spelas in av `tools/vectors/JavaVectors.java` (och `GuavaVectors.java` för Guava
33.3.0-jre). De är frysta: om man genererar dem igen får man byte-identiska filer.

| Grupp       | Rader eller skript                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numerik     | `l2i` 78, `Float32` 2704, double till float 72, `log10` 1264, division med noll 40, `Int64` 4056           |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Text        | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` mitt i följden: 4 seeds med 25 operationer vardera                                               |
| Collections | 1206 `HashMap`-, 1172 `HashSet`- och 231 `PriorityQueue`-skript                                            |
| Guava       | 1518 skript, 25,611 steg                                                                                   |

## Kända begränsningar

- JVM:ens ordning för `HashMap`-poster vars nycklar har lika hashkoder och inte är `Comparable`
  följer objektidentitet och kan inte återges. Överensstämmelsefall som beror på det behöver en
  post bland de kända avvikelserna.
- Identitetsberoende `HashMap`- och `HashSet`-skript hoppas över i vektorerna, och
  `PriorityQueue(Collection)`-skript hoppas över eftersom ELK inte har någon anropare för dem.
- `Sets.newTreeSet` returnerar en ögonblicksbild. En levande `TreeSet`-shim behövs innan
  `ScanlineOverlapCheck` och `ScanlineConstraintCalculator` porteras.

Översättningsreglerna för collections finns på sidan [Regler för collections](/guide/collections-rules). Nästa
mission på [färdplanen](/guide/roadmap) är egenskapssystemet och ElkGraph-modellen.
