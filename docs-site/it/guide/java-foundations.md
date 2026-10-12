---
title: Fondamenti Java
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fondamenti Java

I risultati di ELK dipendono dal comportamento del runtime Java: overflow a 32 bit degli interi, arrotondamento di
`float`, ordine di iterazione di `HashMap`, sequenze di `Random` e conversione da numero a testo.
La missione java-foundations (completata il 2026-10-11) ha prodotto gli shim che riproducono questo
comportamento e i vettori registrati sulla JVM che li dimostrano.

Gli shim sono implementati solo a partire dalla specifica nel Javadoc. Nessun sorgente di OpenJDK viene letto o
copiato (AD-9). Ogni shim è verificato rispetto a vettori generati su una JVM reale.

## Shim

| Area               | Posizione                | Contenuto                                                                                                                                                                                                     |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numeri e testo     | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                               |
| Math               | `src/java/lang/JavaMath` | `l2i` (il `(int)` di un `long`)                                                                                                                                                                               |
| Eccezioni          | `src/java/lang/`         | Sei classi di eccezione                                                                                                                                                                                       |
| Collezioni         | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                 |
| Sostituti di Guava | `src/guava/`             | 20 file: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` e cinque implementazioni |

`Math.log10` non ha bisogno di uno shim: la funzione nativa di V8 coincide con tutte le 1264 righe registrate. Guava non è mai
una dipendenza; `src/guava/` contiene piccoli helper locali.

## Vettori JVM

I vettori sono registrati da `tools/vectors/JavaVectors.java` (e da `GuavaVectors.java` per Guava
33.3.0-jre). Sono congelati: rigenerarli produce file identici byte per byte.

| Gruppo     | Righe o script                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Numerico   | `l2i` 78, `Float32` 2704, double a float 72, `log10` 1264, divisione per zero 40, `Int64` 4056                |
| Hash       | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash di KVector 256 |
| Testo      | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                              |
| Random     | `setSeed` a metà sequenza: 4 seed con 25 operazioni ciascuno                                                  |
| Collezioni | 1206 script `HashMap`, 1172 `HashSet` e 231 `PriorityQueue`                                                   |
| Guava      | 1518 script, 25,611 passi                                                                                     |

## Limiti noti

- L'ordine nella JVM delle voci di `HashMap` le cui chiavi hanno hash code uguali e non sono `Comparable`
  segue l'identità degli oggetti e non può essere riprodotto. I casi di conformità che ne dipendono richiedono una
  voce tra le divergenze note.
- Gli script `HashMap` e `HashSet` dipendenti dall'identità sono saltati nei vettori, e gli script
  `PriorityQueue(Collection)` sono saltati perché ELK non ha alcun chiamante per essi.
- `Sets.newTreeSet` restituisce uno snapshot. Serve uno shim `TreeSet` vivo prima che
  `ScanlineOverlapCheck` e `ScanlineConstraintCalculator` vengano portati.

Le regole di traduzione delle collezioni sono nella pagina [Regole delle collezioni](/guide/collections-rules). La
prossima missione della [Roadmap](/guide/roadmap) è il sistema delle proprietà e il modello ElkGraph.
