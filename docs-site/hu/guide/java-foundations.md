---
title: Java-alapok
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-alapok

Az ELK eredményei a Java futtatókörnyezet viselkedésétől függenek: a 32 bites egész számok
túlcsordulásától, a `float` kerekítésétől, a `HashMap` bejárási sorrendjétől, a `Random`-sorozatoktól
és a számok szöveggé alakításától. A java-foundations misszió (befejezve: 2026-10-11) leszállította
az ezt a viselkedést reprodukáló shimeket, valamint a JVM-en rögzített vektorokat, amelyek igazolják őket.

A shimeket kizárólag a Javadoc specifikációjából valósítjuk meg. OpenJDK-forrást nem olvasunk és nem
másolunk (AD-9). Minden shimet egy valódi JVM-en generált vektorokkal ellenőrzünk.

## Shimek

| Terület             | Hely                     | Tartalom                                                                                                                                                                                                 |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Számok és szöveg    | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                          |
| Math                | `src/java/lang/JavaMath` | `l2i` (egy `long` `(int)` konverziója)                                                                                                                                                                   |
| Kivételek           | `src/java/lang/`         | Hat kivételosztály                                                                                                                                                                                       |
| Gyűjtemények        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                            |
| Guava-helyettesítők | `src/guava/`             | 20 fájl: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` és öt implementáció |

A `Math.log10` nem igényel shimet: a natív V8-függvény egyezik mind az 1264 rögzített sorral. A Guava
soha nem függőség; az `src/guava/` kis helyi segédfüggvényeket tartalmaz.

## JVM-vektorok

A vektorokat a `tools/vectors/JavaVectors.java` rögzíti (a Guava 33.3.0-jre esetén a
`GuavaVectors.java`). Befagyasztottak: az újragenerálásuk bájtra azonos fájlokat ad.

| Csoport      | Sorok vagy szkriptek                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Numerikus    | `l2i` 78, `Float32` 2704, double–float 72, `log10` 1264, nullával osztás 40, `Int64` 4056                  |
| Hash         | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-hash 256 |
| Szöveg       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random       | `setSeed` a sorozat közepén: 4 seed, egyenként 25 művelettel                                               |
| Gyűjtemények | 1206 `HashMap`-, 1172 `HashSet`- és 231 `PriorityQueue`-szkript                                            |
| Guava        | 1518 szkript, 25,611 lépés                                                                                 |

## Ismert korlátok

- Azoknak a `HashMap`-bejegyzéseknek a JVM-beli sorrendje, amelyek kulcsainak hash-kódja egyenlő, és
  nem `Comparable`, az objektumidentitást követi, és nem reprodukálható. Az ettől függő megfelelőségi
  esetekhez ismert eltérés bejegyzése szükséges.
- Az identitásfüggő `HashMap`- és `HashSet`-szkriptek ki vannak hagyva a vektorokból, a
  `PriorityQueue(Collection)` szkriptek pedig azért, mert az ELK-ban nincs hívójuk.
- A `Sets.newTreeSet` pillanatképet ad vissza. Élő `TreeSet` shimre van szükség, mielőtt a
  `ScanlineOverlapCheck` és a `ScanlineConstraintCalculator` portolásra kerül.

A gyűjtemények fordítási szabályai a [Gyűjtemények szabályai](/guide/collections-rules) oldalon találhatók.
Az [Ütemterv](/guide/roadmap) következő missziója a property-rendszer és az ElkGraph-modell.
