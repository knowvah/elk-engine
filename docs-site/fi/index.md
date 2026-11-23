---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Versio 1.0
    details: Kaikki ELKin tavoitteena olleet asettelualgoritmit on porttattu ja varmennettu lähdekoodista käännettyä
      ELKiä vasten. Julkinen API on lukittu versioon 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versio 1.0
`@knowvah/elk-engine@1.0.0` on npm:ssä. Kaikki ELKin tavoitteena olleet asettelualgoritmit on porttattu ja varmennettu
lähdekoodista käännettyä ELKiä vasten; tulokset ovat [pariteettiraportissa](/parity), ja vielä avoimet erot on kirjattu
issueiksi. Julkinen API, 72 vientiä, on lukittu versioon 1.0.0 ja versiot noudattavat semveria. Aloita
[Aloitusoppaasta](/guide/getting-started); seuraavaksi tulevat asiat löydät [tiekartasta](/guide/roadmap).
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
