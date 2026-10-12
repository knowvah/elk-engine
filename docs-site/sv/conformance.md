---
title: Överensstämmelse
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Överensstämmelse: vad ”matchning” betyder

@knowvah/elk-engine valideras mot uppströms Eclipse ELK (Java) byggt från
källkod. Ett TypeScript-layout är **överensstämmande** med oraklet när, efter att båda
har tolkats som ELK JSON, strukturen och varje icke-numeriskt värde är exakt lika och
varje ändligt tal stämmer överens inom en absolut tolerans på `1e-6`.
Jämföraren är [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
det här dokumentet beskriver vad den implementerar. Reglerna för porteringen finns i
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Avsnitt                                                      | Svarar på                                  |
| --- | ------------------------------------------------------------ | ------------------------------------------ |
| 1   | [Orakel](#1-orakel)                                          | Vad är ”korrekt”, och vid vilken commit?   |
| 1a  | [Enhet för överensstämmelse](#1a-enhet-för-överensstämmelse) | Vad är ett fall, och vilka fall finns?     |
| 2   | [Överensstämmelsekrav](#2-överensstämmelsekrav)              | Vad räknas som lika?                       |
| 3   | [Goldens och korpus](#3-goldens-och-korpus)                  | Varifrån kommer referensutdata?            |
| 4   | [Seam-patchar](#4-seam-patchar)                              | Hur ändrar vi oraklet?                     |
| 5   | [Orakeldrift](#5-orakeldrift-runbook)                        | Vad gör jag när det går sönder?            |
| 6   | [Gates](#6-gates)                                            | Vad måste passera innan en ändring landar? |

## 1. Orakel

Oraklet (AD-3) är uppströms ELK **byggt från källkod** i en fristående git-worktree
av `$ELK_SOURCE_DIR`, som `tools/oracle/build.sh` skapar i `$ELK_ORACLE_DIR`.
Båda ligger utanför det här repositoriet; ingen av dem följer med i det.

| Objekt              | Var                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------- |
| Fastlåst ELK-commit | `tools/oracle/ELK_COMMIT` (för närvarande `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)   |
| Patchserie          | `tools/oracle/patches/*.patch`, tillämpas i lexikalisk ordning med `git am --3way`      |
| Bygge               | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho laddar ned p2-artefakter)          |
| Batchkörare         | `tools/oracle/run.sh <outDir> <input>...` eller `run.sh --cases <cases.jsonl> <outDir>` |
| Harness             | `tools/oracle/harness/ElkOracle.java`                                                   |
| Byggmanifest        | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patchar, JDK, jar per bundle)              |

**Bygge.** `build.sh` kör `mvn -P elk-meta clean install -DskipTests` (melk-
kompilatorn) och därefter `mvn clean install -DskipTests -Dmaven.test.skip=true` från
`build/` i worktreen, och registrerar sedan jar-filen för varje bundle inom omfånget
(`core`, `graph`, `graph.json`, `alg.common` samt algoritmerna `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex`) i `oracle-build.json`. En befintlig worktree återanvänds
bara om den härstammar från `ELK_COMMIT`, bär exakt de patchämnesrader som finns i
`tools/oracle/patches/` och är ren förutom byggutdata; annars avslutas
`build.sh` med `2` och lämnar den orörd.

**Körning.** `run.sh` kompilerar `ElkOracle.java` mot bundle-jarfilerna plus
tredjepartsbundlarna (Gson, Guava, EMF, Xtext/Xtend-bibliotek) från Tychos p2-
cache (`P2_BUNDLES`, standard `~/.m2/repository/p2/osgi/bundle`; den nyaste
versionen av varje används). En JVM lägger ut varje indata med
`RecursiveGraphLayoutEngine` och skriver `<outDir>/<input basename>.json`
med layout, nolldimensioner och nollpositioner inkluderade och okända layoutalternativ
utelämnade. En indata som misslyckas skriver ut `ERROR <input>: <message>`; JVM:en
avslutas med `1` om någon indata misslyckades. Basnamnen på indata måste vara unika inom en
körning, eftersom utdatanamnet är basnamnet.

**Semantik för patchserien.** Serien innehåller i dag en patch:

| Patch                                                                   | Effekt                                                                                                                                                                                                                       | Parad TS-seam                                                                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` löser id-kollisioner med `"_g" + Random.nextInt(1000000)`; patchen seedar den `Random` från systemegenskapen `org.eclipse.elk.graph.json.exportSeed` (osatt = ELK-beteende). `run.sh` skickar `EXPORT_SEED=1` | Injicerbar `Random` i `graph.json`-porteringen; väntar på den porteringen (TS-shimmen `Random` återger redan följden: seed 1 ger 548985, 764588) |

Patchar finns bara för att lägga till snävt avgränsade seams som gör JVM- och JS-beteende jämförbara;
var och en paras med en seam på TS-sidan (avsnitt 4).

**Varför inte elkjs?** elkjs är ELK kompilerat med GWT. Det kan inte bära vår patchserie,
och GWT:s emulering av JRE skiljer sig från den JVM vi porterar från.
Det används inte som orakel.

## 1a. Enhet för överensstämmelse

Ett **fall** är `(algorithm, model, variant)` (D1). Paritetspanelen har en rad per
layoutalgoritm; elk-models-mappen och census-egenskaperna är filter, inte rader.

**Fall-id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, till exempel
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` är algoritm-id:t
utan `org.eclipse.elk.`. För genererade modeller är `modelId` `generated/<name>`.

**Modell-id och källa (D3).** Modell-id:t är sökvägen i elk-models utan filändelse.
Ett fall läser `.json` när en sådan finns, annars `.elkt`; `.elkg` (EMF XMI) läses aldrig.

**Varianter (D6).** Namngivna alternativöverlägg i `test/corpus/variants.json`, tillämpade på roten:
`default` (inga), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritm                                  | Modeller                       | Varianter               |
| ------------ | ----------------------------------------- | ------------------------------ | ----------------------- |
| native       | modellens egen `rootAlgorithm`            | varje census-modell            | alla sju                |
| retarget     | varje listad algoritm utom modellens egen | varje census-modell            | endast `default` (OR-1) |
| generated    | algoritmen som namnges av filprefixet     | `test/corpus/generated/*.json` | alla sju                |
| ported JUnit | per algoritmmission                       | uppströms JUnit-fall (AD-13)   | som portade             |

`tools/oracle/run.sh --list-algorithms` är listan över algoritm-id:n (14 i dag).

**Retarget (D2).** Harnessen sätter `org.eclipse.elk.algorithm` på **varje nod som har
barn**, och ersätter varje deklarerat värde, samt `org.eclipse.elk.randomSeed = 1` på roten. ELK
löser algoritmen per nod, och en nod utan värde faller tillbaka på layered. En rot utan
barn får bara seeden. Retarget-tiern hoppar över varje models egen `rootAlgorithm` (den
native tiern täcker den).

## 2. Överensstämmelsekrav

AD-4, exakt som `compareLayout(expected, actual, { tol })` implementerar det:

| Regel                      | Beteende                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerans                   | Absolut, `DEFAULT_TOLERANCE = 1e-6`; ändliga tal godkänns när `abs(e - a) <= tol`                                                                                                  |
| Icke-ändliga tal           | `NaN` och `±Infinity` måste vara exakt lika (`Object.is` eller `===`), även med `tol: Infinity`                                                                                    |
| Strängar, booleans, `null` | Strikt lika, annars `value`                                                                                                                                                        |
| Typavvikelse               | Olika JSON-slag (`null`, array, objekt, tal, sträng, boolean) ger en enda `type`-diff                                                                                              |
| Objektnycklar              | Nyckelmängden måste vara identisk: en nyckel bara i expected är `missing`, bara i actual är `extra`                                                                                |
| Arrayer                    | Matchas **via `id`** när varje element på båda sidor är ett objekt med en sträng-`id` och id:na är unika per sida (en tom array räknas som nyckelbaserad); annars **positionsvis** |
| Nyckelbaserade arrayer     | Ett id på bara en sida är en `structure`-diff vid `path[id=<id>]`; ordningen ignoreras                                                                                             |
| Positionsbaserade arrayer  | En längdskillnad är en enda `structure`-diff och elementen jämförs inte vidare                                                                                                     |
| Diff-slag                  | `structure`, `value`, `type`, `missing`, `extra`; `path` är JSON-sökvägsliknande (`children[id=n1].x`)                                                                             |

Följder: element-id:n, elementantal, topologin för kantsektioner och antalet
brytpunkter är exakta eftersom id:n och arraylängder är exakta;
koordinater och storlekar får `1e-6`. `formatDiffs` skriver ut högst 20 diffar.

**Policy för kända avvikelser.** En avvikelse absorberas aldrig genom att höja `tol`
eller redigera en golden (AD-13). Varje avvikelse antecknas här med sin orsak och det
test eller den fixtur den påverkar. Accepterade klasser:

- **`Math.*`-skillnader på ulp-nivå.** V8 och JVM:en kan skilja sig i sista biten
  av `sin`, `cos`, `exp`, `log`, `pow` och liknande; Javas `StrictMath` är
  specificerad som bitexakt, `Math` är det inte. Fallet som redan inträffat: `nextGaussian`
  är specificerad att använda `StrictMath.log`, så `src/java/util/Random.ts` har en
  `StrictMath.log`-exakt implementation i stället för `Math.log`. Föredra en
  bitexakt portering av `StrictMath`-algoritmen framför att vidga toleransen.
- **Iteration över identitets-hash (AD-10).** Att iterera en `HashMap`/`HashSet` med
  identitetshashade objekt som nycklar är icke-deterministiskt i själva Java. Journalför
  stället och portera med insättningsordning; goldens får inte bero på det. Värdehashade
  nycklar (String, Integer) måste återge Javas ordning.
- **Tidsseedad `Random`.** Med `randomSeed = 0` seedar ELK från klockan
  (`core/Core.melk:608`), så utdata är inte reproducerbar. Golden-indata måste
  lämna seeden osatt eller nollskild (layereds standardseed är `1`).

Konkreta poster (lägg till en först med användarens godkännande):

| #   | Avvikelse                     | Orsak                                                                          | Omfattning                                                                                                                                                   | Godkänd                   |
| --- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1   | Text i tolkningsfelmeddelande | ANTLR-meddelanden är artefakter av den genererade parsern, som aldrig porteras | Ogiltig grammatikindata (`.elkt`, `.elkj`, `.elkr`): bara _förekomsten_ av ett tolkningsfel måste matcha, inte meddelandet. Giltig indata måste matcha exakt | D8, användare, 2026-10-11 |

**Utfall.** Varje fall får ett utfall från två separata JVM-körningar av oraklet (D4, D5, OR-2):

| Utfall             | Betydelse                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Båda körningarna la ut modellen och utdatafilerna är byte-identiska                                                                                                         |
| `throws`           | Båda körningarna kastade samma exception: exakt klass, och exakt meddelande efter att `@[0-9a-f]+` blivit `@<hash>` (meddelandet kan vara null, t.ex. `StackOverflowError`) |
| `nondeterministic` | Körningarna är oense (utdatabyte, exception, eller en `ok` och en `throws`)                                                                                                 |
| `oracle-error`     | Fel i harnessen (oläsbar indata, okänd variant/okänd algoritm/okänt alternativ, förlorad resultatrad); aldrig acceptabelt                                                   |
| `timeout`          | En körning överskred `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                 |

Företräde: `oracle-error`, sedan `timeout`, sedan `ok`/`throws` när de är lika, annars
`nondeterministic`. Före bytejämförelsen ersätts varje `@[0-9a-f]+`-token i båda utdata med
`@<hash>`, som i exception-meddelanden (D5a; `sameOutput` i `tools/corpus/sweep.ts`).
Orsak: discos programmatiska alternativ `debug.discoGraph` exporterar `...DCGraph@<identity hash>`,
vilket ingen seed kan låsa. TS-jämföraren tillämpar samma ersättning. Icke-deterministiska fall
rapporteras separat och utesluts ur godkänt-antalen, i linje med policyn för identitets-hash ovan.

Äkta kvarvarande källor till `nondeterministic` (ELK-beteende, inte fel i harnessen; antalen finns i
paritetsrapporten): spore (`ElkGraphImporter.java:169` jitterar med `Math.random`) och `random`
(standardvärdet `randomSeed` 0 är oseedat på nästlade sammansatta noder; retarget seedar bara roten, D2,
bibehållet enligt användarens beslut). Exportörens `_g<random>`-id-namnbyten är ingen källa: seam-
patchen åtgärdar dem.

## 3. Goldens och korpus

AD-5. Referensutdata checkas in så att CI inte behöver någon JVM.

| Objekt                | Var                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Fastlåst korpus       | `eclipse-elk/elk-models` vid `commit` i `test/corpus/manifest.json` (följer inte med)           |
| Modellkatalog         | `$ELK_MODELS_DIR`, standard `../../eclipse-elk/elk-models` relativt det här repositoriet        |
| Kuraterad uppsättning | `golden[]` i `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Refs                  | `test/golden/refs/elk/<id>.json`, en per manifest-`id`                                          |
| Proveniens            | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Avbildning från id till sökväg.** `golden[].path` är relativ till `$ELK_MODELS_DIR`, och
indata är `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` kör harnessen på
dessa indata och lägger varje `<basename>.json`-utdata som `refs/elk/<id>.json`.
Exempel: id:t `ptolemy-scrambler` är
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerering** (`tools/oracle/regen-goldens.sh`):

1. Kräver att models-klonen står på exakt manifestets commit (annars exit `1`).
2. Kräver ett byggt orakel (`run.sh` behöver `oracle-build.json`).
3. Lägger alla refs och `_meta.json` i `test/golden/refs/.elk-staging.*` och byter sedan
   katalogen med två namnbyten, så att en misslyckad körning lämnar de gamla refs.
4. `_meta.json` har inga tidsstämplar (`builtAt` stannar i `oracle-build.json`), så en
   regenerering utan ändrade indata är en byte-för-byte-no-op i git.

**När man ska regenerera:** efter ändring av `ELK_COMMIT`, patchserien, manifestets
`golden[]`-uppsättning eller `commit`, eller harnessen. Aldrig annars.

**Journalföringsregel.** Varje regenerering som ändrar en ref journalförs med
orsaken (patch-id:t, eller commit-höjningen). Refs redigeras aldrig för hand. Om en
TS-assertion eller golden bara kan passera genom att ändras: stanna och journalför (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` lägger inte ut något: den kör oraklet i parse-läge
över varje modell och jämför resultatet med den incheckade `test/corpus/census.json` (898
modeller: id, format, källa, rotalgoritm, egenskapsantal). Exit `0` när lika, `1` vid drift;
`--write` skriver om filen. Den körs bara i den fastlåsta models-klonen och avbryts vid
fel i harnessen.

**Genererad korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` innehåller en seedad
grandom-konfiguration; syskonfilen `.json` är den orakelgenererade indata som inte lagts ut. Nio konfigurationer täcker
de algoritm-id:n som ingen elk-models-modell använder: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Var och en har högst 50 noder och
inga kantetiketter (`BlindTextGenerator` är oseedad). Harnessen döper den genererade roten till `root`,
eftersom ELK:s `JsonExporter` löser en id-kollision med ett oseedat slumpmässigt suffix. Regenerera
bara med `tools/oracle/regen-generated.sh` (stagingkatalog och namnbyte; en konfiguration som misslyckas
lämnar de gamla filerna); en omkörning utan ändringar är en git-no-op. TS-porteringen av grandom måste
återge dessa `.json`-filer byte för byte; algoritm-goldens beror aldrig på den.

**Svep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planerar varje fall, kör varje två gånger i separata JVM:er (shards
är som standard `min(cpus, 8)` samtida `run.sh`-processer) och skriver
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` skriver ut fallantal per tier och kör ingenting; `--filter` behåller fall-id:n som innehåller
delsträngen; `--limit` tar ett stickprov med jämnt stride. Exit `0` om inte ett fall är `oracle-error`
(`1`); ett verktygsfel ger exit `2`. Utdata per fall stannar lokalt (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(standard `30000`, läses bara av `tools/`) begränsar varje fall; `run.sh` startar om en JVM efter en
timeout (JVM-exitkod 75) för de fall som saknar resultatrad.

**Paritetsrapport (D9).** `docs/parity-report.md` genereras från svepcachen och checkas in:
antal per algoritm och utfall, med ELK- och models-commits och utan tidsstämplar. Regenerera
med `npx tsx tools/corpus/parity-report.ts --write`; utan `--write` avslutas kommandot med `1`
när den incheckade rapporten är inaktuell. Redigera den aldrig för hand.

**Korpustester.** `resolveModelsDir()` i `test/corpus/corpus.ts` returnerar en
`skip`-orsak när klonen saknas eller står på en annan commit; tester som behöver
den hoppas över med den fastlåsta shan i meddelandet. I dag kontrollerar `test/golden/oracle-refs.test.ts`
bara de incheckade refs: en per manifest-id, geometri på varje nod,
port, etikett och kant, självjämförelse, och att `_meta.json` stämmer med
`ELK_COMMIT`, manifestet och generatorn. Det finns ännu inget layouttest av TS mot orakel;
det kommer med den första portade algoritmen.

## 4. Seam-patchar

Seam-patchar ändrar oraklet; de är sällsynta och paras alltid med en TS-seam.

1. Redigera och checka in i orakel-worktreen (`$ELK_ORACLE_DIR`), eller skriv patchen i en scratch-
   klon vid `ELK_COMMIT`. För att lägga till en färdig patch i den befintliga worktreen på plats (behåller
   cacharna `census/` och `sweep/`, som tas bort om worktreen tas bort), tillämpa den med
   `build.sh`:s identitet:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verifierar sedan serien och bygger om på plats (cirka 3 minuter), så steg 4-5
   kan hoppas över.
2. Exportera:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (eller bara de nya commitsen). Filerna heter `NNNN-<slug>.patch`; det numeriska
   prefixet avgör tillämpningsordningen.
3. Lägg till motsvarande TS-seam (samma beteende, injicerbar, i `src/`), med tester
   vars förväntade värden kommer från det patchade oraklet (AD-13).
4. Annars tar du bort worktreen: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (lägg till `--force` om byggutdata gör den smutsig).
5. Bygg om: `tools/oracle/build.sh` (tillämpar serien från början igen).
6. Regenerera: `tools/oracle/regen-goldens.sh`; granska `git diff test/golden/refs`.
7. Journalför en post som namnger patchen (`NNNN-<slug>.patch`) och listar varje
   ref som ändrats. `patches` i `_meta.json` registrerar serien automatiskt.

Lämna aldrig en ocommittad ändring i worktreen: `build.sh` behandlar den som inaktuell
(exit `2`). Redigera aldrig `ELK_SOURCE_DIR` själv.

## 5. Orakeldrift (runbook)

| Fel                                                                               | Upptäckt                                                                                                                                                                                                                                                                                    | Åtgärd                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-bygget misslyckas (p2 onåbart, JDK, Maven-version)                          | `tools/oracle/build.sh` avslutas med nollskild kod; hela Maven-utdata finns i `.oracle-build.log` i repots rot. Exit `1` är ett saknat verktyg eller fel Maven; exit `3` betyder att en bundle-jar inte producerades                                                                        | Maven måste vara **3.9.x**: Tycho 4.0.12 misslyckas på Maven 3.10 (Homebrews 3.10.0) med `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. En lokal 3.9.11 finns i `.tools/apache-maven-3.9.11/` (gitignorerad): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Använd JDK 21, eller JDK 17 via `JAVA_HOME`. Kontrollera nätverket (första körningen laddar ned p2-artefakter) och kör sedan igen. `build.sh --record-only` hoppar över Maven och skriver bara om `oracle-build.json` från redan byggda jar-filer. Exit `2`: ta bort worktreen (avsnitt 4 steg 4) och bygg om. Annars eskalera med slutet av loggen |
| `build.sh` avslutas med `2` direkt efter att en patch tillämpats                  | Worktreen rapporteras som inaktuell                                                                                                                                                                                                                                                         | `build.sh` viker ut radbrutna patchämnesrader (`git format-patch` viker dem efter cirka 78 tecken) och ignorerar de ospårade cacharna `census/` och `sweep/`; annan smuts eller en patch som inte står i listan ger fortfarande exit `2`: åtgärda worktreen (avsnitt 4)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Golden-drift efter en patch eller commit-höjning                                  | `tools/oracle/regen-goldens.sh` följt av `git diff --exit-code test/golden/refs` är icke-tom; `test/golden/oracle-refs.test.ts` misslyckas vid en inaktuell `_meta.json` (`elkCommit`, `modelsCommit`); ett TS-överensstämmelsetest, när det finns, misslyckas med en `formatDiffs`-rapport | Bygg om (`build.sh`), kör `regen-goldens.sh`, granska diffen, journalför patch-id:t. Redigera aldrig en ref för hand och lätta aldrig på `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Xtext-/ANTLR-jar saknas i p2-cachen (`.elkt`, `.elkr` eller varje `run.sh`-start) | `run.sh` avslutas med nollskild kod och `bundle <name> not in p2 cache <dir>` (t.ex. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                                   | Sätt `P2_BUNDLES` till den Tycho-p2-cache som innehåller den, eller kör `build.sh` med nätverksåtkomst så att Tycho hämtar den; kör `run.sh` igen. Ersätt inte med jar-filer från annat håll                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Svep hänger sig eller får slut på minne                                           | Ett fall körs till timeout och rapporterar `timeout` (en stderr-rad namnger det); en körning utan resultatrad ger `oracle-error` och `sweep: shard <n> run <A or B> exited <code>` på stderr; maskinen swappar under 8 samtida JVM:er                                                       | Sänk samtidigheten och batchstorleken: `sweep.sh --shards 2`, avgränsa med `--filter` eller `--limit`. Höj `ELK_SWEEP_TIMEOUT_MS` bara för en modell som är långsam men korrekt. En reproducerbar `timeout` är ett fynd: journalför fall-id:t, vidga inte gränsen för att dölja det                                                                                                                                                                                                                                                                                                                                                                                           |
| Census-drift efter en pin-höjning (`ELK_COMMIT` eller models-`commit`)            | `npx tsx tools/corpus/census.ts` avslutas med `1` och listar modellerna som skiljer sig; `test/corpus/census.test.ts` misslyckas                                                                                                                                                            | Bekräfta att klon och orakel står på de nya pinnarna, kör `census.ts --write` igen, granska `git diff test/corpus/census.json`, journalför orsaken, kör sedan `sweep.sh` igen och regenerera paritetsrapporten. Redigera aldrig census för hand                                                                                                                                                                                                                                                                                                                                                                                                                               |
| elk-models saknas eller fel sha                                                   | Korpustester hoppas över med ett meddelande som namnger förväntad sha; `regen-goldens.sh` avslutas med `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                   | Kör `test/corpus/fetch.sh` (klonar och checkar ut den fastlåsta commiten). Den avslutas med `2` om en befintlig klon står på en annan commit och rör den inte: åtgärda den klonen själv eller peka `ELK_MODELS_DIR` på en ny sökväg. Flytta aldrig HEAD på en befintlig klon från ett skript                                                                                                                                                                                                                                                                                                                                                                                  |

Andra `run.sh`-fel: `oracle-build.json missing` eller `oracle jar missing`
betyder att du ska köra `build.sh` först; `bundle <name> not in p2 cache` betyder att du ska sätta
`P2_BUNDLES` till Tychos p2-cache eller köra `build.sh` igen med nätverksåtkomst.

## 6. Gates

Varje ändring:

| Gate                | Kommando                                                   | Krav                                                                               |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Typer               | `npm run typecheck`                                        | exit 0                                                                             |
| Tester och coverage | `npm run coverage`                                         | alla tester godkänns; 90 % statements, branches, functions och lines över `src/**` |
| Arkitektur          | `test/architecture/*.fitness.test.ts` (körs av `npm test`) | modulgränser, modulglobaler, inga Node-inbyggda moduler i `src/`, SPDX-huvuden     |
| Orakel-refs         | `test/golden/oracle-refs.test.ts`                          | incheckade refs konsistenta med manifest och `ELK_COMMIT`                          |

Ändringar i `tools/oracle/`, manifestet eller patchserien kräver dessutom:

| Gate              | Kommando                                                                       | Krav                                                             |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Orakelbygge       | `tools/oracle/build.sh`                                                        | exit 0                                                           |
| Orakelkörning     | `tools/oracle/run.sh <outDir> <input.json>...`                                 | exit 0, inga `ERROR`-rader                                       |
| Golden-stabilitet | `tools/oracle/regen-goldens.sh`, sedan `git diff --exit-code test/golden/refs` | ingen diff, om inte ändringen ska flytta refs och är journalförd |
| Shell             | `shellcheck tools/oracle/*.sh`                                                 | ren                                                              |

Ändringar i `tools/oracle/` eller `tools/corpus/` kräver dessutom:

| Gate                 | Kommando                                                                              | Krav                                                         |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Census               | `npx tsx tools/corpus/census.ts`                                                      | exit 0 (ingen drift)                                         |
| Genererad stabilitet | `tools/oracle/regen-generated.sh`, sedan `git diff --exit-code test/corpus/generated` | ingen diff                                                   |
| Svep                 | `tools/oracle/sweep.sh` (eller `--filter`/`--limit` för ett stickprov)                | exit 0: inget `oracle-error`                                 |
| Paritetsrapport      | `npx tsx tools/corpus/parity-report.ts`                                               | exit 0 (incheckad rapport aktuell); regenerera med `--write` |
