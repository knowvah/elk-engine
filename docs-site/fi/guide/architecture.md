---
title: Arkkitehtuuri
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-enginen arkkitehtuurin yleiskatsaus

| Dokumentti                                          | Sisältö                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Jokainen ELK-bundle: tarkoitus, LOC, generoidut lähteet, laajuus             |
| [port-map.md](/guide/port-map)                      | Java-pakettien kuvaus `src/`-moduuleihin                                     |
| [component-map.md](#komponenttikartta)              | Laajuuteen kuuluvien bundlejen riippuvuudet; ajonaikaisen ytimen osat        |
| [../translation-rules.md](/guide/translation-rules) | Säännöt Javasta TypeScriptiin                                                |
| [../conformance.md](/fi/conformance)                | Oraakkelivertailun mittapuu ja menettely (saapuu myöhemmin tässä tehtävässä) |

## Mikä elk-engine on

`@knowvah/elk-engine` on alkuperäiselle uskollinen TypeScript-porttaus Eclipse Layout Kernelistä (ELK). Java
kiinnitetyssä commitissa `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` on määritelmä (AD-1, AD-2). Se on kirjasto:
selainturvallinen, ei ajonaikaisia riippuvuuksia, ei Javaa eikä WASMia. Sen julkinen sopimus on ElkGraph-oliomalli
sekä `ElkGraphUtil`-tehtaat; ELK JSON on I/O-adapteri (AD-14). Kolmetoista bundlea, yhteensä noin 134 600
käsin kirjoitettua riviä, kuuluu laajuuteen (katso inventaario). Tämä tehtävä toimittaa vain rungon: yhtään
asettelualgoritmia ei ole vielä porttattu.

## Suhde ELK Javaan ja oraakkeliin

![Suhde ELK Javan, oraakkelin rakennuksen, golden-viitteiden ja elk-enginen välillä](/diagrams/overview-1.svg)

Patch-sarja on tässä tehtävässä tyhjä (AD-3). Goldenit on tallennettu repositorioon, joten CI ei tarvitse JVM:ää
(AD-5). Vertailu: rakenne tarkasti, koordinaatit 1e-6:n sisällä (AD-4).

## Keskeiset kulut

Asettelu ELKissä, jonka elk-engine toistaa (yksityiskohdat tiedostossa [component-map.md](#komponenttikartta)):

![Asettelukutsun kulku rekursiivisen asettelumoottorin läpi](/diagrams/overview-2.svg)

JSON-adapteri (`graph.json`, `ElkGraphJson`): sisään tuleva ELK JSON muuttuu ElkGraphiksi importerin kautta ennen
asettelua; asettelun jälkeen lasketut koordinaatit ja särmäosiot siirretään takaisin ulos tulevaan JSONiin.
Oraakkelin harness käyttää Java-adapteria samoissa kahdessa vaiheessa, joten molemmat puolet jakavat JSON-sopimuksen.

## Teknologiapino

| Asia           | Valinta                                                       |
| -------------- | ------------------------------------------------------------- |
| Kieli          | TypeScript 7.0.2 (natiivi `tsc`), ES2022, NodeNext, `strict`  |
| Testit         | vitest 5.0.x ja `@vitest/coverage-v8` (90 %:n kynnykset)      |
| Niputus        | esbuild 0.28.x                                                |
| Skriptin ajaja | tsx                                                           |
| Ajoympäristö   | Node 22 tai uudempi; `src/` itse on selainturvallinen         |
| Vain oraakkeli | Maven 3.9+ ja JDK 21 (varana JDK 17) ELKin Tycho-rakennukseen |

## Fitness-rajoitteet (AD-8)

Bundlejen import-suunta noudattaa tiedostoa `test/architecture/bundle-deps.json`; SPDX-otsake jokaisessa
kooditiedostossa; ei Node-sisäänrakennettuja moduuleja eikä `process.env`-muuttujaa `src/`-hakemistossa; ei
moduulitason muutettavaa `let`-muuttujaa sallittujen listan ulkopuolella.

# Komponenttikartta

| Kaavio                 | Näyttää                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| 1. Bundle-riippuvuudet | 13 laajuuteen kuuluvaa bundlea ja niiden `Require-Bundle`-särmät |
| 2. Ajonaikainen ydin   | Miten asettelualgoritmi kytkeytyy moottoriin                     |

Nimistä puuttuu etuliite `org.eclipse.elk.`. Laajuus: [inventaario](/guide/inventory).

## 1. Laajuuteen kuuluvat bundle-riippuvuudet

Ensisijainen lähde: `test/architecture/bundle-deps.json`, johdettu kunkin bundlen `META-INF/MANIFEST.MF`-tiedostosta
työkalulla `tools/bundle-deps.ts` ja fitness-testin valvoma (AD-8).
Kaaviossa on **32 särmää**, yhtä paljon kuin JSONin 32 `requires`-merkintää (graph.json x 2,
core x 1, alg.common x 2, yhdeksän algoritmia x 3). Kolmannen osapuolen vaatimukset (Guava, EMF, Gson, Xtend-
kirjastot) ja laajuuden ulkopuoliset bundlet on jätetty pois. Nuoli `A --> B` tarkoittaa, että A vaatii B:n, joten
A:n hakemisto saa importata B:n hakemiston. `src/java` on importattavissa kaikkialla, eikä sitä näytetä.

![Riippuvuudet 13 laajuuteen kuuluvan ELK-bundlen välillä](/diagrams/component-map-1.svg)

Mikään algoritmi ei vaadi toista algoritmia: ainoa algoritmien yhteinen riippuvuus on
`alg.common`. Uusi import algoritmihakemistojen välillä kaataa fitness-testin, ellei Java-manifestissa ole samaa
särmää.

## 2. Ajonaikaisen ytimen osat

Luokkien sijainnit ovat hakemiston `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` alla,
ellei toisin mainita; varmennettu kiinnitetyssä commitissa.

| Luokka                            | Polku                               | Rooli                                                                           |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                          |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Kulkee hierarkian läpi, ajaa providerin tasoa kohden                            |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Jokaisen algoritmin kantaluokka; toteuttaa `IGraphLayoutEngine`in               |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Algoritmi-, optio- ja kategoriatietojen singleton-rekisteri                     |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; yksi generoitu algoritmibundlea kohden (`.melk`-tiedostosta) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritmin tunniste sekä providerien `getInstancePool()`                        |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Tyypitetyt optioavaimet ja `getProperty`n takana oleva map-haltija              |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Graafimalli; elementit ovat `EMapPropertyHolder`eja                             |

![ELKin ajonaikaisen ytimen luokkasuhteet](/diagrams/component-map-2.svg)

Näin algoritmi kytkeytyy:

1. Algoritmibundle toimittaa `AbstractLayoutProvider`in aliluokan (esimerkiksi `alg.layered`in
   `LayeredLayoutProvider`) ja `.melk`-tiedoston, joka määrittelee tunnisteen, optiot ja tuetut
   ominaisuudet.
2. `.melk`-kääntäjä generoi `ILayoutMetaDataProvider`in ja optioluokan. Sen
   `apply(Registry)` rekisteröi `LayoutAlgorithmData`n, jonka instanssipooli luo providerin.
3. `LayoutMetaDataService` kerää providerit. `LayoutAlgorithmResolver` asettaa algoritmin tunnisteen
   jokaiselle solmulle `algorithm`-optiosta.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` hakee providerin solmun
   `LayoutAlgorithmData.getInstancePool()`ista ja kutsuu `layout(layoutNode, progressMonitor)`a, minkä jälkeen se
   vapauttaa providerin (tai kutsuu `dispose()`a virheen jälkeen).

Elk-enginessä `.melk`-vaihe korvataan generaattorilla (AD-12, tuleva tehtävä) ja ElkGraphista tulee
tavallisia TS-luokkia (AD-11). Kuvaus TS-tiedostoihin: [porttauskartta](/guide/port-map); säännöt:
[käännössäännöt](/guide/translation-rules).
