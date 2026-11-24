---
title: Arkkitehtuuri
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-enginen arkkitehtuurin yleiskatsaus

| Dokumentti                                                                                                             | Sisältö                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Jokainen ELK-bundle: tarkoitus, LOC, generoidut lähteet, laajuus                                                                                                        |
| [port-map.md](/guide/port-map)                                                                                         | Java-pakettien kuvaus `src/`-moduuleihin                                                                                                                                |
| [component-map.md](#komponenttikartta)                                                                                 | Laajuuteen kuuluvien bundlejen riippuvuudet; ajonaikaisen ytimen osat                                                                                                   |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Säännöt Javasta TypeScriptiin                                                                                                                                           |
| [../conformance.md](/conformance)                                                                                      | Oraakkelivertailun mittapuu ja menettely (saapuu myöhemmin tässä tehtävässä)                                                                                            |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Textin (`.elkt`) porttaus, Xtext-osajoukko, runbook ja lykätyt osat                                                                                                 |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSONin (`.elkj`) porttaus, laiska linkitys, runbook ja lykätyt osat                                                                                         |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandomin (`.elkr`) satunnaisgraafigeneraattorin porttaus, todisteet ja runbook                                                                                         |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Asettelumoottori sekä fixed-, box- ja random-providerit (tehtävä 5a)                                                                                                    |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk`-generaattori, odottavat tyypit, laiskat vakiot, uudelleengenerointi                                                                                             |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Kompleksisuusportti, joka mittaa jokaisen funktion (`npm run complexity`)                                                                                               |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Kerroksellinen kehys (tehtävä 7a): LGraph-malli, muunnos, vaiheluokat, runbook                                                                                          |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Kerroksellinen solmujen sijoittelu (tehtävä 7d): p4nodes, Brandes-Köpf, viisi prosessoria, geometriarivit, runbook                                                      |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Kerroksellinen särmien reititys (tehtävä 7e): p5edges ortogonaalinen, murtoviiva, splinet, kuusi prosessoria, reititysrivit, runbook                                    |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Kerroksellinen putki (tehtävä 7f): `ElkLayered`, `GraphConfigurator`, komponentit, neljä prosessoria, täyden asettelun rivit, runnerin osajoukko, runbook               |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Kerroksellinen nimiöiden käsittely (tehtävä 7f2): nimiö- ja kommenttiprosessorit, purkaminen, debug-tuloste, visitor, nimiörivit, sweep, runbook                        |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Kerroksellinen: omasilmukat, wrapping, tiivistys (tehtävä 7g): loops-paketti, katkaisupisteet, 1D-tiivistys, `ComponentsCompactor`, rivit, sweep, runbook               |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Kerroksellinen: yhdistetyt graafit (tehtävä 7h): `compound`-paketti, hierarkkinen ajuri, koko puun pysäytykset, goldenit, sweep, hajautusjärjestyksen kaksoset, runbook |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-sweep oraakkelia vastaan (rivi 9): shardattu runner, yhteenvetosopimus, annotaatiot, raportti, runbook                                                               |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Vaihdettava nimiötekstin mittaus (rivi 10): patch 0003, TS-kaksonen, fixed-tila, todisteet, runbook                                                                     |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | ELKin kiinnitetyn commitin siirtäminen (rivi 13): nettodiffin triage, patch-sarja, uudelleenrakennus, uudelleentallennus, sweepit, viitediffin triage, harjoitustila    |

## Mikä elk-engine on

`@knowvah/elk-engine` on alkuperäiselle uskollinen TypeScript-porttaus Eclipse Layout Kernelistä (ELK). Java
kiinnitetyssä commitissa `8bca22f4afa3371562d2f702d59929818f7f7b71` on määritelmä (AD-1, AD-2). Se on kirjasto:
selainturvallinen, ei ajonaikaisia riippuvuuksia, ei Javaa eikä WASMia. Sen julkinen sopimus on ElkGraph-oliomalli
sekä `ElkGraphUtil`-tehtaat; ELK JSON on I/O-adapteri (AD-14). Kolmetoista bundlea, yhteensä noin 134 600
käsin kirjoitettua riviä, kuuluu laajuuteen (katso inventaario). Nykytila: asettelumoottori
(`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) ja kolme ytimen provideria `fixed`, `box`
ja `random` on porttattu, ja ne vastaavat oraakkelia kuratoiduissa golden-tapauksissa (tehtävä 5a,
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Myös muu `core`
on porttattu (tehtävä 5b: prosessoriputki, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splinet, kommenttien
kiinnitys; katso
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Yhteinen `alg.common`-bundle on porttattu kokonaan (tehtävä 6a: geometria, network simplex, 1D-tiivistys,
päällekkäisyydet, spore, polyomino; tehtävä 6b: `nodespacing` ja `NodeMicroLayout`, todistettu 326 rivin
oraakkelitoistolla; katso [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Kerroksellinen kehys on porttattu (tehtävä 7a: options-paketti, LGraph-malli, ElkGraph ↔ LGraph -muunnos ja
provider-kuori, todistettu kahdella oraakkelin vektoritiedostolla, joissa on 272 ja 330 riviä; asettelun vaiheet
seuraavat tehtävissä 7b–7h; katso
[alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Sen kaksi
ensimmäistä vaihetta on porttattu (tehtävä 7b: yksitoista syklinkatkaisijaa, yhdeksän kerrostajaa ja kymmenen niitä
ympäröivää prosessoria, todistettu 651 oraakkelin vaiheriviltä ja 32 652 tapauksen sweepillä;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Kolmas vaihe on porttattu (tehtävä 7c: risteysten minimointi laskureineen, ahne vaihto, mallijärjestyksen
vertailijat ja kahdeksan P2:n ja P3:n välissä olevaa prosessoria, todistettu 808 oraakkelin järjestysrivillä ja
6 728 tapauksen sweepillä;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Neljäs vaihe on porttattu (tehtävä 7d: neljä solmusijoittelijaa Brandes-Köpfeineen ja viisi prosessoria, joita P4-
pysäytys tarvitsee, todistettu 610 oraakkelin sijoitteluriviltä geometrioineen ja 8 410 tapauksen sweepillä;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Viides vaihe on porttattu (tehtävä 7e: ortogonaalinen, murtoviiva- ja splinereititin sekä kuusi prosessoria, joita
reititetty tulos tarvitsee, todistettu 950 oraakkelin reitityksen riviltä särmägeometrioineen ja 6 728 tapauksen
sweepillä;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
Kerroksellinen putki toimii (tehtävä 7f: ajuri, yhtenäisten komponenttien paketti, suuntamuunnin, hierarkkisten
porttien reititin ja kolme prosessoria, todistettu 1 311 oraakkelin rivillä kokonaisia asetteluja ja pysäytyksiä,
aiempien rivien 2 351 rivin uudelleentoistolla oikean ajurin läpi, 28 porttatulla JUnit-sarjalla ja 6 646 tapauksen
sweepillä;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Nimiöidyt ja kommentoidut asettelut, kerrosten purkaminen ja lokittava monitori toimivat myös (tehtävä 7f2:
nimiöperhe, kommenttiprosessorit, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` ja debug-apuohjelmat,
todistettu 1 305 oraakkelin rivillä pysäytyksiä ja kokonaisia asetteluja, 11 perustason JUnit-sarjalla ja 1 105
tapauksen sweepillä, jonka 935 ok-tapausta täsmäävät tarkasti;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Omasilmukat, graafin wrapping ja tiivistys toimivat myös (tehtävä 7g: loops-paketti, neljä omasilmukkaprosessoria,
katkaisupiste- ja yksisärmäwrapperit, `HorizontalGraphCompactor`, kerroksellinen `compaction`-paketti ja
`ComponentsCompactor`, todistettu 1 627 oraakkelin rivillä (`full` 731, `models` 307, `scenarios` 525, `sites` 64),
10 perustason JUnit-sarjalla, 3 073 tapauksen sweepillä, jonka 2 997 ok-tapausta täsmäävät tarkasti ja 76 heittoa
täsmäävät kummallakin puolella, sekä yhdeksän haaran kytkennällä, joka jättää 58 haaraa porttatuiksi;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Yhdistetyt graafit toimivat myös (tehtävä 7h: `compound`-paketti, `HierarchicalNodeResizingProcessor` ja viimeinen
haara, todistettu 540 oraakkelin rivillä (`full` 355, `models` 73 koko puun pysäytyksineen, `scenarios` 88, `sites`
24), 24 kerroksellisella goldenilla, yhdeksällä issue-sarjalla ja kolmella graph.json-metodilla, 1 169 tapauksen
sweepillä, jonka 1 164 ok-tapausta täsmäävät tarkasti ja 5 heittoa täsmäävät kummallakin puolella;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
Kerroksellinen algoritmi ajaa nyt kaikki hierarkiankäsittelytilat: 59 enum-haaraa on porttattu, yhtään ei ole
odottamassa, ja vaiheistettu lista on tyhjä. Vain issuen #58 kolme `elk.stress`-tapausta odottaa (tehtävä 8b).
Mitään muuta asettelualgoritmia ei vielä ajeta (mrtree, radial, force, disco, rectpacking, spore, topdownpacking,
vertiflex). Tehtävästä 8a lähtien myös mrtree, radial ja vertiflex toimivat (todistettu 1 181 oraakkelin rivillä
neljässä kokonaisten asettelujen ja pysäytysten viitteessä, 2 656 rivin yksikkövektoriviitteellä, 40 `trees`-
goldenilla, `MrTreeGraphSizeTest`illä ja `CenterOnRootTest`illä tuloksin 6/6 ja 2/2 sekä 906 tapauksen sweepillä
algoritmia kohden, jossa jokainen tapaus joko täsmää tai on diagnosoitu; kaksi radial-riviä, joiden tulos riippuu
puutetun hajautuskorin järjestyksestä, on luokiteltu, ei täsmätty;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Tehtävästä 8b
lähtien myös force, stress ja disco toimivat (todistettu 21 420 oraakkelin rivillä kolmessa kokonaisten asettelujen
ja pysäytysten viitteessä, 45 `force-disco`-goldenilla, `ForceImportTest`illä ja `TwoBitGridTest`illä tuloksin 3/3
kummallakin sekä sweepillä algoritmia kohden, jossa jokainen tapaus joko täsmää tai on diagnosoitu; Eadesin
`Math.log` on bittitarkka fdlibm-porttaus;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)).
Tehtävästä 8c lähtien myös rectpacking, spore (`sporeOverlap`, `sporeCompaction`) ja topdownpacking toimivat
(todistettu 2 593 oraakkelin rivillä kolmessa viitteessä, 44 `packing`-goldenilla, kahdeksalla porttatulla
JUnit-sarjalla 30 ajossa sekä sweepillä algoritmia kohden, jossa jokainen deterministinen tapaus joko täsmää tai on
diagnosoitu; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)).
Jokainen laajuuteen kuuluva algoritmi on sweepattu oraakkelia vastaan, ja algoritmikohtainen tulos julkaistaan
pariteettiraportissa
([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Suhde ELK Javaan ja oraakkeliin

![Suhde ELK Javan, oraakkelin rakennuksen, golden-viitteiden ja elk-enginen välillä](/diagrams/overview-1.svg)

Patch-sarja on tässä tehtävässä tyhjä (AD-3). Goldenit on tallennettu repositorioon, joten CI ei tarvitse JVM:ää
(AD-5). Vertailu: rakenne tarkasti, koordinaatit 1e-6:n sisällä (AD-4).

## Keskeiset kulut

Asettelu ELKissä, jonka elk-engine toistaa nykyään valinnoille `fixed`, `box` ja `random` (yksityiskohdat
tiedostoissa [component-map.md](#komponenttikartta) ja
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Asettelukutsun kulku rekursiivisen asettelumoottorin läpi](/diagrams/overview-2.svg)

JSON-adapteri (`graph.json`, `ElkGraphJson`): sisään tuleva ELK JSON muuttuu ElkGraphiksi importerin kautta ennen
asettelua; asettelun jälkeen lasketut koordinaatit ja särmäosiot siirretään takaisin ulos tulevaan JSONiin.
Oraakkelin harness käyttää Java-adapteria samoissa kahdessa vaiheessa, joten molemmat puolet jakavat JSON-sopimuksen.

Tekstiadapteri (`graph.text`, `ElkGraphText`): `.elkt`-teksti latautuu ElkGraphiksi käsin kirjoitetun jäsentimen,
linkkerin ja validaattorin kautta, jotka perustuvat pieneen Xtext-osajoukkoon (`src/xtext`), ja ElkGraph serialisoituu
takaisin `.elkt`-muotoon. Sisääntulopiste on sisäinen; katso
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Tekstimuotoisen JSONin adapteri (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-teksti latautuu saman Xtext-osajoukon
kautta käsin kirjoitetulla jäsentimellä ja linkittyy laiskasti kuten Xtextin `LazyLinker`: särmien päätepisteet ovat
EMF-proxyja (`src/emf`), jotka ratkeavat luettaessa. ElkGraph serialisoituu takaisin `.elkj`-muotoon
kielioppikohtaisella kirjoittajalla. Sisääntulopiste on sisäinen; katso
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Satunnaisgraafigeneraattori (`core.debug.grandom`, `GRandomText`): `.elkr`-teksti jäsennetään käsin kirjoitetulla
lekserillä ja jäsentimellä samalla Xtext-osajoukolla (`src/xtext`), ja `RandomGraphGenerator` muuttaa konfiguraation
ElkGrapheiksi tarkalleen JVM:n `Random`-sarjalla. Siemenellinen tuloste on tavutarkka oraakkelia vasten ja toistaa
yhdeksän `test/corpus/generated/*.json`-tiedostoa; siemenettömät polut (särmänimiön teksti, hierarkian ylittävä
sekoitus, puuttuva siemen) tarkistetaan vain invariantein. Sisääntulopiste on sisäinen; katso
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Dokumentaation ja julkaisun työkalut

Lisätty tiekartan rivillä 12; päätökset DP1–DP9 tiedostossa
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md).
`1.0.0` julkaistiin 2026-11-23.

| Osa              | Mitä se on                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vientipinta      | Hyväksytty (2026-11-23), lueteltu tiedostossa [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) ja pidetty yhtäläisenä tiedoston `src/index.ts` kanssa testillä `src/index.test.ts`; jäädytetty versioon `1.0.0`, ensimmäiseen npm-julkaisuun (AD-14) |
| API-viite        | `npm run docs:api`: typedoc yksityisessä paketissa `tools/typedoc/` omalla TypeScript 6:llaan (typedocilla ei ole TypeScript 7 -julkaisua, AD-6), generoituun `/reference/`-hakemistoon                                                                                                              |
| Esimerkit        | `test/docs/examples/*.ts`, näytetään sivuston aloitussivulla katkelmina ja verrataan oraakkelin viitteisiin (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                                                                    |
| Linkkitarkistus  | `npm run docs:linkcheck`: linkinator rakennetun sivuston yli, sisäiset linkit ja fragmentit, CI:ssä; ulkoiset linkit viikoittain (`links.yml`)                                                                                                                                                       |
| Pakkausharjoitus | `npm run pack:smoke`: paketoi, tarkista tiedostolista, asenna offline puhtaaseen projektiin, importoi, aseta siellä esimerkki ja vertaa sitä sen oraakkeliviitteeseen                                                                                                                                |
| Julkaisu         | semantic-release-konfiguraatio ja `release.yml`, ajetaan jokaisella `main`-pushilla; runbook tiedostossa [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                                                            |

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

Tehtävän 5a porttaamat ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine` (jaettu `RecursiveGraphLayoutEngineTopdown`in kanssa, M17), `LayoutAlgorithmResolver` sekä
`AbstractLayoutProvider`in aliluokat `FixedLayoutProvider`, `BoxLayoutProvider` ja `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` ja ominaisuustyypit tulivat aiemmin (tehtävät 2 ja 3). Tehtävä 5b
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) täydensi
bundlen: `AlgorithmAssembler` ja `LayoutProcessorConfiguration` (putki, jota jokainen algoritmibundle käyttää),
`LayoutConfigurator`, `ElkSpacings`, `ElkMath`in osiot, `ElkGraphAdapters`, `util/selection/*` ja `comments/*`. Sen
JDK-shimit ovat `src/java/awt/geom` (`Rectangle2D`) ja `src/java/util/regex` (`Pattern`, `WordBoundary`), hakemiston
`src/java/lang` `JavaCharacter`in vieressä; ne todistavat `awt.json`, `regex.json`, `character.json` ja
`regex-boundary.json`. Tehtävät 6a ja 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md))
porttasivat koko `alg.common`in; 6b lisäsi `nodespacing`in ja `NodeMicroLayout`in, todistettuna 326 rivin
`NodeMicroLayout`-oraakkelitoistolla.

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

Elk-enginessä `.melk`-vaihe korvataan generaattorilla (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) ja ElkGraphista tulee
tavallisia TS-luokkia (AD-11). Kuvaus TS-tiedostoihin: [porttauskartta](/guide/port-map); säännöt:
[käännössäännöt](/guide/translation-rules).
