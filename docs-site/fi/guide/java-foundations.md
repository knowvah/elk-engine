---
title: Java-perusteet
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java-perusteet

ELKin tulokset riippuvat Javan ajonaikaisesta käyttäytymisestä: 32-bittisen kokonaisluvun ylivuodosta, `float`-pyöristyksestä, `HashMap`-iteraation järjestyksestä, `Random`-sarjoista ja lukujen muuntamisesta tekstiksi. Java-foundations-missio (valmistui 2026-10-11) toimitti shimit, jotka toistavat tämän käyttäytymisen, sekä JVM:llä tallennetut vektorit, jotka todistavat ne oikeiksi.

Shimit toteutetaan yksinomaan Javadocin määrittelyn pohjalta. OpenJDK:n lähdekoodia ei lueta eikä kopioida (AD-9). Jokainen shim tarkistetaan oikealla JVM:llä tuotettuja vektoreita vasten.

## Shimit

| Alue             | Sijainti                 | Sisältö                                                                                                                                                                                                       |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Luvut ja teksti  | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                               |
| Math             | `src/java/lang/JavaMath` | `l2i` (`long`-arvon `(int)`-muunnos)                                                                                                                                                                          |
| Poikkeukset      | `src/java/lang/`         | Kuusi poikkeusluokkaa                                                                                                                                                                                         |
| Kokoelmat        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                 |
| Guava-korvikkeet | `src/guava/`             | 20 tiedostoa: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` ja viisi toteutusta |

`Math.log10` ei tarvitse shimiä: V8:n natiivifunktio vastaa kaikkia 1264 tallennettua riviä. Guava ei ole koskaan riippuvuus; `src/guava/` sisältää pieniä paikallisia apufunktioita.

## JVM-vektorit

Vektorit tallentaa `tools/vectors/JavaVectors.java` (ja `GuavaVectors.java` Guava 33.3.0-jre -versiolle). Ne on jäädytetty: niiden uudelleentuottaminen tuottaa tavu tavulta identtiset tiedostot.

| Ryhmä      | Rivit tai skriptit                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Numeriikka | `l2i` 78, `Float32` 2704, double floatiksi 72, `log10` 1264, nollalla jako 40, `Int64` 4056                    |
| Tiiviste   | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector-tiiviste 256 |
| Teksti     | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                               |
| Random     | `setSeed` kesken sarjan: 4 siementä, kussakin 25 operaatiota                                                   |
| Kokoelmat  | 1206 `HashMap`-, 1172 `HashSet`- ja 231 `PriorityQueue`-skriptiä                                               |
| Guava      | 1518 skriptiä, 25,611 askelta                                                                                  |

## Tunnetut rajat

- Sellaisten `HashMap`-merkintöjen JVM-järjestys, joiden avaimilla on samat tiivistekoodit ja jotka eivät ole `Comparable`, seuraa olion identiteettiä, eikä sitä voi toistaa. Yhdenmukaisuustapaukset, jotka riippuvat siitä, tarvitsevat merkinnän tunnetuissa poikkeamissa.
- Identiteettiriippuvaiset `HashMap`- ja `HashSet`-skriptit jätetään vektoreissa pois, ja `PriorityQueue(Collection)`-skriptit jätetään pois, koska ELKissä ei ole niille kutsujaa.
- `Sets.newTreeSet` palauttaa tilannekuvan. Elävä `TreeSet`-shim tarvitaan ennen kuin `ScanlineOverlapCheck` ja `ScanlineConstraintCalculator` porttaan.

Kokoelmien käännössäännöt ovat sivulla [Kokoelmien säännöt](/guide/collections-rules). [Tiekartan](/guide/roadmap) seuraava missio on ominaisuusjärjestelmä (property system) ja ElkGraph-malli.
