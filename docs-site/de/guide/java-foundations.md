---
title: Java-Grundlagen
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-Grundlagen

Die Ergebnisse von ELK hängen vom Verhalten der Java-Laufzeit ab: 32-Bit-Ganzzahlüberlauf, Rundung von
`float`, die Iterationsreihenfolge von `HashMap`, `Random`-Folgen und die Umwandlung von Zahlen in Text.
Die Mission java-foundations (abgeschlossen am 2026-10-11) hat die Shims geliefert, die dieses Verhalten
reproduzieren, sowie die auf der JVM aufgezeichneten Vektoren, die sie belegen.

Die Shims werden ausschließlich aus der Spezifikation im Javadoc implementiert. Es wird kein
OpenJDK-Quelltext gelesen oder kopiert (AD-9). Jeder Shim wird gegen Vektoren geprüft, die auf einer
echten JVM erzeugt wurden.

## Shims

| Bereich         | Ort                      | Inhalt                                                                                                                                                                                                             |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Zahlen und Text | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                    |
| Math            | `src/java/lang/JavaMath` | `l2i` (das `(int)` eines `long`)                                                                                                                                                                                   |
| Exceptions      | `src/java/lang/`         | Sechs Exception-Klassen                                                                                                                                                                                            |
| Collections     | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                      |
| Guava-Ersatz    | `src/guava/`             | 20 Dateien: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` und fünf Implementierungen |

`Math.log10` braucht keinen Shim: Die native V8-Funktion stimmt mit allen 1264 aufgezeichneten Zeilen
überein. Guava ist nie eine Abhängigkeit; `src/guava/` enthält kleine lokale Hilfsfunktionen.

## JVM-Vektoren

Die Vektoren werden von `tools/vectors/JavaVectors.java` aufgezeichnet (und von `GuavaVectors.java` für
Guava 33.3.0-jre). Sie sind eingefroren: Ihre erneute Erzeugung liefert byteidentische Dateien.

| Gruppe      | Zeilen oder Skripte                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numerik     | `l2i` 78, `Float32` 2704, double zu float 72, `log10` 1264, Division durch null 40, `Int64` 4056           |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-Hash 256 |
| Text        | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` mitten in der Folge: 4 Seeds mit je 25 Operationen                                               |
| Collections | 1206 `HashMap`-, 1172 `HashSet`- und 231 `PriorityQueue`-Skripte                                           |
| Guava       | 1518 Skripte, 25,611 Schritte                                                                              |

## Bekannte Grenzen

- Die JVM-Reihenfolge von `HashMap`-Einträgen, deren Schlüssel gleiche Hashcodes haben und nicht
  `Comparable` sind, folgt der Objektidentität und lässt sich nicht reproduzieren. Konformitätsfälle,
  die davon abhängen, brauchen einen Eintrag bei den bekannten Abweichungen.
- Identitätsabhängige `HashMap`- und `HashSet`-Skripte werden in den Vektoren übersprungen, ebenso
  `PriorityQueue(Collection)`-Skripte, weil ELK dafür keinen Aufrufer hat.
- `Sets.newTreeSet` liefert einen Schnappschuss. Ein lebendiger `TreeSet`-Shim wird gebraucht, bevor
  `ScanlineOverlapCheck` und `ScanlineConstraintCalculator` portiert werden.

Die Übersetzungsregeln für Collections stehen auf der Seite [Collections-Regeln](/guide/collections-rules).
Die nächste Mission auf der [Roadmap](/guide/roadmap) ist das Property-System und das ElkGraph-Modell.
