---
title: Vastavus
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vastavus: mida tähendab „kokkulangevus“

@knowvah/elk-engine'i valideeritakse lähtekoodist ehitatud upstream'i Eclipse ELK (Java) vastu.
TypeScripti paigutus on oraaklile **vastav**, kui pärast mõlema parsimist ELK JSON-ina on struktuur
ja iga mittenumbriline väärtus täpselt võrdne ning iga lõplik arv langeb kokku absoluutse tolerantsi
`1e-6` piires.
Komparaator on [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
see dokument kirjeldab, mida ta realiseerib. Portimisreeglid asuvad failis
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Jaotis                                            | Vastab küsimusele                                 |
| --- | ------------------------------------------------- | ------------------------------------------------- |
| 1   | [Oraakel](#1-oraakel)                             | Mis on „õige“ ja millise commit'i juures?         |
| 1a  | [Vastavusüksus](#1a-vastavusüksus)                | Mis on üks juhtum ja millised juhtumid on olemas? |
| 2   | [Vastavuskriteerium](#2-vastavuskriteerium)       | Mis loetakse võrdseks?                            |
| 3   | [Goldenid ja korpus](#3-goldenid-ja-korpus)       | Kust pärinevad võrdlusväljundid?                  |
| 4   | [Seam-paigad](#4-seam-paigad)                     | Kuidas me oraaklit muudame?                       |
| 5   | [Oraakli käitamine](#5-oraakli-käitamine-runbook) | Mida teha, kui see läheb katki?                   |
| 6   | [Väravad](#6-väravad)                             | Mis peab läbima enne muudatuse sisseviimist?      |

## 1. Oraakel

Oraakel (AD-3) on upstream'i ELK, **lähtekoodist ehitatud** `$ELK_SOURCE_DIR`-i eraldatud
git-worktree'is, mille `tools/oracle/build.sh` loob asukohta `$ELK_ORACLE_DIR`.
Mõlemad asuvad sellest hoidlast väljaspool; ükski neist ei ole kaasatud.

| Element                | Asukoht                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Fikseeritud ELK commit | `tools/oracle/ELK_COMMIT` (praegu `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)                |
| Paikade seeria         | `tools/oracle/patches/*.patch`, rakendatakse leksikaalses järjekorras käsuga `git am --3way` |
| Ehitus                 | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho laadib alla p2 artefaktid)              |
| Pakettkäitaja          | `tools/oracle/run.sh <outDir> <input>...` või `run.sh --cases <cases.jsonl> <outDir>`        |
| Harness                | `tools/oracle/harness/ElkOracle.java`                                                        |
| Ehituse manifest       | `$ELK_ORACLE_DIR/oracle-build.json` (commit, paigad, JDK, iga bundle'i jar)                  |

**Ehitus.** `build.sh` käivitab `mvn -P elk-meta clean install -DskipTests` (melk-kompilaator) ja
seejärel `mvn clean install -DskipTests -Dmaven.test.skip=true` worktree'i kataloogist `build/`,
ning salvestab siis iga ulatusse kuuluva bundle'i jari faili `oracle-build.json`
(`core`, `graph`, `graph.json`, `alg.common` ning algoritmid `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex`). Olemasolevat worktree'd taaskasutatakse ainult siis, kui see põlvneb
`ELK_COMMIT`-ist, kannab täpselt kataloogi `tools/oracle/patches/` paikade teemarid ja on peale
ehitusväljundi puhas; vastasel korral lõpetab `build.sh` koodiga `2` ja jätab selle puutumata.

**Käitamine.** `run.sh` kompileerib `ElkOracle.java` bundle'i jaride ning kolmandate osapoolte
bundle'ite (Gson, Guava, EMF, Xtext/Xtend teegid) vastu Tycho p2 vahemälust (`P2_BUNDLES`,
vaikimisi `~/.m2/repository/p2/osgi/bundle`; kasutatakse igaühe uusimat versiooni). Üks JVM
paigutab iga sisendi klassiga `RecursiveGraphLayoutEngine` ja kirjutab faili
`<outDir>/<input basename>.json`, milles on paigutus, nullmõõtmed ja nullpositsioonid ning
tundmatud paigutusvalikud on välja jäetud. Ebaõnnestunud sisend trükib
`ERROR <input>: <message>`; JVM lõpetab koodiga `1`, kui mõni sisend ebaõnnestus. Sisendite
baasnimed peavad ühe käivituse piires olema unikaalsed, sest väljundi nimi on baasnimi.

**Paikade seeria semantika.** Seerias on täna üks paik:

| Paik                                                                    | Mõju                                                                                                                                                                                                                                                   | Paariline TS-seam                                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` lahendab id-kollisioonid avaldisega `"_g" + Random.nextInt(1000000)`; paik algväärtustab selle `Random`-i süsteemiomadusest `org.eclipse.elk.graph.json.exportSeed` (määramata = ELK-i käitumine). `run.sh` annab edasi `EXPORT_SEED=1` | Süstitav `Random` `graph.json` portimises; ootab selle portimise valmimist (TS-i `Random` shim reprodutseerib jada juba: seed 1 annab 548985, 764588) |

Paigad on olemas ainult kitsalt piiritletud seamide lisamiseks, mis muudavad JVM-i ja JS-i käitumise
võrreldavaks; igaüks on seotud TS-poolse seamiga (jaotis 4).

**Miks mitte elkjs?** elkjs on GWT-ga kompileeritud ELK. See ei saa kanda meie paikade seeriat ja
GWT JRE emulatsioon erineb JVM-ist, millest me portime. Seda ei kasutata oraaklina.

## 1a. Vastavusüksus

**Juhtum** on `(algorithm, model, variant)` (D1). Paarsuse töölaual on üks rida
paigutusalgoritmi kohta; elk-models'i kaust ja census'e tunnused on filtrid, mitte read.

**Juhtumi id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, näiteks
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` on algoritmi id
ilma `org.eclipse.elk.`-ita. Genereeritud mudelite puhul on `modelId` kujul `generated/<name>`.

**Mudeli id ja allikas (D3).** Mudeli id on tee elk-models'is ilma laiendita.
Juhtum loeb `.json`-i, kui see on olemas, muidu `.elkt`-d; `.elkg`-d (EMF XMI) ei loeta kunagi.

**Variandid (D6).** Nimega valikukattekihid failis `test/corpus/variants.json`, rakendatud juurele:
`default` (puudub), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritm                                 | Mudelid                           | Variandid               |
| ------------ | ---------------------------------------- | --------------------------------- | ----------------------- |
| native       | mudeli enda `rootAlgorithm`              | iga census'e mudel                | kõik seitse             |
| retarget     | iga loetletud algoritm peale mudeli enda | iga census'e mudel                | ainult `default` (OR-1) |
| generated    | faili prefiksiga nimetatud algoritm      | `test/corpus/generated/*.json`    | kõik seitse             |
| ported JUnit | algoritmi missiooni kohta                | upstream'i JUnit-juhtumid (AD-13) | nagu portitud           |

`tools/oracle/run.sh --list-algorithms` on algoritmi id-de loend (täna 14).

**Retarget (D2).** Harness määrab `org.eclipse.elk.algorithm` **igale sõlmele, millel on
lapsi**, asendades iga deklareeritud väärtuse, ning `org.eclipse.elk.randomSeed = 1` juurele. ELK
lahendab algoritmi sõlme kaupa ja määramata sõlm taandub layered'ile. Lasteta juur saab ainult
seemne. Retarget-tier jätab vahele iga mudeli enda `rootAlgorithm`-i (seda katab
native-tier).

## 2. Vastavuskriteerium

AD-4, täpselt nii, nagu `compareLayout(expected, actual, { tol })` seda realiseerib:

| Reegel                         | Käitumine                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerants                      | Absoluutne, `DEFAULT_TOLERANCE = 1e-6`; lõplikud arvud läbivad, kui `abs(e - a) <= tol`                                                                                                 |
| Mittelõplikud arvud            | `NaN` ja `±Infinity` peavad olema täpselt võrdsed (`Object.is` või `===`), isegi kui `tol: Infinity`                                                                                    |
| Stringid, tõeväärtused, `null` | Rangelt võrdsed, muidu `value`                                                                                                                                                          |
| Tüübi mittevastavus            | Erinevad JSON-i liigid (`null`, massiiv, objekt, arv, string, tõeväärtus) annavad ühe `type`-diffi                                                                                      |
| Objekti võtmed                 | Võtmete hulk peab olema identne: ainult expected'is olev võti on `missing`, ainult actual'is olev `extra`                                                                               |
| Massiivid                      | Sobitatakse **`id` järgi**, kui mõlema poole iga element on objekt stringi-`id`-ga ja id-d on poole kohta unikaalsed (tühi massiiv loetakse võtmepõhiseks); muidu **positsiooniliselt** |
| Võtmepõhised massiivid         | Ainult ühel poolel olev id on `structure`-diff kohas `path[id=<id>]`; järjekorda ignoreeritakse                                                                                         |
| Positsioonilised massiivid     | Pikkuse erinevus on üks `structure`-diff ja elemente edasi ei võrrelda                                                                                                                  |
| Diffi liigid                   | `structure`, `value`, `type`, `missing`, `extra`; `path` on JSON-i tee sarnane (`children[id=n1].x`)                                                                                    |

Tagajärjed: elementide id-d, elementide arv, serva sektsioonide topoloogia ja
murdepunktide arv on täpsed, sest id-d ja massiivide pikkused on täpsed;
koordinaadid ja suurused saavad `1e-6`. `formatDiffs` trükib kuni 20 diffi.

**Teadaolevate lahknevuste poliitika.** Lahknevust ei neelata kunagi `tol`-i tõstmisega
ega golden'i muutmisega (AD-13). Igaüks fikseeritakse siin koos põhjusega ning testi või
fikstuuriga, mida see mõjutab. Lubatud klassid:

- **`Math.*` ulp-taseme erinevused.** V8 ja JVM võivad erineda funktsioonide `sin`,
  `cos`, `exp`, `log`, `pow` ja sugulaste viimases bitis; Java `StrictMath` on määratud
  bititäpseks, `Math` mitte. Juba tekkinud juhtum: `nextGaussian`
  on määratud kasutama `StrictMath.log`-i, seetõttu sisaldab `src/java/util/Random.ts`
  `StrictMath.log`-täpset realisatsiooni `Math.log` asemel. Eelistage `StrictMath` algoritmi
  bititäpset portimist tolerantsi laiendamisele.
- **Identiteedi-räsiga itereerimine (AD-10).** Identiteedi-räsiga objektidega võtmestatud
  `HashMap`-i/`HashSet`-i itereerimine on Javas endas mittedeterministlik. Registreerige koht
  päevikusse ja portige lisamisjärjekorraga; goldenid ei tohi sellest sõltuda.
  Väärtuse-räsiga võtmed (String, Integer) peavad reprodutseerima Java järjekorra.
- **Ajaga seemendatud `Random`.** Kui `randomSeed = 0`, seemendab ELK kellast
  (`core/Core.melk:608`), seega väljund ei ole reprodutseeritav. Golden-sisendid peavad jätma
  seemne määramata või nullist erineva (layered'i vaikeseeme on `1`).

Konkreetsed kirjed (lisage ainult kasutaja nõusolekul):

| #   | Lahknevus               | Põhjus                                                                    | Ulatus                                                                                                                                                        | Kinnitatud               |
| --- | ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Parsimisvea teate tekst | ANTLR-i teated on genereeritud parseri artefaktid, mida ei portita kunagi | Vigane grammatikasisend (`.elkt`, `.elkj`, `.elkr`): kokku peab langema ainult parsimisvea _olemasolu_, mitte teade. Kehtiv sisend peab langema täpselt kokku | D8, kasutaja, 2026-10-11 |

**Otsused.** Iga juhtum saab ühe otsuse oraakli kahest eraldi JVM-i käivitusest (D4, D5, OR-2):

| Otsus              | Tähendus                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Mõlemad käivitused paigutasid mudeli ja väljundfailid on baitideni identsed                                                                                                |
| `throws`           | Mõlemad käivitused viskasid sama erandi: täpne klass ja täpne teade pärast seda, kui `@[0-9a-f]+` muudetakse `@<hash>`-iks (teade võib olla null, nt `StackOverflowError`) |
| `nondeterministic` | Käivitused lähevad lahku (väljundi baidid, erand või üks `ok` ja teine `throws`)                                                                                           |
| `oracle-error`     | Harnessi viga (loetamatu sisend, tundmatu variant/algoritm/valik, kadunud tulemusrida); ei ole kunagi vastuvõetav                                                          |
| `timeout`          | Käivitus ületas `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                     |

Eelistusjärjekord: `oracle-error`, siis `timeout`, siis `ok`/`throws`, kui võrdsed, muidu
`nondeterministic`. Enne baitide võrdlust asendatakse iga `@[0-9a-f]+` token mõlemas väljundis
tokeniga `@<hash>`, nagu erandite teadetes (D5a; `sameOutput` failis `tools/corpus/sweep.ts`).
Põhjus: disco programmeeritav valik `debug.discoGraph` ekspordib `...DCGraph@<identity hash>`,
mida ükski seeme ei saa fikseerida. TS-i komparaator rakendab sama asendust. Mittedeterministlikest juhtumitest
teatatakse eraldi ja need jäetakse läbimisarvudest välja, kooskõlas ülaltoodud
identiteedi-räsi poliitikaga.

Tegelikud allesjäävad `nondeterministic` allikad (ELK-i käitumine, mitte harnessi vead; arvud on
paarsuse aruandes): spore (`ElkGraphImporter.java:169` värab kasutades `Math.random`) ja `random`
(vaikimisi `randomSeed` 0 on pesastatud komposiitidel seemendamata; retarget seemendab ainult juure, D2,
säilitatud kasutaja otsusel). Eksportija `_g<random>` id ümbernimetused ei ole allikas: seam-paik
parandab need.

## 3. Goldenid ja korpus

AD-5. Võrdlusväljundid on commit'itud, et CI ei vajaks JVM-i.

| Element            | Asukoht                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Fikseeritud korpus | `eclipse-elk/elk-models` väljal `commit` failis `test/corpus/manifest.json` (ei ole kaasatud)   |
| Mudelite kataloog  | `$ELK_MODELS_DIR`, vaikimisi `../../eclipse-elk/elk-models` selle hoidla suhtes                 |
| Kureeritud hulk    | `golden[]` failis `test/corpus/manifest.json`: `{ id, path, note }`                             |
| Refid              | `test/golden/refs/elk/<id>.json`, üks manifesti `id` kohta                                      |
| Päritolu           | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Id-st teele kaardistamine.** `golden[].path` on suhteline `$ELK_MODELS_DIR`-i suhtes ja
sisend on `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` käivitab harnessi nendel sisenditel
ja paigutab iga `<basename>.json` väljundi kui `refs/elk/<id>.json`.
Näide: id `ptolemy-scrambler` on
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenereerimine** (`tools/oracle/regen-goldens.sh`):

1. Nõuab, et models'i klooni commit oleks täpselt manifesti commit (muidu väljumiskood `1`).
2. Nõuab ehitatud oraaklit (`run.sh` vajab `oracle-build.json`).
3. Paigutab kõik refid ja `_meta.json` kataloogi `test/golden/refs/.elk-staging.*`, seejärel
   vahetab kataloogi kahe ümbernimetamisega, nii et ebaõnnestunud käivitus jätab vanad refid.
4. `_meta.json` ei sisalda ajatempleid (`builtAt` jääb faili `oracle-build.json`), seega on
   regenereerimine ilma muutunud sisenditeta gitis baitideni no-op.

**Millal regenereerida:** pärast `ELK_COMMIT`-i, paikade seeria, manifesti `golden[]` hulga või
`commit`'i või harnessi muutmist. Muul ajal mitte kunagi.

**Päevikureegel.** Iga regenereerimine, mis muudab ref'i, registreeritakse päevikus koos
põhjusega (paiga id või commit'i tõstmine). Refe ei redigeerita kunagi käsitsi. Kui TS-i
väide või golden saab läbida ainult muutmise teel, peatuge ja registreerige päevikus (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` ei paiguta midagi: see käivitab oraakli parsimisrežiimis
üle kõigi mudelite ja võrdleb tulemust commit'itud `test/corpus/census.json`-iga (898
mudelit: id, vormingud, allikas, juurealgoritm, tunnuste arvud). Väljumiskood `0` võrdsuse korral, `1` triivi korral;
`--write` kirjutab faili ümber. See töötab ainult fikseeritud models'i kloonis ja katkestab
harnessi vea korral.

**Genereeritud korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` sisaldab seemendatud
grandom-konfiguratsiooni; selle kõrval olev `.json` on oraakli genereeritud, paigutamata sisend. Üheksa konfiguratsiooni katavad
algoritmi id-d, mida ükski elk-models'i mudel ei kasuta: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Igaühes on kuni 50 sõlme ja
servasilte pole (`BlindTextGenerator` on seemendamata). Harness nimetab genereeritud juure `root`,
sest ELK-i `JsonExporter` lahendab id-kollisiooni seemendamata juhusliku järelliitega. Regenereerige
ainult käsuga `tools/oracle/regen-generated.sh` (vahekataloog ja ümbernimetamine; ebaõnnestunud konfiguratsioon
jätab vanad failid); kordusjooksutus ilma muudatusteta on gitis no-op. TS-i grandom-portimine peab
neid `.json`-faile reprodutseerima baitideni; algoritmide goldenid ei sõltu sellest kunagi.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planeerib iga juhtumi, käivitab igaühe kaks korda eraldi JVM-ides (shardide
vaikearv on `min(cpus, 8)` samaaegset `run.sh` protsessi) ja kirjutab
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` trükib juhtumite arvud tier'i kaupa ega käivita midagi; `--filter` jätab alles juhtumi id-d, mis sisaldavad
alamstringi; `--limit` võtab ühtlase sammuga valimi. Väljumiskood `0`, välja arvatud kui juhtum on `oracle-error`
(`1`); tööriista tõrge lõpetab koodiga `2`. Juhtumipõhised väljundid jäävad lokaalseks (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(vaikimisi `30000`, loeb ainult `tools/`) piirab iga juhtumit; `run.sh` taaskäivitab JVM-i pärast
ajalõppu (JVM-i väljumiskood 75) juhtumitel, millel puudub tulemusrida.

**Paarsuse aruanne (D9).** `docs/parity-report.md` genereeritakse sweep'i vahemälust ja commit'itakse:
arvud algoritmi ja otsuse kaupa, koos ELK-i ja models'i commit'idega ning ilma ajatempliteta. Regenereerige
käsuga `npx tsx tools/corpus/parity-report.ts --write`; ilma `--write`'ita lõpetab käsk koodiga `1`,
kui commit'itud aruanne on aegunud. Ärge redigeerige seda kunagi käsitsi.

**Korpuse testid.** `resolveModelsDir()` failis `test/corpus/corpus.ts` tagastab
`skip`-põhjuse, kui klooni pole või see on teisel commit'il; seda vajavad testid
jäetakse vahele, teates fikseeritud sha. Täna kontrollib `test/golden/oracle-refs.test.ts`
ainult commit'itud refe: üks manifesti id kohta, geomeetria igal sõlmel, pordil, sildil ja serval,
enda-võrdlus ning et `_meta.json` ühtib `ELK_COMMIT`-i, manifesti ja generaatoriga. TS-vs-oraakel
paigutustesti veel pole; see tuleb esimese portitud algoritmiga.

## 4. Seam-paigad

Seam-paigad muudavad oraaklit; need on haruldased ja alati seotud TS-seamiga.

1. Redigeerige ja commit'ige oraakli worktree'is (`$ELK_ORACLE_DIR`) või koostage paik
   ajutises kloonis kohas `ELK_COMMIT`. Valmis paiga lisamiseks olemasolevasse worktree'sse kohapeal (säilitab
   vahemälud `census/` ja `sweep/`, mille worktree'i eemaldamine kustutab) rakendage see
   `build.sh`-i identiteediga:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` kontrollib seejärel seeriat ja ehitab kohapeal uuesti (umbes 3 minutit), seega võib sammud 4-5
   vahele jätta.
2. Eksportige:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (või ainult uued commit'id). Failide nimed on `NNNN-<slug>.patch`; numbriline
   prefiks määrab rakendamise järjekorra.
3. Lisage sobiv TS-seam (sama käitumine, süstitav, kataloogis `src/`) testidega,
   mille oodatavad väärtused pärinevad paigatud oraaklist (AD-13).
4. Muul juhul eemaldage worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (lisage `--force`, kui ehitusväljund teeb selle määrdunuks).
5. Ehitage uuesti: `tools/oracle/build.sh` (rakendab seeria otsast peale).
6. Regenereerige: `tools/oracle/regen-goldens.sh`; vaadake üle `git diff test/golden/refs`.
7. Kirjutage päevikukirje, mis nimetab paiga (`NNNN-<slug>.patch`) ja loetleb iga
   muutunud ref'i. `_meta.json` väli `patches` fikseerib seeria automaatselt.

Ärge jätke worktree'sse kunagi commit'imata muudatust: `build.sh` käsitleb seda aegununa
(väljumiskood `2`). Ärge redigeerige kunagi `ELK_SOURCE_DIR` ennast.

## 5. Oraakli käitamine (runbook)

| Tõrge                                                                                | Tuvastamine                                                                                                                                                                                                                                                                                  | Leevendus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho ehitus ebaõnnestub (p2 kättesaamatu, JDK, Maven-i versioon)                    | `tools/oracle/build.sh` lõpetab nullist erineva koodiga; täielik Maveni väljund on failis `.oracle-build.log` hoidla juurkataloogis. Kood `1` on puuduv tööriist või vale Maven; kood `3` tähendab, et bundle'i jari ei loodud                                                               | Maven peab olema **3.9.x**: Tycho 4.0.12 ebaõnnestub Maven 3.10-ga (Homebrew 3.10.0) veaga `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Kohalik 3.9.11 asub kataloogis `.tools/apache-maven-3.9.11/` (gitignore'is): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Kasutage JDK 21 või JDK 17 muutuja `JAVA_HOME` kaudu. Kontrollige võrku (esimene käivitus laadib alla p2 artefakte), seejärel käivitage uuesti. `build.sh --record-only` jätab Maveni vahele ja kirjutab ümber ainult `oracle-build.json` juba ehitatud jaridest. Kood `2`: eemaldage worktree (jaotis 4, samm 4) ja ehitage uuesti. Muul juhul eskaleerige logi lõpuga |
| `build.sh` lõpetab koodiga `2` kohe pärast paiga rakendamist                         | Worktree teatatud aegunuks                                                                                                                                                                                                                                                                   | `build.sh` lahtivolditab murtud paikade teemarid (`git format-patch` murrab need umbes 78 märgi juures) ja ignoreerib jälgimata vahemälusid `census/` ja `sweep/`; muu praht või loetlemata paik annab endiselt koodi `2`: parandage worktree (jaotis 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Golden-triiv pärast paika või commit'i tõstmist                                      | `tools/oracle/regen-goldens.sh` ja sellele järgnev `git diff --exit-code test/golden/refs` ei ole tühi; `test/golden/oracle-refs.test.ts` ebaõnnestub aegunud `_meta.json`-i korral (`elkCommit`, `modelsCommit`); TS-i vastavustest, kui see on olemas, ebaõnnestub `formatDiffs` aruandega | Ehitage uuesti (`build.sh`), käivitage `regen-goldens.sh`, vaadake diff üle, registreerige päevikus paiga id. Ärge redigeerige ref'i käsitsi ega leevendage `tol`-i                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Xtexti/ANTLR-i jar puudub p2 vahemälust (`.elkt`, `.elkr` või iga `run.sh` käivitus) | `run.sh` lõpetab nullist erineva koodiga teatega `bundle <name> not in p2 cache <dir>` (nt `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                              | Määrake `P2_BUNDLES` Tycho p2 vahemälule, milles see on, või käivitage `build.sh` võrguühendusega, et Tycho selle tooks; käivitage `run.sh` uuesti. Ärge asendage jare mujalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sweep jääb rippuma või OOM                                                           | Juhtum töötab ajalõpuni ja teatab `timeout` (stderr-i rida nimetab selle); käivitus ilma tulemusreata annab `oracle-error` ja stderr-is `sweep: shard <n> run <A or B> exited <code>`; masin kasutab 8 samaaegse JVM-i korral swap'i                                                         | Vähendage paralleelsust ja partii suurust: `sweep.sh --shards 2`, kitsendage valikuga `--filter` või `--limit`. Tõstke `ELK_SWEEP_TIMEOUT_MS` ainult mudeli jaoks, mis on aeglane, kuid õige. Reprodutseeritav `timeout` on leid: registreerige päevikus juhtumi id, ärge laiendage piiri selle peitmiseks                                                                                                                                                                                                                                                                                                                                                                                                 |
| Census'e triiv pärast pin'i tõstmist (`ELK_COMMIT` või models'i `commit`)            | `npx tsx tools/corpus/census.ts` lõpetab koodiga `1` ja loetleb erinevad mudelid; `test/corpus/census.test.ts` ebaõnnestub                                                                                                                                                                   | Veenduge, et klooni ja oraakel on uutel pin'idel, käivitage `census.ts --write` uuesti, vaadake üle `git diff test/corpus/census.json`, registreerige põhjus päevikus, seejärel käivitage `sweep.sh` uuesti ja regenereerige paarsuse aruanne. Ärge redigeerige census't käsitsi                                                                                                                                                                                                                                                                                                                                                                                                                           |
| elk-models puudub või vale sha                                                       | Korpuse testid jäetakse vahele teatega, mis nimetab oodatud sha; `regen-goldens.sh` lõpetab koodiga `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                       | Käivitage `test/corpus/fetch.sh` (kloonib ja checkout'ib fikseeritud commit'i). See lõpetab koodiga `2`, kui olemasolev kloon on teisel commit'il, ega puutu seda: parandage see kloon ise või suunake `ELK_MODELS_DIR` uuele teele. Ärge liigutage olemasoleva klooni HEAD-i kunagi skriptist                                                                                                                                                                                                                                                                                                                                                                                                             |

Muud `run.sh` tõrked: `oracle-build.json missing` või `oracle jar missing`
tähendab, et käivitage esmalt `build.sh`; `bundle <name> not in p2 cache` tähendab, et määrake
`P2_BUNDLES` Tycho p2 vahemälule või käivitage `build.sh` uuesti võrguühendusega.

## 6. Väravad

Iga muudatus:

| Värav          | Käsk                                                        | Kriteerium                                                                                       |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tüübid         | `npm run typecheck`                                         | väljumiskood 0                                                                                   |
| Testid ja kate | `npm run coverage`                                          | kõik testid läbivad; 90% statements, branches, functions ja lines kataloogis `src/**`            |
| Arhitektuur    | `test/architecture/*.fitness.test.ts` (käivitab `npm test`) | mooduli piirid, mooduli globaalid, Node'i sisseehitatud moodulid puuduvad `src/`-is, SPDX-päised |
| Oraakli refid  | `test/golden/oracle-refs.test.ts`                           | commit'itud refid ühtivad manifesti ja `ELK_COMMIT`-iga                                          |

Muudatused kataloogis `tools/oracle/`, manifestis või paikade seerias vajavad lisaks:

| Värav               | Käsk                                                                              | Kriteerium                                                                  |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Oraakli ehitus      | `tools/oracle/build.sh`                                                           | väljumiskood 0                                                              |
| Oraakli käivitus    | `tools/oracle/run.sh <outDir> <input.json>...`                                    | väljumiskood 0, `ERROR`-ridu pole                                           |
| Golden'i stabiilsus | `tools/oracle/regen-goldens.sh`, seejärel `git diff --exit-code test/golden/refs` | diffi pole, välja arvatud kui muudatus peabki refe liigutama ja on päevikus |
| Shell               | `shellcheck tools/oracle/*.sh`                                                    | puhas                                                                       |

Muudatused kataloogis `tools/oracle/` või `tools/corpus/` vajavad lisaks:

| Värav                   | Käsk                                                                                     | Kriteerium                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Census                  | `npx tsx tools/corpus/census.ts`                                                         | väljumiskood 0 (triivi pole)                                                        |
| Genereeritud stabiilsus | `tools/oracle/regen-generated.sh`, seejärel `git diff --exit-code test/corpus/generated` | diffi pole                                                                          |
| Sweep                   | `tools/oracle/sweep.sh` (või `--filter`/`--limit` valimi jaoks)                          | väljumiskood 0: `oracle-error` puudub                                               |
| Paarsuse aruanne        | `npx tsx tools/corpus/parity-report.ts`                                                  | väljumiskood 0 (commit'itud aruanne on ajakohane); regenereerige valikuga `--write` |
