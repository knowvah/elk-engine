---
title: Java-grunnur
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-grunnur

Niðurstöður ELK ráðast af hegðun Java-keyrslutímans: 32 bita heiltöluvafi, námundun `float`,
ítrunarröð `HashMap`, `Random`-raðir og umbreyting talna í texta. Verkefnið java-foundations
(lokið 2026-10-11) skilaði shim-unum sem endurskapa þessa hegðun og JVM-viðmiðunarvigrunum sem
sanna þau.

Shim eru eingöngu útfærð út frá skilgreiningunni í Javadoc. Enginn OpenJDK-frumkóði er lesinn eða
afritaður (AD-9). Hvert shim er prófað gegn vigrum sem voru búnir til á raunverulegri JVM.

## Shim

| Svið              | Staðsetning              | Innihald                                                                                                                                                                                                |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tölur og texti    | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                         |
| Math              | `src/java/lang/JavaMath` | `l2i` (`(int)` af `long`)                                                                                                                                                                               |
| Undantekningar    | `src/java/lang/`         | Sex undantekningarklasar                                                                                                                                                                                |
| Söfn              | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                           |
| Staðgenglar Guava | `src/guava/`             | 20 skrár: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` og fimm útfærslur |

`Math.log10` þarf ekkert shim: innbyggða V8-fallið stemmir við allar 1264 skráðu línurnar. Guava er
aldrei ósjálfstæði (dependency); `src/guava/` geymir litla staðbundna hjálparaðferðir.

## JVM-vigrar

Vigrarnir eru skráðir af `tools/vectors/JavaVectors.java` (og `GuavaVectors.java` fyrir Guava
33.3.0-jre). Þeir eru frystir: endurmyndun þeirra gefur skrár sem eru bæti fyrir bæti eins.

| Hópur    | Línur eða skriftur                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Tölulegt | `l2i` 78, `Float32` 2704, double í float 72, `log10` 1264, deiling með núlli 40, `Int64` 4056              |
| Hash     | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Texti    | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random   | `setSeed` í miðri röð: 4 fræ með 25 aðgerðum hvert                                                         |
| Söfn     | 1206 `HashMap`-, 1172 `HashSet`- og 231 `PriorityQueue`-skriftur                                           |
| Guava    | 1518 skriftur, 25,611 skref                                                                                |

## Þekkt takmörk

- Röð `HashMap`-færslna á JVM, þar sem lyklarnir hafa sömu hash-kóða og eru ekki `Comparable`,
  ræðst af auðkenni hlutar og verður ekki endurskapað. Samræmistilvik sem ráðast af því þurfa
  færslu um þekkt frávik.
- Skriftur fyrir `HashMap` og `HashSet` sem ráðast af auðkenni hlutar eru hoppaðar yfir í vigrunum, og
  `PriorityQueue(Collection)`-skriftur eru hoppaðar yfir því ELK hefur engan kallara fyrir þær.
- `Sets.newTreeSet` skilar skyndimynd. Lifandi `TreeSet`-shim þarf áður en
  `ScanlineOverlapCheck` og `ScanlineConstraintCalculator` eru færð yfir.

Þýðingarreglurnar fyrir söfn eru á síðunni [Reglur um söfn](/guide/collections-rules). Næsta verkefni
á [vegvísinum](/guide/roadmap) er eiginleikakerfið (property system) og ElkGraph-líkanið.
