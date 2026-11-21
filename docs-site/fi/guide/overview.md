---
title: Yleiskatsaus
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yleiskatsaus

`@knowvah/elk-engine` on alkuperäiselle uskollinen TypeScript-porttaus [Eclipse Layout
Kernelistä](https://www.eclipse.org/elk) (ELK), Java-pohjaisesta graafien asettelukirjastosta. Mukana ei ole Javaa
eikä WASMia: asettelualgoritmit on toteutettu uudelleen tavallisella TypeScriptillä ja varmennettu Java-toteutusta
vasten.

::: warning Pre-1.0
Kaikki ELKin tavoitteena olleet asettelualgoritmit on porttattu ja varmennettu lähdekoodista käännettyä ELKiä
vasten; tulokset ovat [pariteettiraportissa](/parity). Julkinen vientipinta on hyväksytty, mutta sitä ei ole vielä
tiedostossa `src/index.ts`, joten paketin sisääntulomoduuli ei vie vielä mitään julkista. Ennen versiota 1.0 API voi
vielä muuttua.
Seuraavaksi tulevat asiat näet [tiekartasta](/guide/roadmap).
:::

## Java on määritelmä

Java-lähdekoodi kiinnitetyssä ELK-commitissa `8bca22f4afa3371562d2f702d59929818f7f7b71` on ensisijainen
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

Julkinen API on vientipinta, joka hyväksyttiin tiketissä
[#90](https://github.com/knowvah/elk-engine/issues/90): ElkGraph-oliomalli ja `ElkGraphUtil`-tehtaat,
asettelumoottori, kunkin algoritmin metatietojen tarjoaja ja asetukset arvotyyppeineen sekä ELK JSON ja
tekstimuotoiset graafiformaatit. ELK JSON on I/O-adapteri, ei ydinmalli. [Aloitusopas](/guide/getting-started)
näyttää pinnan käytössä. Versiot pysyvät 0.x-sarjassa versioon 1.0 asti; 1.0 lukitsee pinnan.

## Ajonaikaiset rajoitteet

- `src/` on selainturvallinen: ei Node-sisäänrakennettuja moduuleja, ei `process.env`-muuttujaa, vain ES-moduuleja.
- Ajonaikaisia riippuvuuksia ei ole.

## Mihin seuraavaksi

- [Arkkitehtuuri](/fi/guide/architecture): miten oraakkeli, bundlet ja asettelumoottori toimivat yhdessä.
- [Porttauskartta](/guide/port-map) ja [inventaario](/guide/inventory): mitkä Java-paketit kuvautuvat mihinkin
  moduuleihin.
- [Osallistuminen](/fi/guide/contributing): portit ja työnkulku.
