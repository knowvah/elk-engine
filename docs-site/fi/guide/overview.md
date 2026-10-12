---
title: Yleiskatsaus
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yleiskatsaus

`@knowvah/elk-engine` on alkuperäiselle uskollinen TypeScript-porttaus [Eclipse Layout
Kernelistä](https://www.eclipse.org/elk) (ELK), Java-pohjaisesta graafien asettelukirjastosta. Mukana ei ole Javaa
eikä WASMia: asettelualgoritmit on toteutettu uudelleen tavallisella TypeScriptillä ja varmennettu Java-toteutusta
vasten.

::: warning Pre-alfa
Yhtään asettelualgoritmia ei ole vielä porttattu. Repositoriossa on työkaluketju, arkkitehtuuridokumentit,
varmennuksen runko ja Javan ajonaikaiset shimit. `src/index.ts` ei vie vielä mitään julkista.
Järjestyksen, jossa algoritmit saapuvat, näet [tiekartasta](/guide/roadmap).
:::

## Java on määritelmä

Java-lähdekoodi kiinnitetyssä ELK-commitissa `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` on ensisijainen
määritelmä. Porttaus seuraa sitä tarkasti:

- Algoritmeja ei optimoida eikä yksinkertaisteta. Jos Java näyttää turhalta toistolta, toisto säilytetään.
- Jokainen haara porttataan, ja metodien rajat säilytetään, ellei TypeScript pakota muutokseen.
- JUnit-testit porttataan yhdessä testaamansa koodin kanssa.
- Javan ajonaikainen toiminta, johon ELK nojaa (32-bittinen kokonaislukuaritmetiikka, `HashMap`-iteraatiojärjestys,
  `Random`-sekvenssit), toistetaan shimeillä. Katso [Java-perusteet](/fi/guide/java-foundations).

[Käännössäännöt](/guide/translation-rules) luettelevat, miten kukin Java-käsite kuvautuu TypeScriptiin.

## Varmennus oraakkelia vasten

Oraakkeli on lähdekoodista käännetty upstream-ELK irrotetussa git-worktreessä kiinnitetyssä commitissa.
Porttauksen tulosteita verrataan oraakkelin tulosteisiin:

- Tunnisteiden, elementtimäärien, särmäosioiden topologian, taitepisteiden määrien ja ei-numeeristen arvojen
  täytyy täsmätä tarkasti.
- Numeeristen koordinaattien ja kokojen täytyy täsmätä absoluuttisella toleranssilla `1e-6`.

Valitut oraakkelin tulosteet on tallennettu repositorioon golden-viitteinä, joten testien ajamiseen ei tarvita JVM:ää.
Koko menettely on [yhdenmukaisuus](/fi/conformance)-sivulla.

## Julkinen sopimus

Julkinen API on ElkGraph-oliomalli sekä `ElkGraphUtil`-tehtaat. ELK JSON on I/O-adapteri, ei ydinmalli.
Ensimmäinen npm-julkaisu lukitsee tämän pinnan.

## Ajonaikaiset rajoitteet

- `src/` on selainturvallinen: ei Node-sisäänrakennettuja moduuleja, ei `process.env`-muuttujaa, vain ES-moduuleja.
- Ajonaikaisia riippuvuuksia ei ole.

## Mihin seuraavaksi

- [Arkkitehtuuri](/fi/guide/architecture): miten oraakkeli, bundlet ja asettelumoottori toimivat yhdessä.
- [Porttauskartta](/guide/port-map) ja [inventaario](/guide/inventory): mitkä Java-paketit kuvautuvat mihinkin
  moduuleihin.
- [Osallistuminen](/fi/guide/contributing): portit ja työnkulku.
