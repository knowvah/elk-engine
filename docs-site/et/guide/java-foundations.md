---
title: Java alused
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java alused

ELK-i tulemused sõltuvad Java käitusaja käitumisest: 32-bitise täisarvu ülevool, `float`-i
ümardamine, `HashMap`-i itereerimisjärjekord, `Random`-i jadad ja arvude teisendamine tekstiks.
Missioon java-foundations (lõpetatud 2026-10-11) tõi kaasa shimid, mis seda käitumist reprodutseerivad,
ning JVM-is salvestatud vektorid, mis neid tõestavad.

Shimid realiseeritakse ainult Javadoc'i spetsifikatsiooni põhjal. OpenJDK-i lähtekoodi ei loeta
ega kopeerita (AD-9). Iga shimi kontrollitakse päris JVM-is genereeritud vektorite vastu.

## Shimid

| Valdkond        | Asukoht                  | Sisu                                                                                                                                                                                                         |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arvud ja tekst  | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                              |
| Math            | `src/java/lang/JavaMath` | `l2i` (`long`-i `(int)`)                                                                                                                                                                                     |
| Erandid         | `src/java/lang/`         | Kuus erandiklassi                                                                                                                                                                                            |
| Kollektsioonid  | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                |
| Guava asendused | `src/guava/`             | 20 faili: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` ja viis realisatsiooni |

`Math.log10` ei vaja shimi: V8 natiivne funktsioon ühtib kõigi 1264 salvestatud reaga. Guava ei ole
kunagi sõltuvus; `src/guava/` sisaldab väikseid kohalikke abifunktsioone.

## JVM-i vektorid

Vektorid salvestavad `tools/vectors/JavaVectors.java` (ja `GuavaVectors.java` Guava
33.3.0-jre jaoks). Need on külmutatud: nende regenereerimine annab baitideni identsed failid.

| Rühm           | Read või skriptid                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Numbrilised    | `l2i` 78, `Float32` 2704, double float'iks 72, `log10` 1264, nulliga jagamine 40, `Int64` 4056             |
| Räsi           | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-räsi 256 |
| Tekst          | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random         | `setSeed` jada keskel: 4 seemet, igaühel 25 operatsiooni                                                   |
| Kollektsioonid | 1206 `HashMap`-i, 1172 `HashSet`-i ja 231 `PriorityQueue` skripti                                          |
| Guava          | 1518 skripti, 25,611 sammu                                                                                 |

## Teadaolevad piirangud

- `HashMap`-i kirjete JVM-i järjekord, mille võtmetel on võrdsed räsikoodid ja mis ei ole
  `Comparable`, järgib objekti identiteeti ning seda ei saa reprodutseerida. Vastavusjuhtumid,
  mis sellest sõltuvad, vajavad kirjet teadaolevate lahknevuste hulgas.
- Identiteedist sõltuvad `HashMap`-i ja `HashSet`-i skriptid jäetakse vektorites vahele, samuti
  `PriorityQueue(Collection)` skriptid, sest ELK-is pole neile kutsujat.
- `Sets.newTreeSet` tagastab hetktõmmise. Enne `ScanlineOverlapCheck`-i ja
  `ScanlineConstraintCalculator`-i portimist on vaja elavat `TreeSet`-i shimi.

Kollektsioonide tõlkereeglid on lehel [kollektsioonide reeglid](/guide/collections-rules).
Järgmine missioon [teekaardil](/guide/roadmap) on omaduste süsteem ja ElkGraph-i mudel.
