---
title: Podstawy Javy
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Podstawy Javy

Wyniki ELK zależą od zachowania środowiska uruchomieniowego Javy: zawijania 32-bitowych liczb
całkowitych, zaokrąglania `float`, kolejności iteracji `HashMap`, sekwencji `Random` i konwersji
liczb na tekst. Misja java-foundations (zakończona 2026-10-11) dostarczyła shimy, które odtwarzają
to zachowanie, oraz wektory nagrane na JVM, które je potwierdzają.

Shimy są implementowane wyłącznie na podstawie specyfikacji w Javadoc. Żaden kod źródłowy OpenJDK
nie jest czytany ani kopiowany (AD-9). Każdy shim jest sprawdzany względem wektorów wygenerowanych
na prawdziwej JVM.

## Shimy

| Obszar           | Lokalizacja              | Zawartość                                                                                                                                                                                                   |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Liczby i tekst   | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                             |
| Math             | `src/java/lang/JavaMath` | `l2i` (`(int)` z `long`)                                                                                                                                                                                    |
| Wyjątki          | `src/java/lang/`         | Sześć klas wyjątków                                                                                                                                                                                         |
| Kolekcje         | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                               |
| Zamienniki Guavy | `src/guava/`             | 20 plików: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` i pięć implementacji |

`Math.log10` nie potrzebuje shima: natywna funkcja V8 zgadza się ze wszystkimi 1264 nagranymi
wierszami. Guava nigdy nie jest zależnością; `src/guava/` zawiera małe lokalne funkcje pomocnicze.

## Wektory JVM

Wektory są nagrywane przez `tools/vectors/JavaVectors.java` (oraz `GuavaVectors.java` dla Guavy
33.3.0-jre). Są zamrożone: ich ponowne wygenerowanie daje pliki identyczne co do bajtu.

| Grupa      | Wiersze lub skrypty                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Numeryczne | `l2i` 78, `Float32` 2704, double na float 72, `log10` 1264, dzielenie przez zero 40, `Int64` 4056          |
| Hash       | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash KVector 256 |
| Tekst      | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random     | `setSeed` w środku sekwencji: 4 seedy po 25 operacji                                                       |
| Kolekcje   | 1206 skryptów `HashMap`, 1172 `HashSet` i 231 `PriorityQueue`                                              |
| Guava      | 1518 skryptów, 25,611 kroków                                                                               |

## Znane ograniczenia

- Kolejność wpisów `HashMap` na JVM, gdy klucze mają równe kody hash i nie są `Comparable`,
  zależy od tożsamości obiektów i nie da się jej odtworzyć. Przypadki zgodności, które od niej
  zależą, wymagają wpisu o znanej rozbieżności.
- Skrypty `HashMap` i `HashSet` zależne od tożsamości są w wektorach pomijane, podobnie jak
  skrypty `PriorityQueue(Collection)`, ponieważ ELK nie ma dla nich wywołującego.
- `Sets.newTreeSet` zwraca migawkę. Żywy shim `TreeSet` jest potrzebny, zanim zostaną
  zportowane `ScanlineOverlapCheck` i `ScanlineConstraintCalculator`.

Reguły tłumaczenia kolekcji są na stronie [Reguły kolekcji](/guide/collections-rules). Następną
misją w [planie rozwoju](/guide/roadmap) jest system właściwości i model ElkGraph.
