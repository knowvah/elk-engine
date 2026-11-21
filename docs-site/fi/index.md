---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, puhtaalla TypeScriptillä
  tagline: Alkuperäiselle uskollinen TypeScript-porttaus Eclipse Layout Kernelistä. Ei Javaa, ei WASMia —
    asettelualgoritmit on toteutettu uudelleen tavallisella TypeScriptillä ja varmennettu Java-toteutusta vasten.
  actions:
    - theme: brand
      text: Yleiskatsaus
      link: /fi/guide/overview
    - theme: alt
      text: Galleria
      link: /fi/showcase/
    - theme: alt
      text: Katso GitHubissa
      link: https://github.com/knowvah/elk-engine
features:
  - title: Uskollinen ELK Javalle
    details: Kiinnitetyn ELK-commitin Java on määritelmä. Jokainen haara porttataan, ja JUnit-testit porttataan yhdessä
      testaamansa koodin kanssa.
  - title: Varmennettu oraakkelia vasten
    details: Tulosteita verrataan lähdekoodista käännettyyn ELKiin. Rakenne täsmää tarkasti; koordinaatit täsmäävät
      1e-6:n tarkkuudella.
  - title: Selainnatiivi, ei ajonaikaisia riippuvuuksia
    details: Ei Javaa, ei WASMia, ei Node-sisäänrakennettuja moduuleja kirjastokoodissa. Niputa ja julkaise.
  - title: Pre-1.0
    details: Kaikki ELKin tavoitteena olleet asettelualgoritmit on porttattu ja varmennettu lähdekoodista käännettyä
      ELKiä vasten. Ennen versiota 1.0 API voi vielä muuttua.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Kaikki ELKin tavoitteena olleet asettelualgoritmit on porttattu ja varmennettu lähdekoodista käännettyä ELKiä vasten;
tulokset ovat [pariteettiraportissa](/parity). Julkinen vientipinta on hyväksytty, mutta sitä ei ole vielä
tiedostossa `src/index.ts`, joten paketin sisääntulomoduuli ei vie vielä mitään julkista. Versiot pysyvät 0.x-sarjassa
versioon 1.0 asti, ja siihen saakka API voi vielä muuttua. Seuraavaksi tulevat asiat löydät
[tiekartasta](/guide/roadmap).
:::

## Valitse polkusi

| Haluan…                                            | Aloita täältä                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Ymmärtää, mitä projekti on ja mitä se ei ole       | [Yleiskatsaus](/fi/guide/overview)                                  |
| Nähdä, miten osat sopivat yhteen                   | [Arkkitehtuuri](/fi/guide/architecture)                             |
| Tietää, mitä "täsmää Javaan" tarkoittaa            | [Yhdenmukaisuus](/fi/conformance)                                   |
| Löytää, minne Java-paketti päätyy porttauksessa    | [Porttauskartta](/guide/port-map) · [Inventaario](/guide/inventory) |
| Oppia Javan ja TypeScriptin väliset säännöt        | [Käännössäännöt](/guide/translation-rules)                          |
| Nähdä, mikä Javan ajonaikainen toiminta on katettu | [Java-perusteet](/fi/guide/java-foundations)                        |
| Nähdä, mitä on suunniteltu                         | [Tiekartta](/guide/roadmap)                                         |
| Osallistua                                         | [Osallistuminen](/fi/guide/contributing)                            |
