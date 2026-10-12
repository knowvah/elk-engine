---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alfa
    details: Työkaluketju, arkkitehtuuri, Javan ajonaikaiset shimit ja varmennuksen runko ovat olemassa.
      Yhtään asettelualgoritmia ei ole vielä porttattu.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alfa
Yhtään asettelualgoritmia ei ole vielä porttattu, eikä `src/index.ts` vie mitään julkista. Ensimmäinen npm-julkaisu
lukitsee julkisen API:n. Seuraavaksi tulevat asiat löydät [tiekartasta](/guide/roadmap).
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
