---
title: Java-grunnlag
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-grunnlag

Resultatene til ELK avhenger av oppførselen til Java-runtime: 32-bits heltallsoverflyt, avrunding av `float`,
iterasjonsrekkefølgen i `HashMap`, `Random`-sekvenser og konvertering av tall til tekst.
Missionen java-foundations (fullført 2026-10-11) leverte shimene som reproduserer denne oppførselen,
og de JVM-innspilte vektorene som beviser dem.

Shimene implementeres bare fra spesifikasjonen i Javadoc. Ingen OpenJDK-kildekode leses eller
kopieres (AD-9). Hver shim sjekkes mot vektorer generert på en ekte JVM.

## Shims

| Område             | Plassering               | Innhold                                                                                                                                                                                                       |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tall og tekst      | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                               |
| Math               | `src/java/lang/JavaMath` | `l2i` (`(int)` av en `long`)                                                                                                                                                                                  |
| Unntak             | `src/java/lang/`         | Seks unntaksklasser                                                                                                                                                                                           |
| Collections        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                 |
| Guava-erstatninger | `src/guava/`             | 20 filer: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` og fem implementasjoner |

`Math.log10` trenger ingen shim: den native V8-funksjonen stemmer med alle 1264 innspilte rader. Guava er
aldri en avhengighet; `src/guava/` inneholder små lokale hjelpere.

## JVM-vektorer

Vektorene spilles inn av `tools/vectors/JavaVectors.java` (og `GuavaVectors.java` for Guava
33.3.0-jre). De er frosset: å regenerere dem gir byte-identiske filer.

| Gruppe      | Rader eller skript                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numerisk    | `l2i` 78, `Float32` 2704, double til float 72, `log10` 1264, divisjon med null 40, `Int64` 4056            |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Tekst       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` midt i sekvensen: 4 seeds med 25 operasjoner hver                                                |
| Collections | 1206 `HashMap`-, 1172 `HashSet`- og 231 `PriorityQueue`-skript                                             |
| Guava       | 1518 skript, 25,611 steg                                                                                   |

## Kjente begrensninger

- JVM-rekkefølgen på `HashMap`-oppføringer der nøklene har like hashkoder og ikke er `Comparable`
  følger objektidentitet og kan ikke reproduseres. Samsvarstilfeller som avhenger av den trenger en
  oppføring for kjente avvik.
- Identitetsavhengige `HashMap`- og `HashSet`-skript hoppes over i vektorene, og
  `PriorityQueue(Collection)`-skript hoppes over fordi ELK ikke har noen kaller for dem.
- `Sets.newTreeSet` returnerer et øyeblikksbilde. En levende `TreeSet`-shim trengs før
  `ScanlineOverlapCheck` og `ScanlineConstraintCalculator` porteres.

Oversettelsesreglene for collections står på siden [Regler for collections](/guide/collections-rules). Den
neste missionen på [veikartet](/guide/roadmap) er egenskapssystemet og ElkGraph-modellen.
