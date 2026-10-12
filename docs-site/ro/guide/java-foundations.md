---
title: Fundamente Java
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fundamente Java

Rezultatele ELK depind de comportamentul runtime-ului Java: depășirea cu revenire a întregilor pe 32 de biți,
rotunjirea `float`, ordinea de iterare a `HashMap`, secvențele `Random` și conversia numerelor în text.
Misiunea java-foundations (finalizată la 2026-10-11) a livrat shim-urile care reproduc acest comportament
și vectorii înregistrați pe JVM care le dovedesc.

Shim-urile sunt implementate exclusiv pe baza specificației din Javadoc. Nu se citește și nu se copiază
cod sursă OpenJDK (AD-9). Fiecare shim este verificat în raport cu vectori generați pe o JVM reală.

## Shim-uri

| Domeniu           | Locație                  | Conținut                                                                                                                                                                                                         |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numere și text    | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                  |
| Math              | `src/java/lang/JavaMath` | `l2i` (`(int)` aplicat unui `long`)                                                                                                                                                                              |
| Excepții          | `src/java/lang/`         | Șase clase de excepții                                                                                                                                                                                           |
| Colecții          | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                    |
| Înlocuitori Guava | `src/guava/`             | 20 de fișiere: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` și cinci implementări |

`Math.log10` nu are nevoie de shim: funcția nativă V8 coincide cu toate cele 1264 de rânduri înregistrate.
Guava nu este niciodată o dependență; `src/guava/` conține mici funcții ajutătoare locale.

## Vectori JVM

Vectorii sunt înregistrați de `tools/vectors/JavaVectors.java` (și de `GuavaVectors.java` pentru Guava
33.3.0-jre). Sunt înghețați: regenerarea lor produce fișiere identice la nivel de octet.

| Grup     | Rânduri sau scripturi                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Numeric  | `l2i` 78, `Float32` 2704, double la float 72, `log10` 1264, împărțire la zero 40, `Int64` 4056             |
| Hash     | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash KVector 256 |
| Text     | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random   | `setSeed` la mijlocul secvenței: 4 seed-uri cu câte 25 de operații                                         |
| Colecții | 1206 scripturi `HashMap`, 1172 `HashSet` și 231 `PriorityQueue`                                            |
| Guava    | 1518 scripturi, 25,611 pași                                                                                |

## Limite cunoscute

- Ordinea JVM a intrărilor `HashMap` ale căror chei au coduri hash egale și nu sunt `Comparable`
  urmează identitatea obiectului și nu poate fi reprodusă. Cazurile de conformitate care depind de ea au nevoie
  de o intrare în divergențele cunoscute.
- Scripturile `HashMap` și `HashSet` dependente de identitate sunt omise în vectori, iar
  scripturile `PriorityQueue(Collection)` sunt omise deoarece ELK nu are niciun apelant pentru ele.
- `Sets.newTreeSet` returnează un instantaneu. Este nevoie de un shim `TreeSet` viu înainte ca
  `ScanlineOverlapCheck` și `ScanlineConstraintCalculator` să fie portate.

Regulile de traducere pentru colecții se află pe pagina [Reguli pentru colecții](/guide/collections-rules).
Următoarea misiune de pe [foaia de parcurs](/guide/roadmap) este sistemul de proprietăți și modelul ElkGraph.
