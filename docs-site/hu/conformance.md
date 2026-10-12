---
title: Megfelelőség
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Megfelelőség: mit jelent az „egyezés”

A @knowvah/elk-engine validálása a forrásból fordított upstream Eclipse ELK (Java) ellen történik. Egy
TypeScript-elrendezés akkor **megfelelő** az orákulummal, ha mindkettő ELK JSON-ként történt
feldolgozása után a struktúra és minden nem numerikus érték pontosan egyenlő, és minden véges szám
`1e-6` abszolút tűréssel egyezik.
Az összehasonlító a [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
ez a dokumentum azt írja le, amit megvalósít. A portolási szabályok a
[`docs/translation-rules.md`](/guide/translation-rules) oldalon találhatók.

| #   | Szakasz                                                 | Mire felel                                           |
| --- | ------------------------------------------------------- | ---------------------------------------------------- |
| 1   | [Orákulum](#1-orákulum)                                 | Mi a „helyes”, és melyik commitnál?                  |
| 1a  | [Megfelelőségi egység](#1a-megfelelőségi-egység)        | Mi egy eset, és milyen esetek léteznek?              |
| 2   | [Megfelelőségi mérce](#2-megfelelőségi-mérce)           | Mi számít egyenlőnek?                                |
| 3   | [Goldenek és korpusz](#3-goldenek-és-korpusz)           | Honnan származnak a referenciakimenetek?             |
| 4   | [Seam-patchek](#4-seam-patchek)                         | Hogyan módosítjuk az orákulumot?                     |
| 5   | [Orákulum-üzemeltetés](#5-orákulum-üzemeltetés-runbook) | Mit tegyek, ha elromlik?                             |
| 6   | [Gate-ek](#6-gate-ek)                                   | Minek kell sikerülnie egy módosítás beemelése előtt? |

## 1. Orákulum

Az orákulum (AD-3) az upstream ELK, **forrásból fordítva** a `$ELK_SOURCE_DIR` leválasztott
git-worktree-jében, amelyet a `tools/oracle/build.sh` hoz létre a `$ELK_ORACLE_DIR` alatt.
Mindkettő ezen a tárolón kívül van; egyiket sem szállítjuk a tárolóval.

| Elem                 | Hely                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Rögzített ELK-commit | `tools/oracle/ELK_COMMIT` (jelenleg `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)             |
| Patch-sorozat        | `tools/oracle/patches/*.patch`, lexikális sorrendben, `git am --3way` paranccsal alkalmazva |
| Build                | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; a Tycho p2-artefaktumokat tölt le)           |
| Kötegelt futtató     | `tools/oracle/run.sh <outDir> <input>...` vagy `run.sh --cases <cases.jsonl> <outDir>`      |
| Harness              | `tools/oracle/harness/ElkOracle.java`                                                       |
| Build-manifeszt      | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patchek, JDK, bundle-önként jar)               |

**Build.** A `build.sh` lefuttatja a `mvn -P elk-meta clean install -DskipTests` parancsot (a melk
fordító), majd a `mvn clean install -DskipTests -Dmaven.test.skip=true` parancsot a worktree `build/`
könyvtárából, végül minden hatókörbe tartozó bundle jarját rögzíti az `oracle-build.json` fájlban
(`core`, `graph`, `graph.json`, `alg.common`, valamint a `layered`, `mrtree`, `radial`, `force`,
`disco`, `rectpacking`, `spore`, `topdownpacking`, `vertiflex` algoritmusok). Egy meglévő worktree-t
csak akkor használ újra, ha az `ELK_COMMIT`-ból származik, pontosan a `tools/oracle/patches/`
könyvtár patch-tárgysorait hordozza, és a build kimenetét leszámítva tiszta; ellenkező esetben a
`build.sh` `2` kóddal kilép, és érintetlenül hagyja.

**Futtatás.** A `run.sh` lefordítja az `ElkOracle.java` fájlt a bundle-jarok és a harmadik féltől
származó bundle-ök (Gson, Guava, EMF, Xtext/Xtend-könyvtárak) ellen a Tycho p2-gyorsítótárból
(`P2_BUNDLES`, alapértelmezés `~/.m2/repository/p2/osgi/bundle`; mindegyikből a legújabb verzió
kerül felhasználásra). Egyetlen JVM a `RecursiveGraphLayoutEngine` segítségével elrendezi az összes
bemenetet, és a `<outDir>/<input basename>.json` fájlt írja az elrendezéssel, a nulla méretekkel és
a nulla pozíciókkal együtt; az ismeretlen elrendezési opciókat kihagyja. Egy sikertelen bemenet
`ERROR <input>: <message>` sort nyomtat; a JVM `1` kóddal lép ki, ha bármelyik bemenet sikertelen
volt. A bemenetek alapneveinek egyetlen futáson belül egyedinek kell lenniük, mivel a kimenet neve
az alapnév.

**A patch-sorozat szemantikája.** A sorozat ma egy patchet tartalmaz:

| Patch                                                                   | Hatás                                                                                                                                                                                                                                                                        | Párosított TS-seam                                                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | A `JsonExporter` az azonosító-ütközéseket `"_g" + Random.nextInt(1000000)` értékkel oldja fel; a patch ezt a `Random`-ot az `org.eclipse.elk.graph.json.exportSeed` rendszertulajdonságból seedeli (beállítatlan = ELK-viselkedés). A `run.sh` `EXPORT_SEED=1` értéket ad át | Injektálható `Random` a `graph.json` portolásban; a portolásig függőben (a TS `Random` shim már reprodukálja a sorozatot: az 1-es seed 548985-öt, 764588-at ad) |

Patchek csak szűken körülhatárolt seamek hozzáadására léteznek, amelyek a JVM és a JS viselkedését
összehasonlíthatóvá teszik; mindegyik párosítva van egy TS-oldali seammel (4. szakasz).

**Miért nem elkjs?** Az elkjs GWT-vel fordított ELK. Nem képes hordozni a patch-sorozatunkat, és a
JRE GWT-emulációja eltér attól a JVM-től, amelyből portolunk. Nem használjuk orákulumként.

## 1a. Megfelelőségi egység

Egy **eset** a `(algorithm, model, variant)` hármas (D1). A paritás-irányítópulton elrendezési
algoritmusonként egy sor van; az elk-models mappa és a census jellemzői szűrők, nem sorok.

**Eset-azonosító.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, például
`native/layered/default/tickets/layered/546_borderGaps`. Az `algorithmSuffix` az algoritmus-azonosító
az `org.eclipse.elk.` nélkül. Generált modelleknél a `modelId` `generated/<name>`.

**Modellazonosító és forrás (D3).** A modellazonosító az elk-models-beli útvonal kiterjesztés nélkül.
Egy eset a `.json` fájlt olvassa, ha van, különben az `.elkt` fájlt; az `.elkg` (EMF XMI) fájlt soha nem olvassa.

**Változatok (D6).** Elnevezett opciófedvények a `test/corpus/variants.json` fájlban, a gyökéren alkalmazva:
`default` (nincs), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmus                                           | Modellek                       | Változatok            |
| ------------ | ---------------------------------------------------- | ------------------------------ | --------------------- |
| native       | a modell saját `rootAlgorithm`-ja                    | minden census-modell           | mind a hét            |
| retarget     | minden felsorolt algoritmus a modell sajátját kivéve | minden census-modell           | csak `default` (OR-1) |
| generated    | a fájlelőtag által megnevezett algoritmus            | `test/corpus/generated/*.json` | mind a hét            |
| ported JUnit | algoritmus-misszionként                              | upstream JUnit-esetek (AD-13)  | ahogy portolva        |

A `tools/oracle/run.sh --list-algorithms` az algoritmus-azonosítók listája (ma 14).

**Retarget (D2).** A harness az `org.eclipse.elk.algorithm` opciót **minden olyan csomóponton beállítja,
amelynek vannak gyermekei**, felülírva bármely deklarált értéket, a gyökéren pedig az
`org.eclipse.elk.randomSeed = 1` értéket. Az ELK csomópontonként oldja fel az algoritmust, és egy beállítatlan
csomópont a layeredre esik vissza. A gyermek nélküli gyökér csak a seedet kapja. A retarget tier kihagyja
minden modell saját `rootAlgorithm`-ját (a native tier lefedi).

## 2. Megfelelőségi mérce

AD-4, pontosan úgy, ahogyan a `compareLayout(expected, actual, { tol })` megvalósítja:

| Szabály                     | Viselkedés                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tűrés                       | Abszolút, `DEFAULT_TOLERANCE = 1e-6`; a véges számok megfelelnek, ha `abs(e - a) <= tol`                                                                                                             |
| Nem véges számok            | A `NaN` és a `±Infinity` pontosan egyenlő kell legyen (`Object.is` vagy `===`), még `tol: Infinity` mellett is                                                                                       |
| Stringek, booleanok, `null` | Szigorúan egyenlő, különben `value`                                                                                                                                                                  |
| Típuseltérés                | Eltérő JSON-fajták (`null`, tömb, objektum, szám, string, boolean) egyetlen `type` diffet adnak                                                                                                      |
| Objektumkulcsok             | A kulcshalmaznak azonosnak kell lennie: csak az expectedben szereplő kulcs `missing`, csak az actualban szereplő `extra`                                                                             |
| Tömbök                      | **`id` alapján** párosítva, ha mindkét oldalon minden elem string `id`-vel rendelkező objektum, és az azonosítók oldalanként egyediek (az üres tömb kulcsosnak számít); különben **pozíció szerint** |
| Kulcsos tömbök              | Az egyik oldalon egyedül szereplő azonosító `structure` diff a `path[id=<id>]` helyen; a sorrend figyelmen kívül marad                                                                               |
| Pozicionális tömbök         | A hosszkülönbség egyetlen `structure` diff, és az elemeket nem hasonlítja tovább                                                                                                                     |
| Diff-fajták                 | `structure`, `value`, `type`, `missing`, `extra`; a `path` JSON-útvonalszerű (`children[id=n1].x`)                                                                                                   |

Következmények: az elemazonosítók, az elemszámok, az élszakasz-topológia és a töréspontok száma
pontos, mert az azonosítók és a tömbhosszak pontosak; a koordináták és méretek `1e-6` tűrést kapnak.
A `formatDiffs` legfeljebb 20 diffet nyomtat.

**Ismert eltérések szabályzata.** Az eltérést soha nem nyeljük el a `tol` növelésével vagy egy golden
szerkesztésével (AD-13). Mindegyiket itt rögzítjük az okával, valamint az érintett teszttel vagy
fixture-rel. Elfogadott osztályok:

- **Ulp-szintű `Math.*` eltérések.** A V8 és a JVM eltérhet a `sin`, `cos`, `exp`, `log`, `pow` és
  rokonaik utolsó bitjében; a Java `StrictMath` bitpontosan specifikált, a `Math` nem. Az már
  előfordult eset: a `nextGaussian` specifikációja szerint `StrictMath.log`-ot használ, ezért a
  `src/java/util/Random.ts` a `Math.log` helyett `StrictMath.log`-pontos megvalósítást tartalmaz. A
  `StrictMath` algoritmus bitpontos portolása előnyben részesítendő a tűrés szélesítésével szemben.
- **Identitás-hash iteráció (AD-10).** Az identitás-hashelt objektumokkal kulcsolt `HashMap`/`HashSet`
  bejárása magában a Javában is nemdeterminisztikus. A helyet naplózni kell, és beszúrási sorrenddel
  portolni; a goldenek nem függhetnek tőle. Az érték-hashelt kulcsoknak (String, Integer) a Java
  sorrendjét kell reprodukálniuk.
- **Idővel seedelt `Random`.** `randomSeed = 0` esetén az ELK az órából seedel
  (`core/Core.melk:608`), így a kimenet nem reprodukálható. A golden bemenetek hagyják a seedet
  beállítatlanul vagy nullától eltérően (a layered alapértelmezett seedje `1`).

Konkrét bejegyzések (csak a felhasználó jóváhagyásával adható hozzá):

| #   | Eltérés                        | Ok                                                                             | Hatókör                                                                                                                                                                     | Jóváhagyva                  |
| --- | ------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Értelmezési hibaüzenet szövege | Az ANTLR-üzenetek a generált parser melléktermékei, amelyet soha nem portolunk | Érvénytelen grammatikai bemenet (`.elkt`, `.elkj`, `.elkr`): csak az értelmezési hiba _megléte_ kell egyezzen, az üzenet nem. Az érvényes bemenetnek pontosan egyeznie kell | D8, felhasználó, 2026-10-11 |

**Ítéletek.** Minden eset egy ítéletet kap az orákulum két külön JVM-futásából (D4, D5, OR-2):

| Ítélet             | Jelentés                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Mindkét futás elrendezte a modellt, és a kimeneti fájlok bájtra azonosak                                                                                                                                  |
| `throws`           | Mindkét futás ugyanazt a kivételt dobta: pontosan ugyanaz az osztály, és pontosan ugyanaz az üzenet, miután az `@[0-9a-f]+` értéke `@<hash>` lett (az üzenet lehet null, pl. `StackOverflowError` esetén) |
| `nondeterministic` | A futások eltérnek (kimeneti bájtok, kivétel, vagy az egyik `ok`, a másik `throws`)                                                                                                                       |
| `oracle-error`     | Harness-hiba (olvashatatlan bemenet, ismeretlen változat/algoritmus/opció, elveszett eredménysor); soha nem elfogadható                                                                                   |
| `timeout`          | Egy futás túllépte az `ELK_SWEEP_TIMEOUT_MS` értéket                                                                                                                                                      |

Elsőbbség: `oracle-error`, majd `timeout`, majd `ok`/`throws`, ha egyenlő, különben
`nondeterministic`. A bájtösszehasonlítás előtt mindkét kimenetben minden `@[0-9a-f]+` tokent
`@<hash>` értékre cserélünk, ahogyan a kivételüzenetekben is (D5a; `sameOutput` a
`tools/corpus/sweep.ts` fájlban). Ok: a disco programozott `debug.discoGraph` opciója
`...DCGraph@<identity hash>` értéket exportál, amelyet semmilyen seed nem tud rögzíteni. A TS-összehasonlító
ugyanezt a cserét alkalmazza. A nemdeterminisztikus eseteket külön jelentjük, és kizárjuk a sikeres
esetek számából, összhangban a fenti identitás-hash szabályzattal.

A `nondeterministic` valódi megmaradt forrásai (ELK-viselkedés, nem harness-hibák; a számok a
paritásjelentésben vannak): a spore (az `ElkGraphImporter.java:169` a `Math.random` segítségével
zajt ad hozzá) és a `random` (az alapértelmezett 0 `randomSeed` beágyazott összetett csomópontokon
seedeletlen; a retarget csak a gyökeret seedeli, D2, felhasználói döntéssel megtartva). Az exportáló
`_g<random>` azonosító-átnevezései nem forrás: a seam-patch javítja őket.

## 3. Goldenek és korpusz

AD-5. A referenciakimenetek be vannak commitolva, hogy a CI-nek ne legyen szüksége JVM-re.

| Elem              | Hely                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Rögzített korpusz | `eclipse-elk/elk-models` a `test/corpus/manifest.json` `commit` értékénél (nem szállítjuk)      |
| Modellkönyvtár    | `$ELK_MODELS_DIR`, alapértelmezés `../../eclipse-elk/elk-models` e tárolóhoz képest             |
| Kurált halmaz     | `golden[]` a `test/corpus/manifest.json` fájlban: `{ id, path, note }`                          |
| Refek             | `test/golden/refs/elk/<id>.json`, manifeszt-`id`-nként egy                                      |
| Származás         | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Azonosító–útvonal leképezés.** A `golden[].path` a `$ELK_MODELS_DIR`-hez képest relatív, és
a bemenet a `$ELK_MODELS_DIR/<path>`. A `regen-goldens.sh` lefuttatja a harnesst ezeken a bemeneteken,
és minden `<basename>.json` kimenetet `refs/elk/<id>.json` néven helyez el.
Példa: a `ptolemy-scrambler` azonosító a
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json` fájlnak felel meg.

**Újragenerálás** (`tools/oracle/regen-goldens.sh`):

1. Megköveteli, hogy a models-klón pontosan a manifeszt commitján álljon (különben `1` kilépési kód).
2. Megköveteli a lefordított orákulumot (a `run.sh`-nak szüksége van az `oracle-build.json` fájlra).
3. Az összes refet és a `_meta.json` fájlt a `test/golden/refs/.elk-staging.*` könyvtárban készíti elő,
   majd két átnevezéssel cseréli le a könyvtárat, így egy sikertelen futás a régi refeket hagyja.
4. A `_meta.json` nem tartalmaz időbélyegeket (a `builtAt` az `oracle-build.json` fájlban marad), így
   a változatlan bemenetekkel végzett újragenerálás gitben bájtról bájtra no-op.

**Mikor kell újragenerálni:** az `ELK_COMMIT`, a patch-sorozat, a manifeszt `golden[]` halmaza vagy
`commit` értéke, illetve a harness módosítása után. Máskor soha.

**Naplózási szabály.** Minden refet módosító újragenerálást az okával naplózunk (a patch azonosítója
vagy a commit-emelés). A refeket soha nem szerkesztjük kézzel. Ha egy TS-assertion vagy golden csak
módosítással tud sikeres lenni, álljon meg, és naplózza (AD-13).

**Census.** Az `npx tsx tools/corpus/census.ts` nem rendez el semmit: az orákulumot parse módban futtatja
minden modellen, és az eredményt összeveti a commitolt `test/corpus/census.json` fájllal (898
modell: azonosító, formátumok, forrás, gyökéralgoritmus, jellemzőszámok). `0` kilépési kód egyenlőség
esetén, `1` eltérés (drift) esetén; a `--write` újraírja a fájlt. Csak a rögzített models-klónban fut, és
harness-hibánál megszakad.

**Generált korpusz (D7).** A `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` egy seedelt
grandom-konfigurációt tartalmaz; a mellette lévő `.json` az orákulum által generált, még el nem rendezett bemenet. Kilenc konfiguráció fedi le
azokat az algoritmus-azonosítókat, amelyeket egyetlen elk-models modell sem használ: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Mindegyikben legfeljebb 50 csomópont van, és
nincsenek élcímkék (a `BlindTextGenerator` seedeletlen). A harness a generált gyökeret `root` névre keresztelte,
mert az ELK `JsonExporter`-e az azonosító-ütközést seedeletlen véletlen utótaggal oldja fel. Újragenerálni
csak a `tools/oracle/regen-generated.sh` szkripttel szabad (előkészítő könyvtár és átnevezés; egy sikertelen konfiguráció
a régi fájlokat hagyja); változatlan újrafuttatás gitben no-op. A TS grandom-portolásnak ezeket a `.json` fájlokat
bájtról bájtra reprodukálnia kell; az algoritmus-goldenek soha nem függenek tőle.

**Sweep.** A `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` megtervezi az összes esetet, mindegyiket kétszer futtatja külön JVM-ekben (a shardok
alapértelmezett száma `min(cpus, 8)` párhuzamos `run.sh` folyamat), és a
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}` helyre ír.
A `--plan-only` az esetszámokat írja ki tier-enként, és semmit nem futtat; a `--filter` azokat az eset-azonosítókat tartja meg, amelyek
tartalmazzák a részstringet; a `--limit` egyenletes lépésközű mintát vesz. `0` kilépési kód, hacsak egy eset nem `oracle-error`
(`1`); eszközhiba `2` kóddal lép ki. Az esetenkénti kimenetek helyiek maradnak (AD-5). Az `ELK_SWEEP_TIMEOUT_MS`
(alapértelmezés `30000`, csak a `tools/` olvassa) korlátozza az egyes eseteket; a `run.sh` időtúllépés
(JVM kilépési kód 75) után újraindítja a JVM-et az eredménysor nélküli eseteken.

**Paritásjelentés (D9).** A `docs/parity-report.md` a sweep-gyorsítótárból generált és commitolt:
algoritmusonkénti és ítéletenkénti számok, az ELK- és models-commitokkal, időbélyegek nélkül. Az újragenerálás
az `npx tsx tools/corpus/parity-report.ts --write` paranccsal történik; `--write` nélkül a parancs `1` kóddal lép ki,
ha a commitolt jelentés elavult. Soha ne szerkessze kézzel.

**Korpusz-tesztek.** A `test/corpus/corpus.ts` fájlban lévő `resolveModelsDir()` `skip`
okot ad vissza, ha a klón hiányzik vagy más commiton áll; az ezt igénylő tesztek
kimaradnak, az üzenetben a rögzített shával. Ma a `test/golden/oracle-refs.test.ts`
csak a commitolt refeket ellenőrzi: manifeszt-azonosítónként egyet, a geometriát minden csomóponton,
porton, címkén és élen, az önösszehasonlítást, valamint hogy a `_meta.json` egyezik az `ELK_COMMIT`-tal, a manifeszttel és a
generátorral. TS-az-orákulum-ellen elrendezési teszt még nincs; az első portolt algoritmussal érkezik.

## 4. Seam-patchek

A seam-patchek az orákulumot módosítják; ritkák, és mindig egy TS-seammel párosítottak.

1. Szerkessze és commitolja az orákulum-worktree-ben (`$ELK_ORACLE_DIR`), vagy készítse el a patchet egy
   `ELK_COMMIT`-on álló ideiglenes klónban. Egy kész patch helyben, a meglévő worktree-hez adásához (megőrzi a
   `census/` és `sweep/` gyorsítótárakat, amelyeket a worktree eltávolítása töröl), alkalmazza a `build.sh`
   identitásával:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   a `build.sh` ezután ellenőrzi a sorozatot, és helyben újrafordít (kb. 3 perc), így a 4-5. lépés
   kihagyható.
2. Exportálás:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (vagy csak az új commitok). A fájlok neve `NNNN-<slug>.patch`; a numerikus
   előtag rögzíti az alkalmazási sorrendet.
3. Adja hozzá a megfelelő TS-seamet (azonos viselkedés, injektálható, az `src/` alatt), olyan tesztekkel,
   amelyek elvárt értékei a patchelt orákulumból származnak (AD-13).
4. Egyébként távolítsa el a worktree-t: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (adja hozzá a `--force` kapcsolót, ha a build kimenete miatt piszkos).
5. Újrafordítás: `tools/oracle/build.sh` (a sorozatot elejétől újraalkalmazza).
6. Újragenerálás: `tools/oracle/regen-goldens.sh`; nézze át a `git diff test/golden/refs` kimenetét.
7. Írjon naplóbejegyzést, amely megnevezi a patchet (`NNNN-<slug>.patch`), és felsorol minden
   megváltozott refet. A `_meta.json` `patches` mezője automatikusan rögzíti a sorozatot.

Soha ne hagyjon commitolatlan módosítást a worktree-ben: a `build.sh` elavultnak tekinti
(`2` kilépési kód). Soha ne szerkessze magát az `ELK_SOURCE_DIR` könyvtárat.

## 5. Orákulum-üzemeltetés (runbook)

| Hiba                                                                                         | Észlelés                                                                                                                                                                                                                                                                       | Elhárítás                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A Tycho-build sikertelen (p2 nem érhető el, JDK, Maven-verzió)                               | A `tools/oracle/build.sh` nullától eltérő kóddal lép ki; a teljes Maven-kimenet az `.oracle-build.log` fájlban van a tároló gyökerében. Az `1` kilépési kód hiányzó eszközt vagy rossz Mavent jelent; a `3` azt, hogy egy bundle-jar nem jött létre                            | A Maven **3.9.x** kell legyen: a Tycho 4.0.12 a Maven 3.10-en (a Homebrew 3.10.0-án) elbukik `ProvisionException: No implementation for MavenTargetLocationFactory was bound` hibával. Egy helyi 3.9.11 a `.tools/apache-maven-3.9.11/` alatt van (gitignore-olt): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Használjon JDK 21-et, vagy JDK 17-et a `JAVA_HOME`-on keresztül. Ellenőrizze a hálózatot (az első futás p2-artefaktumokat tölt le), majd futtassa újra. A `build.sh --record-only` kihagyja a Mavent, és csak az `oracle-build.json` fájlt írja újra a már lefordított jarokból. `2` kilépési kód: távolítsa el a worktree-t (4. szakasz, 4. lépés), és fordítson újra. Egyébként eszkalálja a naplóvéggel |
| A `build.sh` `2` kóddal lép ki közvetlenül egy patch alkalmazása után                        | A worktree elavultnak jelentve                                                                                                                                                                                                                                                 | A `build.sh` kibontja a tördelt patch-tárgysorokat (a `git format-patch` kb. 78 karakter felett tördeli azokat), és figyelmen kívül hagyja a nem követett `census/` és `sweep/` gyorsítótárakat; más szennyeződés vagy egy fel nem sorolt patch továbbra is `2` kilépési kódot ad: javítsa a worktree-t (4. szakasz)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Golden-drift egy patch vagy commit-emelés után                                               | A `tools/oracle/regen-goldens.sh`, majd a `git diff --exit-code test/golden/refs` nem üres; a `test/golden/oracle-refs.test.ts` elavult `_meta.json` esetén elbukik (`elkCommit`, `modelsCommit`); egy TS-megfelelőségi teszt, ha már létezik, `formatDiffs` jelentéssel bukik | Fordítson újra (`build.sh`), futtassa a `regen-goldens.sh` szkriptet, nézze át a diffet, naplózza a patch azonosítóját. Soha ne szerkesszen refet kézzel, és ne lazítsa a `tol` értéket                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Hiányzó Xtext/ANTLR jar a p2-gyorsítótárból (`.elkt`, `.elkr` vagy bármely `run.sh` indítás) | A `run.sh` nullától eltérő kóddal lép ki `bundle <name> not in p2 cache <dir>` üzenettel (pl. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                             | Állítsa a `P2_BUNDLES` értékét arra a Tycho p2-gyorsítótárra, amely tartalmazza, vagy futtassa a `build.sh` szkriptet hálózati hozzáféréssel, hogy a Tycho letöltse; futtassa újra a `run.sh` szkriptet. Ne helyettesítsen jarokat máshonnan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Sweep lefagy vagy OOM                                                                        | Egy eset az időtúllépésig fut, és `timeout` ítéletet jelent (egy stderr-sor megnevezi); az eredménysor nélküli futás `oracle-error` ítéletet és `sweep: shard <n> run <A or B> exited <code>` sort ad a stderr-en; a gép swappel 8 párhuzamos JVM alatt                        | Csökkentse a párhuzamosságot és a kötegméretet: `sweep.sh --shards 2`, szűkítse a `--filter` vagy `--limit` kapcsolóval. Az `ELK_SWEEP_TIMEOUT_MS` értékét csak lassú, de helyes modellnél emelje. A reprodukálható `timeout` megállapítás: naplózza az eset-azonosítót, ne szélesítse a korlátot az elrejtéséhez                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Census-drift egy pin-emelés után (`ELK_COMMIT` vagy a models `commit`)                       | Az `npx tsx tools/corpus/census.ts` `1` kóddal lép ki, és felsorolja az eltérő modelleket; a `test/corpus/census.test.ts` elbukik                                                                                                                                              | Erősítse meg, hogy a klón és az orákulum az új pinen áll, futtassa újra a `census.ts --write` parancsot, nézze át a `git diff test/corpus/census.json` kimenetét, naplózza az okot, majd futtassa újra a `sweep.sh` szkriptet, és generálja újra a paritásjelentést. Soha ne szerkessze kézzel a census-t                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Az elk-models hiányzik vagy rossz sha                                                        | A korpusz-tesztek kimaradnak, az üzenet megnevezi az elvárt shát; a `regen-goldens.sh` `1` kóddal lép ki (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                        | Futtassa a `test/corpus/fetch.sh` szkriptet (klónozza és kicheckouttolja a rögzített commitot). `2` kóddal lép ki, ha egy meglévő klón más commiton áll, és nem nyúl hozzá: javítsa maga a klónt, vagy mutasson az `ELK_MODELS_DIR`-rel egy friss útvonalra. Soha ne mozgassa szkriptből egy meglévő klón HEAD-jét                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Egyéb `run.sh` hibák: az `oracle-build.json missing` vagy `oracle jar missing`
azt jelenti, hogy először a `build.sh` szkriptet kell futtatni; a `bundle <name> not in p2 cache` azt jelenti, hogy
a `P2_BUNDLES` értékét a Tycho p2-gyorsítótárra kell állítani, vagy a `build.sh` szkriptet hálózati hozzáféréssel újra kell futtatni.

## 6. Gate-ek

Minden módosításra:

| Gate                   | Parancs                                                        | Mérce                                                                                     |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Típusok                | `npm run typecheck`                                            | 0 kilépési kód                                                                            |
| Tesztek és lefedettség | `npm run coverage`                                             | minden teszt sikeres; 90% utasítás-, ág-, függvény- és sorlefedettség az `src/**` felett  |
| Architektúra           | `test/architecture/*.fitness.test.ts` (az `npm test` futtatja) | modulhatárok, modul-globálisok, nincs Node-beépített modul az `src/` alatt, SPDX-fejlécek |
| Orákulum-refek         | `test/golden/oracle-refs.test.ts`                              | a commitolt refek konzisztensek a manifeszttel és az `ELK_COMMIT`-tal                     |

A `tools/oracle/`, a manifeszt vagy a patch-sorozat módosításai ezenfelül ezeket is igénylik:

| Gate              | Parancs                                                                       | Mérce                                                                      |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Orákulum-build    | `tools/oracle/build.sh`                                                       | 0 kilépési kód                                                             |
| Orákulum-futtatás | `tools/oracle/run.sh <outDir> <input.json>...`                                | 0 kilépési kód, nincs `ERROR` sor                                          |
| Golden-stabilitás | `tools/oracle/regen-goldens.sh`, majd `git diff --exit-code test/golden/refs` | nincs diff, kivéve ha a módosítás refeket szándékosan mozgat, és naplózott |
| Shell             | `shellcheck tools/oracle/*.sh`                                                | tiszta                                                                     |

A `tools/oracle/` vagy `tools/corpus/` módosításai ezenfelül ezeket is igénylik:

| Gate                | Parancs                                                                              | Mérce                                                                    |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Census              | `npx tsx tools/corpus/census.ts`                                                     | 0 kilépési kód (nincs drift)                                             |
| Generált stabilitás | `tools/oracle/regen-generated.sh`, majd `git diff --exit-code test/corpus/generated` | nincs diff                                                               |
| Sweep               | `tools/oracle/sweep.sh` (vagy `--filter`/`--limit` mintához)                         | 0 kilépési kód: nincs `oracle-error`                                     |
| Paritásjelentés     | `npx tsx tools/corpus/parity-report.ts`                                              | 0 kilépési kód (a commitolt jelentés friss); újragenerálás `--write`-tal |
