---
title: Samræmi
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Samræmi: hvað „samsvörun“ þýðir

@knowvah/elk-engine er sannprófað gegn upprunalega Eclipse ELK (Java), byggðu úr
frumkóða. TypeScript-uppröðun er **samræmd** véfréttinni þegar, eftir að báðar hafa verið
lesnar sem ELK JSON, uppbyggingin og sérhvert gildi sem ekki er tala eru nákvæmlega eins og sérhver
endanleg tala er innan algildra vikmarka upp á `1e-6`.
Samanburðartólið er [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
þetta skjal lýsir því sem það útfærir. Yfirfærslureglurnar eru í
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Kafli                                                     | Svarar                                         |
| --- | --------------------------------------------------------- | ---------------------------------------------- |
| 1   | [Véfrétt](#1-véfrétt)                                     | Hvað er „rétt“, og við hvaða commit?           |
| 1a  | [Samræmiseining](#1a-samræmiseining)                      | Hvað er eitt tilvik, og hvaða tilvik eru til?  |
| 2   | [Samræmiskrafa](#2-samræmiskrafa)                         | Hvað telst jafnt?                              |
| 3   | [Golden-tilvik og safn](#3-golden-tilvik-og-safn)         | Hvaðan koma viðmiðunarúttökin?                 |
| 4   | [Seam-plástrar](#4-seam-plástrar)                         | Hvernig breytum við véfréttinni?               |
| 5   | [Rekstur véfréttar](#5-rekstur-véfréttar-verklagshandbók) | Hvað geri ég þegar hún bilar?                  |
| 6   | [Gæðahlið](#6-gæðahlið)                                   | Hvað þarf að standast áður en breyting lendir? |

## 1. Véfrétt

Véfréttin (AD-3) er upprunalega ELK **byggt úr frumkóða** í aðskildu
git-vinnutré af `$ELK_SOURCE_DIR`, sem `tools/oracle/build.sh` býr til í `$ELK_ORACLE_DIR`.
Hvorugt er í þessari hirslu; hvorugt fylgir með.

| Atriði          | Hvar                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| Fest ELK-commit | `tools/oracle/ELK_COMMIT` (nú `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)             |
| Plástraröð      | `tools/oracle/patches/*.patch`, beitt í stafrófsröð með `git am --3way`               |
| Smíði           | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho sækir p2-gripi)                  |
| Runuvinnsla     | `tools/oracle/run.sh <outDir> <input>...` eða `run.sh --cases <cases.jsonl> <outDir>` |
| Prófunarumgjörð | `tools/oracle/harness/ElkOracle.java`                                                 |
| Smíðaskrá       | `$ELK_ORACLE_DIR/oracle-build.json` (commit, plástrar, JDK, jar fyrir hvert bundle)   |

**Smíði.** `build.sh` keyrir `mvn -P elk-meta clean install -DskipTests` (melk-þýðandann) og
síðan `mvn clean install -DskipTests -Dmaven.test.skip=true` úr `build/` í vinnutrénu og skráir
svo jar-skrá hvers bundle sem er innan umfangs (`core`, `graph`, `graph.json`, `alg.common` og
uppröðunaralgrímin `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`) í `oracle-build.json`. Vinnutré sem er til er aðeins endurnýtt
ef það er afkomandi `ELK_COMMIT`, ber nákvæmlega þau plástrsheiti sem eru í
`tools/oracle/patches/` og er hreint fyrir utan smíðaúttak; annars hættir
`build.sh` með `2` og lætur það ósnert.

**Keyrsla.** `run.sh` þýðir `ElkOracle.java` gegn bundle-jar-skránum ásamt
þriðja aðila bundles (Gson, Guava, EMF, Xtext/Xtend-söfn) úr Tycho p2-skyndiminninu
(`P2_BUNDLES`, sjálfgefið `~/.m2/repository/p2/osgi/bundle`; nýjasta útgáfa hvers er notuð).
Ein JVM raðar upp hverju inntaki með `RecursiveGraphLayoutEngine` og skrifar
`<outDir>/<input basename>.json` með uppröðun, núllstærðum og núllstaðsetningum
og án óþekktra uppröðunarvalkosta. Inntak sem mistekst prentar `ERROR <input>: <message>`;
JVM hættir með `1` ef eitthvert inntak mistókst. Grunnheiti inntaka verða að vera einkvæm
innan einnar keyrslu, því úttaksheitið er grunnheitið.

**Merking plástraraðarinnar.** Röðin geymir einn plástur í dag:

| Plástur                                                                 | Áhrif                                                                                                                                                                                                                          | Paraður TS-seam                                                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` leysir árekstra auðkenna með `"_g" + Random.nextInt(1000000)`; plásturinn sáir þetta `Random` úr kerfiseigindinni `org.eclipse.elk.graph.json.exportSeed` (ósett = hegðun ELK). `run.sh` sendir `EXPORT_SEED=1` | Innsprautanlegt `Random` í `graph.json`-yfirfærslunni; bíður þeirrar yfirfærslu (TS-shimið `Random` endurskapar röðina nú þegar: fræ 1 gefur 548985, 764588) |

Plástrar eru aðeins til til að bæta við þröngt afmörkuðum seam-um sem gera hegðun JVM og JS
sambærilega; hver þeirra er paraður við seam TS-megin (4. kafli).

**Hvers vegna ekki elkjs?** elkjs er ELK þýtt með GWT. Það getur ekki borið plástraröðina okkar,
og GWT-hermun JRE víkur frá JVM sem við færum yfir frá. Það er ekki notað
sem véfrétt.

## 1a. Samræmiseining

**Tilvik** er `(algorithm, model, variant)` (D1). Jöfnuðarmælaborðið hefur eina röð fyrir hvert
uppröðunaralgrím; elk-models-mappan og census-eiginleikar eru síur, ekki raðir.

**Auðkenni tilviks.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, til dæmis
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` er auðkenni algrímsins
án `org.eclipse.elk.`. Fyrir mynduð líkön er `modelId` `generated/<name>`.

**Auðkenni líkans og uppruni (D3).** Auðkenni líkans er slóðin í elk-models án endingar.
Tilvik les `.json` ef hún er til, annars `.elkt`; `.elkg` (EMF XMI) er aldrei lesin.

**Afbrigði (D6).** Nefndar valkostayfirlagnir í `test/corpus/variants.json`, beitt á rótina:
`default` (engin), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Þrep         | Algrím                                       | Líkön                              | Afbrigði                |
| ------------ | -------------------------------------------- | ---------------------------------- | ----------------------- |
| native       | `rootAlgorithm` líkansins sjálfs             | sérhvert census-líkan              | öll sjö                 |
| retarget     | sérhvert skráð algrím nema það sem líkanið á | sérhvert census-líkan              | aðeins `default` (OR-1) |
| generated    | algrímið sem skráarforskeytið nefnir         | `test/corpus/generated/*.json`     | öll sjö                 |
| ported JUnit | eftir verkefni hvers algrímis                | JUnit-tilvik úr upprunanum (AD-13) | eins og yfirfært        |

`tools/oracle/run.sh --list-algorithms` er listi yfir auðkenni algríma (14 í dag).

**Retarget (D2).** Prófunarumgjörðin setur `org.eclipse.elk.algorithm` á **sérhvern hnút sem hefur
börn**, og kemur í stað hvers yfirlýsts gildis, og `org.eclipse.elk.randomSeed = 1` á rótina. ELK
leysir algrímið úr á hvern hnút, og hnútur sem er ekki stilltur fellur aftur á layered. Rót án
barna fær aðeins fræið. Retarget-þrepið sleppir `rootAlgorithm` hvers líkans (native-þrepið
nær yfir það).

## 2. Samræmiskrafa

AD-4, nákvæmlega eins og `compareLayout(expected, actual, { tol })` útfærir hana:

| Regla                     | Hegðun                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vikmörk                   | Algild, `DEFAULT_TOLERANCE = 1e-6`; endanlegar tölur standast þegar `abs(e - a) <= tol`                                                                                |
| Ótakmarkaðar tölur        | `NaN` og `±Infinity` verða að vera nákvæmlega jafnar (`Object.is` eða `===`), jafnvel með `tol: Infinity`                                                              |
| Strengir, boolean, `null` | Strangt jafnt, annars `value`                                                                                                                                          |
| Gerðarmisræmi             | Ólíkar JSON-gerðir (`null`, fylki, hlutur, tala, strengur, boolean) gefa eitt `type`-frávik                                                                            |
| Lyklar hlutar             | Lyklasafnið verður að vera eins: lykill aðeins í expected er `missing`, aðeins í actual er `extra`                                                                     |
| Fylki                     | Pöruð **eftir `id`** þegar sérhvert stak beggja vegna er hlutur með streng-`id` og auðkenni eru einkvæm hvorum megin (tómt fylki telst lyklað); annars **eftir stöðu** |
| Lykluð fylki              | Auðkenni öðrum megin eingöngu er `structure`-frávik við `path[id=<id>]`; röð er hunsuð                                                                                 |
| Fylki eftir stöðu         | Lengdarmunur er eitt `structure`-frávik og stök eru ekki borin frekar saman                                                                                            |
| Tegundir frávika          | `structure`, `value`, `type`, `missing`, `extra`; `path` er JSON-slóð að gerð (`children[id=n1].x`)                                                                    |

Afleiðingar: auðkenni þátta, fjöldi þátta, tengingarfræði leggjahluta og fjöldi
beygjupunkta eru nákvæm vegna þess að auðkenni og lengdir fylkja eru nákvæm;
hnit og stærðir fá `1e-6`. `formatDiffs` prentar í mesta lagi 20 frávik.

**Stefna um þekkt frávik.** Frávik er aldrei tekið upp með því að hækka `tol`
eða breyta golden-tilviki (AD-13). Hvert er skráð hér með orsök sinni og prófinu eða
fixture-inu sem það hefur áhrif á. Samþykktir flokkar:

- **ulp-stigs `Math.*`-munur.** V8 og JVM geta verið ólík í síðasta bita í
  `sin`, `cos`, `exp`, `log`, `pow` og skyldum föllum; `StrictMath` í Java er
  skilgreint bitnákvæmt, `Math` ekki. Tilvikið sem þegar kom upp: `nextGaussian`
  er skilgreint þannig að það noti `StrictMath.log`, þannig að `src/java/util/Random.ts` ber
  `StrictMath.log`-nákvæma útfærslu í stað `Math.log`. Kjósið bitnákvæma yfirfærslu á
  `StrictMath`-algrímið fremur en að víkka vikmörk.
- **Ítrun yfir auðkennis-hash (AD-10).** Að ítra yfir `HashMap`/`HashSet` með lyklum sem eru
  hashaðir eftir auðkenni hluta er óákveðið í Java sjálfu. Skráðu staðinn í dagbók
  og færðu yfir með innsetningarröð; golden-tilvik mega ekki ráðast af því.
  Lyklar hashaðir eftir gildi (String, Integer) verða að endurskapa röð Java.
- **Tímasáð `Random`.** Með `randomSeed = 0` sáir ELK úr klukkunni
  (`core/Core.melk:608`), þannig að úttakið er ekki endurtakanlegt. Inntak golden-tilvika verður að
  láta fræið vera ósett eða ekki núll (sjálfgefið fræ layered er `1`).

Tilteknar færslur (bættu við færslu aðeins með samþykki notandans):

| #   | Frávik                       | Orsök                                                                          | Umfang                                                                                                                                                     | Samþykkt                |
| --- | ---------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Texti þáttunarvillumeldingar | ANTLR-meldingar eru hliðarafurðir myndaða þáttarans, sem er aldrei færður yfir | Ógilt málfræðiinntak (`.elkt`, `.elkj`, `.elkr`): aðeins _tilvist_ þáttunarvillu verður að stemma, ekki meldingin. Gilt inntak verður að stemma nákvæmlega | D8, notandi, 2026-10-11 |

**Úrskurðir.** Hvert tilvik fær einn úrskurð út frá tveimur aðskildum JVM-keyrslum véfréttarinnar (D4, D5, OR-2):

| Úrskurður          | Merking                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Báðar keyrslur röðuðu líkaninu upp og úttaksskrárnar eru bæti fyrir bæti eins                                                                                                          |
| `throws`           | Báðar keyrslur köstuðu sömu undantekningu: nákvæmlega sama klasa og nákvæmlega sömu melding eftir að `@[0-9a-f]+` verður `@<hash>` (meldingin má vera null, t.d. `StackOverflowError`) |
| `nondeterministic` | Keyrslurnar ber ekki saman (úttaksbæti, undantekning, eða önnur `ok` og hin `throws`)                                                                                                  |
| `oracle-error`     | Bilun í prófunarumgjörð (ólæsilegt inntak, óþekkt afbrigði/algrím/valkostur, týnd niðurstöðulína); aldrei ásættanlegt                                                                  |
| `timeout`          | Keyrsla fór yfir `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                                |

Forgangur: `oracle-error`, síðan `timeout`, síðan `ok`/`throws` þegar jafnt, annars
`nondeterministic`. Áður en bætin eru borin saman er sérhverju `@[0-9a-f]+`-tákni í báðum úttökum
skipt út fyrir `@<hash>`, eins og í undantekningarmeldingum (D5a; `sameOutput` í `tools/corpus/sweep.ts`).
Orsök: forritunarlegi valkosturinn `debug.discoGraph` í disco flytur út `...DCGraph@<identity hash>`,
sem ekkert fræ getur fest. TS-samanburðartólið beitir sömu útskiptingu. Óákveðin tilvik
eru skráð sér og undanskilin í fjölda þeirra sem standast, í samræmi við
stefnuna um auðkennis-hash hér að ofan.

Raunverulegar uppsprettur `nondeterministic` sem eftir eru (hegðun ELK, ekki bilanir í prófunarumgjörð; fjöldinn er í
jöfnuðarskýrslunni): spore (`ElkGraphImporter.java:169` titrar með `Math.random`) og `random`
(sjálfgefið `randomSeed` 0 er ósáð á hreiðruðum samsettum hnútum; retarget sáir aðeins rótina, D2,
haldið samkvæmt ákvörðun notandans). `_g<random>`-endurnefningar útflytjandans á auðkennum eru ekki uppspretta: seam-plásturinn
lagar þær.

## 3. Golden-tilvik og safn

AD-5. Viðmiðunarúttök eru innrituð svo CI þurfi enga JVM.

| Atriði      | Hvar                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Fast safn   | `eclipse-elk/elk-models` við `commit` í `test/corpus/manifest.json` (fylgir ekki með)           |
| Líkanamappa | `$ELK_MODELS_DIR`, sjálfgefið `../../eclipse-elk/elk-models` miðað við þessa hirslu             |
| Valið mengi | `golden[]` í `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Viðmið      | `test/golden/refs/elk/<id>.json`, eitt fyrir hvert `id` í manifest                              |
| Uppruni     | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Vörpun auðkennis á slóð.** `golden[].path` er miðuð við `$ELK_MODELS_DIR`, og
inntakið er `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` keyrir prófunarumgjörðina á
þessum inntökum og vistar hvert `<basename>.json`-úttak sem `refs/elk/<id>.json`.
Dæmi: auðkennið `ptolemy-scrambler` er
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Endurmyndun** (`tools/oracle/regen-goldens.sh`):

1. Krefst þess að models-klónið sé nákvæmlega á commit-inu í manifest (annars hættir með `1`).
2. Krefst smíðaðrar véfréttar (`run.sh` þarf `oracle-build.json`).
3. Vistar öll viðmið og `_meta.json` í `test/golden/refs/.elk-staging.*` og skiptir svo um
   möppuna með tveimur endurnefningum, þannig að misheppnuð keyrsla skilur gömlu viðmiðin eftir.
4. `_meta.json` hefur enga tímastimpla (`builtAt` helst í `oracle-build.json`), þannig að
   endurmyndun án breytts inntaks er bæti fyrir bæti engin aðgerð í git.

**Hvenær á að endurmynda:** eftir breytingu á `ELK_COMMIT`, plástraröðinni, menginu
`golden[]` eða `commit` í manifest, eða prófunarumgjörðinni. Aldrei annars.

**Dagbókarregla.** Sérhver endurmyndun sem breytir viðmiði er skráð í dagbók með
orsökinni (plástursauðkenninu eða commit-hækkuninni). Viðmið eru aldrei breytt í höndunum. Ef
TS-fullyrðing eða golden-tilvik getur aðeins staðist með því að vera breytt, stöðvaðu og skráðu í dagbók (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` raðar engu upp: það keyrir véfréttina í þáttunarham
yfir öll líkön og ber niðurstöðuna saman við innritaða `test/corpus/census.json` (898
líkön: auðkenni, snið, uppruni, rótaralgrím, eiginleikafjöldi). Hættir með `0` þegar jafnt, `1` við rek;
`--write` endurskrifar skrána. Það keyrir aðeins í fasta models-klóninu og hættir við ef bilun
verður í prófunarumgjörðinni.

**Mynduð söfn (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` geymir sáða
grandom-stillingu; systurskráin `.json` er óuppraðað inntak búið til af véfréttinni. Níu stillingar ná yfir
þau algrímaauðkenni sem ekkert elk-models-líkan notar: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Hver hefur í mesta lagi 50 hnúta og
engin merki á leggjum (`BlindTextGenerator` er ósáð). Prófunarumgjörðin nefnir myndaða rót `root`,
því `JsonExporter` í ELK leysir auðkennisárekstur með ósáðu handahófskenndu viðskeyti. Endurmyndaðu
aðeins með `tools/oracle/regen-generated.sh` (undirbúningsmappa og endurnefning; stilling sem mistekst
skilur gömlu skrárnar eftir); endurkeyrsla án breytinga er engin aðgerð í git. TS-yfirfærsla grandom verður að
endurskapa þessar `.json`-skrár bæti fyrir bæti; golden-tilvik algríma ráðast aldrei af henni.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` skipuleggur hvert tilvik, keyrir hvert tvisvar í aðskildum JVM (shards eru
sjálfgefið `min(cpus, 8)` samhliða `run.sh`-ferli) og skrifar
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` prentar fjölda tilvika eftir þrepi og keyrir ekkert; `--filter` heldur tilvikaauðkennum sem innihalda
textabútinn; `--limit` tekur úrtak með jöfnu bili. Hættir með `0` nema tilvik sé `oracle-error`
(`1`); tólbilun hættir með `2`. Úttök hvers tilviks haldast staðbundin (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(sjálfgefið `30000`, aðeins lesið af `tools/`) takmarkar hvert tilvik; `run.sh` endurræsir JVM eftir
tímamörk (JVM-hætta með kóða 75) fyrir tilvik án niðurstöðulínu.

**Jöfnuðarskýrsla (D9).** `docs/parity-report.md` er mynduð úr sweep-skyndiminninu og innrituð:
fjöldi eftir algrími og úrskurði, með ELK- og models-commit-unum og án tímastimpla. Endurmyndaðu
með `npx tsx tools/corpus/parity-report.ts --write`; án `--write` hættir skipunin með `1`
ef innritaða skýrslan er úrelt. Aldrei breyta henni í höndunum.

**Safnapróf.** `resolveModelsDir()` í `test/corpus/corpus.ts` skilar
`skip`-ástæðu þegar klónið vantar eða er á öðru commit-i; próf sem þurfa það
eru hoppuð yfir, með fasta sha í meldingunni. Í dag athugar `test/golden/oracle-refs.test.ts`
aðeins innrituðu viðmiðin: eitt fyrir hvert auðkenni í manifest, rúmfræði á sérhverjum hnút,
porti, merki og legg, samanburð við sjálft sig, og að `_meta.json` stemmi við
`ELK_COMMIT`, manifest og myndarann. Ekkert TS-á-móti-véfrétt uppröðunarpróf er
til enn; það kemur með fyrsta yfirfærða algríminu.

## 4. Seam-plástrar

Seam-plástrar breyta véfréttinni; þeir eru sjaldgæfir og alltaf paraðir við TS-seam.

1. Breyttu og skráðu í commit í vinnutré véfréttarinnar (`$ELK_ORACLE_DIR`), eða smíðaðu plásturinn í tímabundnu
   klóni við `ELK_COMMIT`. Til að bæta fullgerðum plástri við núverandi vinnutré á staðnum (varðveitir
   skyndiminnin `census/` og `sweep/`, sem eyðast ef vinnutréð er fjarlægt), beittu honum með
   auðkenni `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` sannreynir þá röðina og smíðar aftur á staðnum (um 3 mínútur), þannig að sleppa má skrefum 4-5.
2. Fluttu út:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (eða aðeins nýju commit-in). Skrár heita `NNNN-<slug>.patch`; talnaforskeytið
   ákvarðar röð beitingar.
3. Bættu við samsvarandi TS-seam (sama hegðun, innsprautanlegt, í `src/`), með prófum
   þar sem væntanleg gildi koma úr plástruðu véfréttinni (AD-13).
4. Annars skaltu fjarlægja vinnutréð: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (bættu við `--force` ef smíðaúttak gerir það óhreint).
5. Smíðaðu aftur: `tools/oracle/build.sh` (beitir röðinni upp á nýtt frá grunni).
6. Endurmyndaðu: `tools/oracle/regen-goldens.sh`; yfirfarðu `git diff test/golden/refs`.
7. Skráðu færslu í dagbók sem nefnir plásturinn (`NNNN-<slug>.patch`) og telur upp hvert
   viðmið sem breyttist. `patches` í `_meta.json` skráir röðina sjálfkrafa.

Skildu aldrei eftir óinnritaða breytingu í vinnutrénu: `build.sh` lítur á hana sem úrelta
(hættir með `2`). Breyttu aldrei `ELK_SOURCE_DIR` sjálfu.

## 5. Rekstur véfréttar (verklagshandbók)

| Bilun                                                                                         | Greining                                                                                                                                                                                                                                                            | Úrbót                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-smíði mistekst (p2 næst ekki, JDK, Maven-útgáfa)                                        | `tools/oracle/build.sh` hættir með kóða sem er ekki núll; fullt Maven-úttak er í `.oracle-build.log` í rót hirslunnar. Hætta `1` er verkfæri sem vantar eða rangt Maven; hætta `3` þýðir að bundle-jar var ekki búið til                                            | Maven verður að vera **3.9.x**: Tycho 4.0.12 mistekst á Maven 3.10 (3.10.0 úr Homebrew) með `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Staðbundið 3.9.11 er í `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Notaðu JDK 21, eða JDK 17 í gegnum `JAVA_HOME`. Athugaðu netið (fyrsta keyrsla sækir p2-gripi), keyrðu svo aftur. `build.sh --record-only` sleppir Maven og endurskrifar aðeins `oracle-build.json` úr jar-skrám sem þegar eru smíðaðar. Hætta `2`: fjarlægðu vinnutréð (4. kafli, skref 4) og smíðaðu aftur. Annars skaltu stigmagna með lokum annálsins |
| `build.sh` hættir með `2` strax eftir að plástri er beitt                                     | Vinnutré tilkynnt úrelt                                                                                                                                                                                                                                             | `build.sh` rekur upp brotin plástrsheiti (`git format-patch` brýtur þau yfir um 78 stafi) og hunsar óskráðu skyndiminnin `census/` og `sweep/`; annar óhreinleiki eða plástur sem er ekki á lista gefur áfram hætta `2`: lagaðu vinnutréð (4. kafli)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Golden-rek eftir plástur eða commit-hækkun                                                    | `tools/oracle/regen-goldens.sh` og svo `git diff --exit-code test/golden/refs` er ekki tómt; `test/golden/oracle-refs.test.ts` mistekst á úreltri `_meta.json` (`elkCommit`, `modelsCommit`); TS-samræmispróf, þegar það er til, mistekst með `formatDiffs`-skýrslu | Smíðaðu aftur (`build.sh`), keyrðu `regen-goldens.sh`, yfirfarðu muninn, skráðu plástursauðkennið í dagbók. Breyttu aldrei viðmiði í höndunum né slakaðu á `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Xtext/ANTLR-jar vantar í p2-skyndiminnið (`.elkt`, `.elkr`, eða hvaða ræsing `run.sh` sem er) | `run.sh` hættir með kóða sem er ekki núll og `bundle <name> not in p2 cache <dir>` (t.d. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                       | Stilltu `P2_BUNDLES` á Tycho p2-skyndiminnið sem geymir það, eða keyrðu `build.sh` með netaðgangi svo Tycho sæki það; keyrðu `run.sh` aftur. Settu ekki inn jar-skrár annars staðar frá                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Sweep hangir eða OOM                                                                          | Tilvik keyrir upp að tímamörkum og skilar `timeout` (stderr-lína nefnir það); keyrsla án niðurstöðulínu gefur `oracle-error` og `sweep: shard <n> run <A or B> exited <code>` á stderr; vélin fer að swappa við 8 samhliða JVM                                      | Lækkaðu samhliðun og lotustærð: `sweep.sh --shards 2`, þrengdu með `--filter` eða `--limit`. Hækkaðu `ELK_SWEEP_TIMEOUT_MS` aðeins fyrir líkan sem er hægt en rétt. Endurtakanlegt `timeout` er niðurstaða: skráðu tilvikaauðkennið í dagbók, ekki víkka mörkin til að fela það                                                                                                                                                                                                                                                                                                                                                                                                     |
| Census-rek eftir hækkun festingar (`ELK_COMMIT` eða `commit` models)                          | `npx tsx tools/corpus/census.ts` hættir með `1` og telur upp líkönin sem ber í milli; `test/corpus/census.test.ts` mistekst                                                                                                                                         | Staðfestu að klónið og véfréttin séu á nýju festingunum, keyrðu `census.ts --write` aftur, yfirfarðu `git diff test/corpus/census.json`, skráðu orsökina í dagbók, keyrðu svo `sweep.sh` aftur og endurmyndaðu jöfnuðarskýrsluna. Breyttu aldrei census í höndunum                                                                                                                                                                                                                                                                                                                                                                                                                  |
| elk-models vantar eða röng sha                                                                | Safnapróf eru hoppuð yfir með meldingu sem nefnir væntanlega sha; `regen-goldens.sh` hættir með `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                  | Keyrðu `test/corpus/fetch.sh` (klónar og tékkar út fasta commit-ið). Það hættir með `2` ef klón sem er til er á öðru commit-i og snertir það ekki: lagaðu það klón sjálfur eða bentu `ELK_MODELS_DIR` á nýja slóð. Færðu aldrei HEAD núverandi klóns úr skriftu                                                                                                                                                                                                                                                                                                                                                                                                                     |

Aðrar bilanir í `run.sh`: `oracle-build.json missing` eða `oracle jar missing`
þýðir að keyra `build.sh` fyrst; `bundle <name> not in p2 cache` þýðir að stilla
`P2_BUNDLES` á Tycho p2-skyndiminnið eða keyra `build.sh` aftur með netaðgangi.

## 6. Gæðahlið

Sérhver breyting:

| Hlið             | Skipun                                                      | Krafa                                                                         |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Gerðir           | `npm run typecheck`                                         | exit 0                                                                        |
| Próf og þekja    | `npm run coverage`                                          | öll próf standast; 90% statements, branches, functions og lines yfir `src/**` |
| Arkitektúr       | `test/architecture/*.fitness.test.ts` (keyrt af `npm test`) | einingamörk, einingaglobal, engin Node-innbyggð í `src/`, SPDX-hausar         |
| Viðmið véfréttar | `test/golden/oracle-refs.test.ts`                           | innrituð viðmið samræmd manifest og `ELK_COMMIT`                              |

Breytingar á `tools/oracle/`, manifest eða plástraröðinni þurfa einnig:

| Hlið               | Skipun                                                                         | Krafa                                                                  |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Smíði véfréttar    | `tools/oracle/build.sh`                                                        | exit 0                                                                 |
| Keyrsla véfréttar  | `tools/oracle/run.sh <outDir> <input.json>...`                                 | exit 0, engar `ERROR`-línur                                            |
| Stöðugleiki golden | `tools/oracle/regen-goldens.sh`, síðan `git diff --exit-code test/golden/refs` | enginn munur, nema breytingin eigi að færa viðmið og sé skráð í dagbók |
| Skel               | `shellcheck tools/oracle/*.sh`                                                 | hreint                                                                 |

Breytingar á `tools/oracle/` eða `tools/corpus/` þurfa einnig:

| Hlið                | Skipun                                                                                | Krafa                                                           |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Census              | `npx tsx tools/corpus/census.ts`                                                      | exit 0 (ekkert rek)                                             |
| Stöðugleiki myndaðs | `tools/oracle/regen-generated.sh`, síðan `git diff --exit-code test/corpus/generated` | enginn munur                                                    |
| Sweep               | `tools/oracle/sweep.sh` (eða `--filter`/`--limit` fyrir úrtak)                        | exit 0: ekkert `oracle-error`                                   |
| Jöfnuðarskýrsla     | `npx tsx tools/corpus/parity-report.ts`                                               | exit 0 (innrituð skýrsla núverandi); endurmyndaðu með `--write` |
