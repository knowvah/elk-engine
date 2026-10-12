---
title: Yhdenmukaisuus
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yhdenmukaisuus: mitä ”vastaavuus” tarkoittaa

@knowvah/elk-engine validoidaan lähdekoodista käännettyä upstream-Eclipse ELK:ta (Java) vasten. TypeScript-asettelu on oraakkelin kanssa **yhdenmukainen**, kun molemmat on jäsennetty ELK JSONiksi ja rakenne sekä jokainen ei-numeerinen arvo ovat täsmälleen samat ja jokainen äärellinen luku täsmää absoluuttisen `1e-6`-toleranssin sisällä.
Vertailija on [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
tämä dokumentti kuvaa, mitä se toteuttaa. Porttaussäännöt ovat
tiedostossa [`docs/translation-rules.md`](/guide/translation-rules).

| #   | Osio                                                    | Vastaa kysymykseen                                        |
| --- | ------------------------------------------------------- | --------------------------------------------------------- |
| 1   | [Oraakkeli](#1-oraakkeli)                               | Mikä on ”oikein”, ja missä commitissa?                    |
| 1a  | [Yhdenmukaisuusyksikkö](#1a-yhdenmukaisuusyksikkö)      | Mikä on yksi tapaus, ja mitä tapauksia on?                |
| 2   | [Yhdenmukaisuusvaatimus](#2-yhdenmukaisuusvaatimus)     | Mikä lasketaan yhtäläiseksi?                              |
| 3   | [Goldenit ja korpus](#3-goldenit-ja-korpus)             | Mistä vertailutulosteet tulevat?                          |
| 4   | [Seam-patchit](#4-seam-patchit)                         | Miten oraakkelia muutetaan?                               |
| 5   | [Oraakkelin ylläpito](#5-oraakkelin-ylläpito-ohjekirja) | Mitä teen, kun se hajoaa?                                 |
| 6   | [Gate-tarkistukset](#6-gate-tarkistukset)               | Minkä on läpäistävä, ennen kuin muutos päätyy päähaaraan? |

## 1. Oraakkeli

Oraakkeli (AD-3) on upstream-ELK, **käännettynä lähdekoodista** irrotetussa git-worktreessä hakemistosta `$ELK_SOURCE_DIR`; `tools/oracle/build.sh` luo sen polkuun `$ELK_ORACLE_DIR`.
Kumpikin on tämän repositorion ulkopuolella; kumpaakaan ei toimiteta mukana.

| Kohde                  | Sijainti                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Kiinnitetty ELK-commit | `tools/oracle/ELK_COMMIT` (tällä hetkellä `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)                 |
| Patch-sarja            | `tools/oracle/patches/*.patch`, sovelletaan leksikaalisessa järjestyksessä komennolla `git am --3way` |
| Käännös                | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho lataa p2-artefaktit)                             |
| Eräajuri               | `tools/oracle/run.sh <outDir> <input>...` tai `run.sh --cases <cases.jsonl> <outDir>`                 |
| Harness                | `tools/oracle/harness/ElkOracle.java`                                                                 |
| Käännösmanifesti       | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patchit, JDK, jar bundlea kohden)                        |

**Build.** `build.sh` suorittaa `mvn -P elk-meta clean install -DskipTests` (melk-kääntäjä) ja sen jälkeen `mvn clean install -DskipTests -Dmaven.test.skip=true` worktreen hakemistosta `build/`, ja kirjaa sitten jokaisen laajuuteen kuuluvan bundlen jarin (`core`, `graph`, `graph.json`, `alg.common` sekä algoritmit `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`, `vertiflex`) tiedostoon `oracle-build.json`. Olemassa olevaa worktreetä käytetään uudelleen vain, jos se periytyy commitista `ELK_COMMIT`, sisältää täsmälleen hakemiston `tools/oracle/patches/` patchien otsikkorivit ja on siisti lukuun ottamatta käännöstulosteita; muuten `build.sh` päättyy koodiin `2` ja jättää sen koskematta.

**Run.** `run.sh` kääntää `ElkOracle.java`:n bundle-jareja vasten sekä kolmannen osapuolen bundleja (Gson, Guava, EMF, Xtext/Xtend-kirjastot) Tychon p2-välimuistista (`P2_BUNDLES`, oletus `~/.m2/repository/p2/osgi/bundle`; kustakin käytetään uusinta versiota). Yksi JVM asettelee jokaisen syötteen `RecursiveGraphLayoutEngine`-luokalla ja kirjoittaa tiedoston `<outDir>/<input basename>.json`, johon sisältyvät asettelu, nollamitat ja nollasijainnit; tuntemattomat asettelun asetukset jätetään pois. Epäonnistunut syöte tulostaa `ERROR <input>: <message>`; JVM päättyy koodiin `1`, jos jokin syöte epäonnistui. Syötteiden perusnimien on oltava yksilöllisiä yhden ajon sisällä, koska tulosteen nimi on perusnimi.

**Patch-sarjan semantiikka.** Sarjassa on tällä hetkellä yksi patch:

| Patch                                                                   | Vaikutus                                                                                                                                                                                                                                                       | Pariutettu TS-seam                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` ratkaisee id-törmäykset lausekkeella `"_g" + Random.nextInt(1000000)`; patch alustaa tämän `Random`in järjestelmäominaisuudesta `org.eclipse.elk.graph.json.exportSeed` (asettamatta = ELKin käyttäytyminen). `run.sh` välittää `EXPORT_SEED=1` | Injektoitava `Random` `graph.json`-porttauksessa; odottaa tuota porttausta (TS:n `Random`-shim toistaa sarjan jo: siemen 1 tuottaa 548985, 764588) |

Patcheja on vain lisäämässä suppeasti rajattuja seameja, jotka tekevät JVM:n ja JS:n käyttäytymisestä vertailukelpoista;
jokainen on pariutettu TS-puolen seamin kanssa (osio 4).

**Miksei elkjs?** elkjs on GWT:llä käännetty ELK. Se ei voi kantaa patch-sarjaamme, ja GWT:n JRE-emulaatio poikkeaa JVM:stä, josta porttaamme. Sitä ei käytetä oraakkelina.

## 1a. Yhdenmukaisuusyksikkö

**Tapaus** on `(algorithm, model, variant)` (D1). Pariteettikojelaudalla on yksi rivi
asettelualgoritmia kohden; elk-models-kansio ja census-ominaisuudet ovat suodattimia, eivät rivejä.

**Tapauksen id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, esimerkiksi
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` on algoritmin id
ilman etuliitettä `org.eclipse.elk.`. Generoiduilla malleilla `modelId` on `generated/<name>`.

**Mallin id ja lähde (D3).** Mallin id on polku elk-modelsissa ilman tiedostopäätettä.
Tapaus lukee `.json`-tiedoston, jos sellainen on, muuten `.elkt`-tiedoston; `.elkg` (EMF XMI) jätetään aina lukematta.

**Variantit (D6).** Nimetyt asetuskerrokset tiedostossa `test/corpus/variants.json`, sovelletaan juureen:
`default` (ei mitään), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Taso         | Algoritmi                                     | Mallit                           | Variantit             |
| ------------ | --------------------------------------------- | -------------------------------- | --------------------- |
| native       | mallin oma `rootAlgorithm`                    | jokainen census-malli            | kaikki seitsemän      |
| retarget     | jokainen lueteltu algoritmi paitsi mallin oma | jokainen census-malli            | vain `default` (OR-1) |
| generated    | tiedostoetuliitteen nimeämä algoritmi         | `test/corpus/generated/*.json`   | kaikki seitsemän      |
| ported JUnit | algoritmimissiota kohden                      | upstream-JUnit-tapaukset (AD-13) | porttauksen mukaan    |

`tools/oracle/run.sh --list-algorithms` on algoritmien id-luettelo (tällä hetkellä 14).

**Retarget (D2).** Harness asettaa `org.eclipse.elk.algorithm`-asetuksen **jokaiselle solmulle, jolla on lapsia**, korvaten mahdollisen ilmoitetun arvon, ja `org.eclipse.elk.randomSeed = 1` juurelle. ELK ratkaisee algoritmin solmu kerrallaan, ja asettamaton solmu palaa layered-algoritmiin. Juuri ilman lapsia saa vain siemenen. Retarget-taso ohittaa kunkin mallin oman `rootAlgorithm`in (native-taso kattaa sen).

## 2. Yhdenmukaisuusvaatimus

AD-4, täsmälleen niin kuin `compareLayout(expected, actual, { tol })` sen toteuttaa:

| Sääntö                           | Käyttäytyminen                                                                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toleranssi                       | Absoluuttinen, `DEFAULT_TOLERANCE = 1e-6`; äärelliset luvut läpäisevät, kun `abs(e - a) <= tol`                                                                                                                            |
| Ei-äärelliset luvut              | `NaN` ja `±Infinity` on oltava täsmälleen yhtä suuret (`Object.is` tai `===`), myös arvolla `tol: Infinity`                                                                                                                |
| Merkkijonot, totuusarvot, `null` | Tiukasti yhtä suuret, muuten `value`                                                                                                                                                                                       |
| Lajin ristiriita                 | Eri JSON-lajit (`null`, taulukko, olio, luku, merkkijono, totuusarvo) tuottavat yhden `type`-eron                                                                                                                          |
| Olion avaimet                    | Avainjoukon on oltava identtinen: vain expectedissa oleva avain on `missing`, vain actualissa oleva `extra`                                                                                                                |
| Taulukot                         | Täsmäytetään **`id`:n mukaan**, kun jokainen alkio molemmilla puolilla on olio, jolla on merkkijono-`id`, ja id:t ovat yksilöllisiä kummallakin puolella (tyhjä taulukko lasketaan avainnetuksi); muuten **paikan mukaan** |
| Avainnetut taulukot              | Vain toisella puolella oleva id on `structure`-ero polussa `path[id=<id>]`; järjestystä ei huomioida                                                                                                                       |
| Paikkaan perustuvat taulukot     | Pituusero on yksi `structure`-ero, eikä alkioita verrata pidemmälle                                                                                                                                                        |
| Erolajit                         | `structure`, `value`, `type`, `missing`, `extra`; `path` on JSON-polun kaltainen (`children[id=n1].x`)                                                                                                                     |

Seuraukset: elementtien id:t, elementtien lukumäärät, särmäsegmenttien topologia ja
taitepisteiden lukumäärät ovat täsmällisiä, koska id:t ja taulukoiden pituudet ovat täsmällisiä;
koordinaateille ja koille annetaan `1e-6`. `formatDiffs` tulostaa enintään 20 eroa.

**Tunnettujen poikkeamien käytäntö.** Poikkeamaa ei koskaan sovita pois nostamalla `tol`ia
tai muokkaamalla goldenia (AD-13). Jokainen kirjataan tähän syyn sekä sen koskettaman testin tai
fikstuurin kanssa. Hyväksytyt luokat:

- **ulp-tason `Math.*`-erot.** V8 ja JVM voivat erota `sin`, `cos`, `exp`, `log`, `pow` ja
  niiden sukulaisten viimeisessä bitissä; Javan `StrictMath` on määritelty bittitarkaksi, `Math` ei.
  Jo kohdattu tapaus: `nextGaussian` on määritelty käyttämään `StrictMath.log`ia,
  joten `src/java/util/Random.ts` sisältää `StrictMath.log`-tarkan toteutuksen
  `Math.log`in sijaan. Suosi `StrictMath`-algoritmin bittitarkkaa porttausta toleranssin laajentamisen sijaan.
- **Identiteettitiivisteiden iteraatio (AD-10).** Sellaisen `HashMap`in/`HashSet`in iterointi, jonka
  avaimet ovat identiteettitiivistettyjä olioita, on Javassa itsessään epädeterminististä. Kirjaa kohta
  päiväkirjaan ja porttaa lisäysjärjestyksellä; goldenit eivät saa riippua siitä.
  Arvotiivistettyjen avainten (String, Integer) on toistettava Javan järjestys.
- **Kellosta siemennetty `Random`.** Kun `randomSeed = 0`, ELK siementää kellosta
  (`core/Core.melk:608`), joten tuloste ei ole toistettavissa. Golden-syötteiden on jätettävä
  siemen asettamatta tai nollasta poikkeavaksi (layeredin oletussiemen on `1`).

Konkreettiset merkinnät (lisää vain käyttäjän hyväksynnällä):

| #   | Poikkeama                      | Syy                                                                            | Laajuus                                                                                                                                                               | Hyväksytty               |
| --- | ------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Jäsennysvirheen viestin teksti | ANTLR-viestit ovat generoidun jäsentimen artefakteja, jota ei koskaan porttata | Virheellinen kielioppisyöte (`.elkt`, `.elkj`, `.elkr`): vain jäsennysvirheen _olemassaolon_ on täsmättävä, ei viestin. Kelvollisen syötteen on täsmättävä täsmälleen | D8, käyttäjä, 2026-10-11 |

**Tuomiot.** Jokainen tapaus saa yhden tuomion oraakkelin kahdesta erillisestä JVM-ajosta (D4, D5, OR-2):

| Tuomio             | Merkitys                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Molemmat ajot asettelivat mallin, ja tulostetiedostot ovat tavu tavulta identtiset                                                                                                                         |
| `throws`           | Molemmat ajot heittivät saman poikkeuksen: täsmälleen sama luokka ja täsmälleen sama viesti sen jälkeen, kun `@[0-9a-f]+` on muutettu muotoon `@<hash>` (viesti voi olla null, esim. `StackOverflowError`) |
| `nondeterministic` | Ajot ovat eri mieltä (tulostetavut, poikkeus, tai toinen `ok` ja toinen `throws`)                                                                                                                          |
| `oracle-error`     | Harnessin vika (lukukelvoton syöte, tuntematon variantti/algoritmi/asetus, kadonnut tulosrivi); ei koskaan hyväksyttävä                                                                                    |
| `timeout`          | Ajo ylitti arvon `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                                                    |

Etusijajärjestys: `oracle-error`, sitten `timeout`, sitten `ok`/`throws`, kun ne ovat samat, muuten
`nondeterministic`. Ennen tavuvertailua jokainen `@[0-9a-f]+`-merkkijono molemmissa tulosteissa
korvataan merkkijonolla `@<hash>`, kuten poikkeusviesteissä (D5a; `sameOutput` tiedostossa `tools/corpus/sweep.ts`).
Syy: discon ohjelmallinen `debug.discoGraph`-asetus vie tekstin `...DCGraph@<identity hash>`,
jota mikään siemen ei voi kiinnittää. TS-vertailija soveltaa samaa korvausta. Epädeterministiset tapaukset
raportoidaan erikseen ja jätetään läpäisylukujen ulkopuolelle, kuten yllä oleva
identiteettitiivisteitä koskeva käytäntö edellyttää.

Todelliset jäljelle jäävät `nondeterministic`-tuloksen lähteet (ELKin käyttäytymistä, ei harnessin vikoja; lukumäärät ovat
pariteettiraportissa): spore (`ElkGraphImporter.java:169` hajauttaa `Math.random`illa) ja `random`
(oletus-`randomSeed` 0 on siementämätön sisäkkäisillä komposiiteilla; retarget siementää vain juuren, D2,
säilytetty käyttäjän päätöksellä). Viejän `_g<random>`-id-uudelleennimeämiset eivät ole lähde: seam-patch
korjaa ne.

## 3. Goldenit ja korpus

AD-5. Vertailutulosteet on tallennettu repositorioon, jotta CI ei tarvitse JVM:ää.

| Kohde              | Sijainti                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Kiinnitetty korpus | `eclipse-elk/elk-models` tiedoston `test/corpus/manifest.json` `commit`-arvon kohdalla (ei toimiteta mukana) |
| Mallihakemisto     | `$ELK_MODELS_DIR`, oletus `../../eclipse-elk/elk-models` suhteessa tähän repositorioon                       |
| Kuratoitu joukko   | `golden[]` tiedostossa `test/corpus/manifest.json`: `{ id, path, note }`                                     |
| Refit              | `test/golden/refs/elk/<id>.json`, yksi manifestin `id`:tä kohden                                             |
| Alkuperä           | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy`              |

**Id:n kuvaus poluksi.** `golden[].path` on suhteessa hakemistoon `$ELK_MODELS_DIR`, ja
syöte on `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` ajaa harnessin näillä syötteillä
ja sijoittaa jokaisen `<basename>.json`-tulosteen muotoon `refs/elk/<id>.json`.
Esimerkki: id `ptolemy-scrambler` on
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Uudelleengenerointi** (`tools/oracle/regen-goldens.sh`):

1. Edellyttää, että models-klooni on täsmälleen manifestin commitissa (muuten poistumiskoodi `1`).
2. Edellyttää käännettyä oraakkelia (`run.sh` tarvitsee tiedoston `oracle-build.json`).
3. Vaiheistaa kaikki refit ja `_meta.json`in hakemistoon `test/golden/refs/.elk-staging.*`, sitten
   vaihtaa hakemiston kahdella uudelleennimeämisellä, joten epäonnistunut ajo jättää vanhat refit.
4. `_meta.json`issa ei ole aikaleimoja (`builtAt` pysyy tiedostossa `oracle-build.json`), joten
   uudelleengenerointi ilman muuttuneita syötteitä on gitissä tavu tavulta no-op.

**Milloin generoidaan uudelleen:** kun `ELK_COMMIT`, patch-sarja, manifestin
`golden[]`-joukko tai `commit`, tai harness muuttuu. Muulloin ei koskaan.

**Päiväkirjasääntö.** Jokainen uudelleengenerointi, joka muuttaa reffiä, kirjataan päiväkirjaan
syyn kanssa (patchin id tai commit-nosto). Refejä ei koskaan muokata käsin. Jos TS-väite
tai golden voi läpäistä vain muuttamalla sitä, pysähdy ja kirjaa päiväkirjaan (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` ei aseta mitään: se ajaa oraakkelin jäsennystilassa
jokaisen mallin yli ja vertaa tulosta tallennettuun tiedostoon `test/corpus/census.json` (898
mallia: id, muodot, lähde, juurialgoritmi, ominaisuuslaskurit). Poistumiskoodi `0`, kun samat, `1` driftillä;
`--write` kirjoittaa tiedoston uudelleen. Se toimii vain kiinnitetyssä models-kloonissa ja keskeytyy
harnessin vikaan.

**Generoitu korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` sisältää siemennetyn
grandom-konfiguraation; sen viereinen `.json` on oraakkelin generoima, asettelematon syöte. Yhdeksän konfiguraatiota kattaa
ne algoritmien id:t, joita mikään elk-models-malli ei käytä: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Kussakin on enintään 50 solmua eikä
särmien nimiöitä (`BlindTextGenerator` on siementämätön). Harness nimeää generoidun juuren `root`iksi,
koska ELKin `JsonExporter` ratkaisee id-törmäyksen siementämättömällä satunnaisella päätteellä. Generoi uudelleen
vain komennolla `tools/oracle/regen-generated.sh` (vaiheistushakemisto ja uudelleennimeäminen; epäonnistunut konfiguraatio
jättää vanhat tiedostot); uusi ajo ilman muutoksia on gitissä no-op. TS:n grandom-porttauksen on
toistettava nämä `.json`-tiedostot tavu tavulta; algoritmien goldenit eivät koskaan riipu siitä.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` suunnittelee jokaisen tapauksen, ajaa kunkin kahdesti erillisissä JVM:issä (shardien oletusmäärä on
`min(cpus, 8)` samanaikaista `run.sh`-prosessia) ja kirjoittaa
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` tulostaa tapausmäärät tasoittain eikä aja mitään; `--filter` säilyttää tapausten id:t, jotka sisältävät
osamerkkijonon; `--limit` ottaa tasavälisen otoksen. Poistumiskoodi `0` paitsi jos jokin tapaus on `oracle-error`
(`1`); työkalun vika päättyy koodiin `2`. Tapauskohtaiset tulosteet pysyvät paikallisina (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(oletus `30000`, lukee vain `tools/`) rajaa jokaisen tapauksen; `run.sh` käynnistää JVM:n uudelleen aikakatkaisun
(JVM:n poistumiskoodi 75) jälkeen niille tapauksille, joilla ei ole tulosriviä.

**Pariteettiraportti (D9).** `docs/parity-report.md` generoidaan sweep-välimuistista ja tallennetaan repositorioon:
lukumäärät algoritmeittain ja tuomioittain, ELK- ja models-commiteilla ja ilman aikaleimoja. Generoi uudelleen
komennolla `npx tsx tools/corpus/parity-report.ts --write`; ilman `--write`-valitsinta komento päättyy koodiin `1`,
kun tallennettu raportti on vanhentunut. Älä koskaan muokkaa sitä käsin.

**Korpustestit.** `resolveModelsDir()` tiedostossa `test/corpus/corpus.ts` palauttaa
`skip`-syyn, kun klooni puuttuu tai on toisessa commitissa; sitä tarvitsevat testit
ohitetaan, ja viestissä on kiinnitetty sha. Tällä hetkellä `test/golden/oracle-refs.test.ts`
tarkistaa vain tallennetut refit: yksi manifestin id:tä kohden, geometria jokaisella solmulla,
portilla, nimiöllä ja särmällä, itsevertailu, ja että `_meta.json` vastaa `ELK_COMMIT`ia, manifestia ja generaattoria. TS-oraakkeli-asettelutestiä ei
vielä ole; se tulee ensimmäisen porttatun algoritmin mukana.

## 4. Seam-patchit

Seam-patchit muuttavat oraakkelia; ne ovat harvinaisia ja aina pariutettu TS-seamin kanssa.

1. Muokkaa ja committaa oraakkelin worktreessä (`$ELK_ORACLE_DIR`), tai laadi patch
   kokeilukloonissa commitissa `ELK_COMMIT`. Jos haluat lisätä valmiin patchin olemassa olevaan worktreehen paikan päällä (säilyttää
   `census/`- ja `sweep/`-välimuistit, jotka worktreen poistaminen tuhoaa), sovella se `build.sh`in
   identiteetillä:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` varmentaa sitten sarjan ja kääntää paikan päällä uudelleen (noin 3 minuuttia), joten vaiheet 4-5
   voi ohittaa.
2. Vie:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (tai vain uudet commitit). Tiedostojen nimet ovat `NNNN-<slug>.patch`; numeerinen
   etuliite määrää soveltamisjärjestyksen.
3. Lisää vastaava TS-seam (sama käyttäytyminen, injektoitava, hakemistossa `src/`), testeineen,
   joiden odotetut arvot tulevat patchatulta oraakkelilta (AD-13).
4. Muuten poista worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (lisää `--force`, jos käännöstuloste likaa sen).
5. Käännä uudelleen: `tools/oracle/build.sh` (soveltaa sarjan alusta uudelleen).
6. Generoi uudelleen: `tools/oracle/regen-goldens.sh`; tarkista `git diff test/golden/refs`.
7. Kirjaa päiväkirjaan merkintä, joka nimeää patchin (`NNNN-<slug>.patch`) ja luettelee jokaisen
   muuttuneen refin. `_meta.json`in `patches` tallentaa sarjan automaattisesti.

Älä koskaan jätä commitoimatonta muutosta worktreehen: `build.sh` pitää sitä vanhentuneena
(poistumiskoodi `2`). Älä koskaan muokkaa itse `ELK_SOURCE_DIR`ia.

## 5. Oraakkelin ylläpito (ohjekirja)

| Vika                                                                                              | Havaitseminen                                                                                                                                                                                                                                                                                   | Toimenpide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-käännös epäonnistuu (p2 ei tavoitettavissa, JDK, Mavenin versio)                            | `tools/oracle/build.sh` päättyy nollasta poikkeavaan koodiin; täysi Maven-tuloste on tiedostossa `.oracle-build.log` repositorion juuressa. Koodi `1` tarkoittaa puuttuvaa työkalua tai väärää Mavenia; koodi `3` tarkoittaa, ettei bundlen jaria tuotettu                                      | Mavenin on oltava **3.9.x**: Tycho 4.0.12 kaatuu Maven 3.10:een (Homebrewin 3.10.0) virheeseen `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Paikallinen 3.9.11 on hakemistossa `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Käytä JDK 21:tä tai JDK 17:ää `JAVA_HOME`n kautta. Tarkista verkko (ensimmäinen ajo lataa p2-artefakteja), aja sitten uudelleen. `build.sh --record-only` ohittaa Mavenin ja kirjoittaa vain `oracle-build.json`in uudelleen jo käännetyistä jareista. Koodi `2`: poista worktree (osio 4 vaihe 4) ja käännä uudelleen. Muuten eskaloi lokin lopun kanssa |
| `build.sh` päättyy koodiin `2` heti patchin soveltamisen jälkeen                                  | Worktree ilmoitetaan vanhentuneeksi                                                                                                                                                                                                                                                             | `build.sh` purkaa rivitetyt patchien otsikkorivit (`git format-patch` rivittää ne noin 78 merkin kohdalla) ja ohittaa seuraamattomat `census/`- ja `sweep/`-välimuistit; muu lika tai luettelosta puuttuva patch antaa edelleen koodin `2`: korjaa worktree (osio 4)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Golden-drift patchin tai commit-noston jälkeen                                                    | `tools/oracle/regen-goldens.sh` ja sen jälkeen `git diff --exit-code test/golden/refs` ei ole tyhjä; `test/golden/oracle-refs.test.ts` kaatuu vanhentuneeseen `_meta.json`iin (`elkCommit`, `modelsCommit`); TS-yhdenmukaisuustesti kaatuu, kun sellainen on olemassa, `formatDiffs`-raporttiin | Käännä uudelleen (`build.sh`), aja `regen-goldens.sh`, tarkista diff, kirjaa patchin id päiväkirjaan. Älä koskaan muokkaa reffiä käsin tai löysää `tol`ia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Xtext-/ANTLR-jar puuttuu p2-välimuistista (`.elkt`, `.elkr` tai mikä tahansa `run.sh`-käynnistys) | `run.sh` päättyy nollasta poikkeavaan koodiin viestillä `bundle <name> not in p2 cache <dir>` (esim. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                       | Aseta `P2_BUNDLES` osoittamaan Tychon p2-välimuistiin, jossa se on, tai aja `build.sh` verkkoyhteydellä, jotta Tycho hakee sen; aja `run.sh` uudelleen. Älä korvaa jareja muualta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Sweep jumittuu tai OOM                                                                            | Tapaus ajaa aikakatkaisuun ja raportoi `timeout` (stderr-rivi nimeää sen); ajo ilman tulosriviä antaa `oracle-error` ja stderriin `sweep: shard <n> run <A or B> exited <code>`; kone swappaa 8 samanaikaisella JVM:llä                                                                         | Vähennä rinnakkaisuutta ja eräkokoa: `sweep.sh --shards 2`, rajaa valitsimilla `--filter` tai `--limit`. Nosta `ELK_SWEEP_TIMEOUT_MS`ia vain mallille, joka on hidas mutta oikea. Toistettava `timeout` on löydös: kirjaa tapauksen id päiväkirjaan, älä laajenna rajaa sen piilottamiseksi                                                                                                                                                                                                                                                                                                                                                                                                        |
| Census-drift pinnin noston jälkeen (`ELK_COMMIT` tai modelsin `commit`)                           | `npx tsx tools/corpus/census.ts` päättyy koodiin `1` ja luettelee eroavat mallit; `test/corpus/census.test.ts` kaatuu                                                                                                                                                                           | Varmista, että klooni ja oraakkeli ovat uusissa pineissä, aja `census.ts --write` uudelleen, tarkista `git diff test/corpus/census.json`, kirjaa syy päiväkirjaan, aja sitten `sweep.sh` uudelleen ja generoi pariteettiraportti uudelleen. Älä koskaan muokkaa censusta käsin                                                                                                                                                                                                                                                                                                                                                                                                                     |
| elk-models puuttuu tai väärä sha                                                                  | Korpustestit ohitetaan viestillä, joka nimeää odotetun shan; `regen-goldens.sh` päättyy koodiin `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                              | Aja `test/corpus/fetch.sh` (kloonaa ja tarkistaa käyttöön kiinnitetyn commitin). Se päättyy koodiin `2`, jos olemassa oleva klooni on toisessa commitissa, eikä koske siihen: korjaa tuo klooni itse tai osoita `ELK_MODELS_DIR` uuteen polkuun. Älä koskaan siirrä olemassa olevan kloonin HEADia skriptistä                                                                                                                                                                                                                                                                                                                                                                                      |

Muut `run.sh`-virheet: `oracle-build.json missing` tai `oracle jar missing`
tarkoittaa, että `build.sh` on ajettava ensin; `bundle <name> not in p2 cache` tarkoittaa, että
`P2_BUNDLES` on asetettava Tychon p2-välimuistiin tai `build.sh` on ajettava uudelleen
verkkoyhteydellä.

## 6. Gate-tarkistukset

Jokainen muutos:

| Gate                | Komento                                                 | Vaatimus                                                                                        |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tyypit              | `npm run typecheck`                                     | poistumiskoodi 0                                                                                |
| Testit ja kattavuus | `npm run coverage`                                      | kaikki testit läpäisevät; 90 % statementit, branchit, funktiot ja rivit alueella `src/**`       |
| Arkkitehtuuri       | `test/architecture/*.fitness.test.ts` (`npm test` ajaa) | moduulirajat, moduulien globaalit, ei Node-sisäänrakennettuja `src/`-hakemistossa, SPDX-otsikot |
| Oraakkelin refit    | `test/golden/oracle-refs.test.ts`                       | tallennetut refit yhdenmukaisia manifestin ja `ELK_COMMIT`in kanssa                             |

Muutokset hakemistoihin `tools/oracle/`, manifestiin tai patch-sarjaan tarvitsevat lisäksi:

| Gate               | Komento                                                                         | Vaatimus                                                                                |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Oraakkelin käännös | `tools/oracle/build.sh`                                                         | poistumiskoodi 0                                                                        |
| Oraakkelin ajo     | `tools/oracle/run.sh <outDir> <input.json>...`                                  | poistumiskoodi 0, ei `ERROR`-rivejä                                                     |
| Golden-vakaus      | `tools/oracle/regen-goldens.sh`, sitten `git diff --exit-code test/golden/refs` | ei diffiä, ellei muutoksen ole tarkoitus siirtää refejä ja se ole kirjattu päiväkirjaan |
| Shell              | `shellcheck tools/oracle/*.sh`                                                  | puhdas                                                                                  |

Muutokset hakemistoihin `tools/oracle/` tai `tools/corpus/` tarvitsevat lisäksi:

| Gate               | Komento                                                                                | Vaatimus                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Census             | `npx tsx tools/corpus/census.ts`                                                       | poistumiskoodi 0 (ei driftiä)                                                                  |
| Generoinnin vakaus | `tools/oracle/regen-generated.sh`, sitten `git diff --exit-code test/corpus/generated` | ei diffiä                                                                                      |
| Sweep              | `tools/oracle/sweep.sh` (tai `--filter`/`--limit` otosta varten)                       | poistumiskoodi 0: ei `oracle-error`ia                                                          |
| Pariteettiraportti | `npx tsx tools/corpus/parity-report.ts`                                                | poistumiskoodi 0 (tallennettu raportti ajan tasalla); generoi uudelleen valitsimella `--write` |
