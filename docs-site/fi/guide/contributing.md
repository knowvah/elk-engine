---
title: Osallistuminen
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Osallistuminen

Lue ensin [Yleiskatsaus](/fi/guide/overview) ja [Käännössäännöt](/guide/translation-rules). Kiinnitetyn commitin Java
on määritelmä; jos olet epävarma, lue Java.

## Portit

Aja nämä ennen jokaista committia. Jokaisen täytyy mennä läpi.

| Komento                | Tarkistaa                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `npm run format:check` | Prettier-muotoilun                                            |
| `npm run typecheck`    | TypeScript-tyyppitarkistuksen (natiivi `tsc --noEmit`)        |
| `npm test`             | vitest-sarjan, golden-sarja mukaan lukien                     |
| `npm run coverage`     | Sarjan 90 %:n rivi-, haara-, funktio- ja lausekekattavuudella |

Vaatii Node 22:n tai uudemman. Asenna riippuvuudet komennolla `npm ci`.

## Testit ovat muuttumattomia

Odotetut arvot tulevat oraakkelista, JVM-vektoreista tai Java-lähdekoodista ennen toteutuksen kirjoittamista
(AD-13). Kun väittämä on kirjoitettu, se on jäädytetty: epäonnistuva testi tarkoittaa, että toteutus on väärin.

Jos testi voi mennä läpi vain muuttamalla sen väittämää, vektoria tai goldenia, pysähdy ja kirjaa tapaus
tehtävän päätöspäiväkirjaan. Älä löysää toleranssia, poista tapausta tai luo viitettä uudelleen vihreän saamiseksi.
Golden-viitteet luodaan uudelleen skriptillä, ei koskaan käsin.

## Työnkulku

1. Luo ominaisuushaara, esimerkiksi `feature/<short-description>`.
2. Kirjoita commit-viestit [Conventional Commits](https://www.conventionalcommits.org) -muodossa, esimerkiksi
   `feat(java): add JavaHashMap`. Otsikkorivit ovat pienellä kirjoitettuja ja enintään 72 merkin pituisia.
3. Avaa pull request `main`-haaraa vasten. CI tarkistaa pull requestin otsikon Conventional Commitina.
4. Commitien täytyy olla allekirjoitettuja; repositorion sääntöjoukko vaatii sen.
5. Pull requestit yhdistetään merge commitilla.

Jokaisessa kooditiedostossa on SPDX-otsake, `// SPDX-License-Identifier: EPL-2.0`. Fitness-testi valvoo sitä.
Riippuvuuksien täytyy olla yhteensopivia EPL-2.0:n kanssa.

## Dokumentaatiokomennot

| Komento                | Tarkoitus                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `npm run docs:dev`     | Käynnistää dokumentaatiosivuston live reloadilla              |
| `npm run docs:build`   | Rakentaa sivuston; kuollut sisäinen linkki kaataa rakennuksen |
| `npm run docs:preview` | Tarjoaa rakennetun sivuston paikallisesti                     |

Useimmat viitesivut sisällyttävät tiedostoja hakemistosta `docs/`. Muokkaa tiedostoa hakemistossa `docs/`, älä sivua
hakemistossa `docs-site/`. Sisällytettyjen tiedostojen PlantUML-kaaviot renderöidään SVG:ksi ja tallennetaan
hakemistoon `docs-site/public/diagrams/`.

## Ulkoiset hakemistot

Skriptit ja testit löytävät viereiset checkoutit ympäristömuuttujien avulla. Oletusarvot ovat suhteessa
repositorion juureen. Vain `tools/` ja `test/` lukevat näitä muuttujia; `src/`-koodi ei koskaan.

| Muuttuja         | Oletus                         | Sisältö                                                |
| ---------------- | ------------------------------ | ------------------------------------------------------ |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELKin Java-lähdekoodi kiinnitetyssä commitissa |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Irrotettu worktree ja käännetty oraakkeli              |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models-korpus, kiinnitetty korpuksen manifestissa  |

Oraakkelin rakentaminen vaatii Maven 3.9:n tai uudemman ja JDK 21:n (varana JDK 17). Oraakkelin menettelyn löydät
sivulta [Yhdenmukaisuus](/fi/conformance).
