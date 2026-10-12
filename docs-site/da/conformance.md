---
title: Overensstemmelse
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overensstemmelse: hvad "match" betyder

@knowvah/elk-engine valideres mod upstream Eclipse ELK (Java), bygget fra
kildekode. Et TypeScript-layout er **i overensstemmelse** med oraklet, når
struktur og alle ikke-numeriske værdier er nøjagtigt ens, og hvert endeligt tal
ligger inden for en absolut tolerance på `1e-6`, efter at begge er parset som ELK JSON.
Komparatoren er [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
dette dokument beskriver, hvad den implementerer. Porteringsreglerne findes i
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Afsnit                                               | Svarer på                                  |
| --- | ---------------------------------------------------- | ------------------------------------------ |
| 1   | [Orakel](#1-orakel)                                  | Hvad er "korrekt", og ved hvilket commit?  |
| 1a  | [Overensstemmelsesenhed](#1a-overensstemmelsesenhed) | Hvad er ét tilfælde, og hvilke findes der? |
| 2   | [Overensstemmelseskrav](#2-overensstemmelseskrav)    | Hvad tæller som ens?                       |
| 3   | [Goldens og korpus](#3-goldens-og-korpus)            | Hvor kommer referenceoutputtene fra?       |
| 4   | [Seam-patches](#4-seam-patches)                      | Hvordan ændrer vi oraklet?                 |
| 5   | [Orakeldrift](#5-orakeldrift-runbook)                | Hvad gør jeg, når det går i stykker?       |
| 6   | [Gates](#6-gates)                                    | Hvad skal bestå, før en ændring lander?    |

## 1. Orakel

Oraklet (AD-3) er upstream ELK **bygget fra kildekode** i et frakoblet git-worktree
af `$ELK_SOURCE_DIR`, oprettet i `$ELK_ORACLE_DIR` af `tools/oracle/build.sh`.
Begge ligger uden for dette repository; ingen af dem er vendoret.

| Element             | Hvor                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| Fastlåst ELK-commit | `tools/oracle/ELK_COMMIT` (aktuelt `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)          |
| Patch-serie         | `tools/oracle/patches/*.patch`, anvendt i leksikalsk rækkefølge med `git am --3way`     |
| Build               | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho henter p2-artefakter)              |
| Batch-runner        | `tools/oracle/run.sh <outDir> <input>...` eller `run.sh --cases <cases.jsonl> <outDir>` |
| Harness             | `tools/oracle/harness/ElkOracle.java`                                                   |
| Build-manifest      | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar pr. bundle)              |

**Build.** `build.sh` kører `mvn -P elk-meta clean install -DskipTests` (melk-
compileren) og derefter `mvn clean install -DskipTests -Dmaven.test.skip=true` fra
`build/` i worktreet, og registrerer så jar-filen for hver bundle i scope
(`core`, `graph`, `graph.json`, `alg.common` samt algoritmerne `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking` og
`vertiflex`) i `oracle-build.json`. Et eksisterende worktree genbruges kun,
hvis det nedstammer fra `ELK_COMMIT`, bærer præcis de patch-emnelinjer, der findes i
`tools/oracle/patches/`, og er rent bortset fra build-output; ellers afslutter
`build.sh` med `2` og lader det være urørt.

**Run.** `run.sh` kompilerer `ElkOracle.java` mod bundle-jar-filerne plus
tredjepartsbundles (Gson, Guava, EMF, Xtext/Xtend-biblioteker) fra Tycho-p2-cachen
(`P2_BUNDLES`, standard `~/.m2/repository/p2/osgi/bundle`; den nyeste version af
hver bruges). Én JVM lægger hvert input ud med
`RecursiveGraphLayoutEngine` og skriver `<outDir>/<input basename>.json`
med layout, nuldimensioner og nulpositioner inkluderet og ukendte layoutindstillinger
udeladt. Et input, der fejler, udskriver `ERROR <input>: <message>`; JVM'en
afslutter med `1`, hvis et input fejlede. Inputbasenavne skal være unikke inden for ét
kørsel, da outputnavnet er basenavnet.

**Patch-seriens semantik.** Serien indeholder i dag ét patch:

| Patch                                                                   | Virkning                                                                                                                                                                                                                      | Parret TS-seam                                                                                                                                           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` løser id-kollisioner med `"_g" + Random.nextInt(1000000)`; patchet seeder denne `Random` fra systemegenskaben `org.eclipse.elk.graph.json.exportSeed` (ikke sat = ELK-adfærd). `run.sh` sender `EXPORT_SEED=1` | Injicerbar `Random` i `graph.json`-porteringen; afventer den portering (TS-`Random`-shimmen reproducerer allerede strømmen: seed 1 giver 548985, 764588) |

Patches findes kun for at tilføje snævert afgrænsede seams, der gør JVM- og JS-adfærd sammenlignelig;
hvert er parret med et TS-side-seam (afsnit 4).

**Hvorfor ikke elkjs?** elkjs er ELK kompileret med GWT. Det kan ikke bære vores patch-serie,
og GWT's emulering af JRE'en afviger fra den JVM, vi porterer fra.
Det konsulteres ikke som orakel.

## 1a. Overensstemmelsesenhed

Et **tilfælde** er `(algorithm, model, variant)` (D1). Paritets-dashboardet har én række pr.
layoutalgoritme; elk-models-mappen og census-egenskaberne er filtre, ikke rækker.

**Tilfælde-id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, for eksempel
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` er algoritme-id'et
uden `org.eclipse.elk.`. For genererede modeller er `modelId` `generated/<name>`.

**Model-id og kilde (D3).** Model-id'et er stien i elk-models uden filendelse.
Et tilfælde læser `.json`, når der findes en, ellers `.elkt`; `.elkg` (EMF XMI) læses aldrig.

**Varianter (D6).** Navngivne indstillingsoverlejringer i `test/corpus/variants.json`, anvendt på roden:
`default` (ingen), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritme                                     | Modeller                        | Varianter            |
| ------------ | --------------------------------------------- | ------------------------------- | -------------------- |
| native       | modellens egen `rootAlgorithm`                | hver census-model               | alle syv             |
| retarget     | hver opført algoritme undtagen modellens egen | hver census-model               | kun `default` (OR-1) |
| generated    | algoritmen, der er navngivet af filpræfikset  | `test/corpus/generated/*.json`  | alle syv             |
| ported JUnit | pr. algoritme-mission                         | upstream-JUnit-tilfælde (AD-13) | som portet           |

`tools/oracle/run.sh --list-algorithms` er listen over algoritme-id'er (14 i dag).

**Retarget (D2).** Harnessen sætter `org.eclipse.elk.algorithm` på **hver knude, der har
børn**, og erstatter enhver deklareret værdi, og `org.eclipse.elk.randomSeed = 1` på roden. ELK
afgør algoritmen pr. knude, og en knude uden værdi falder tilbage til layered. En rod uden
børn får kun seedet. Retarget-tieren springer hver models egen `rootAlgorithm` over (native-
tieren dækker den).

## 2. Overensstemmelseskrav

AD-4, præcis som `compareLayout(expected, actual, { tol })` implementerer det:

| Regel                     | Adfærd                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerance                 | Absolut, `DEFAULT_TOLERANCE = 1e-6`; endelige tal består, når `abs(e - a) <= tol`                                                                                                 |
| Ikke-endelige tal         | `NaN` og `±Infinity` skal være nøjagtigt ens (`Object.is` eller `===`), selv med `tol: Infinity`                                                                                  |
| Strenge, booleans, `null` | Strengt ens, ellers `value`                                                                                                                                                       |
| Typeuoverensstemmelse     | Forskellige JSON-arter (`null`, array, objekt, tal, streng, boolean) giver én `type`-diff                                                                                         |
| Objektnøgler              | Nøglemængden skal være identisk: en nøgle kun i expected er `missing`, kun i actual er `extra`                                                                                    |
| Arrays                    | Matches **efter `id`**, når hvert element på begge sider er et objekt med et streng-`id`, og id'erne er unikke pr. side (et tomt array tæller som nøglet); ellers **positionelt** |
| Nøglede arrays            | Et id kun på den ene side er en `structure`-diff ved `path[id=<id>]`; rækkefølgen ignoreres                                                                                       |
| Positionelle arrays       | En længdeforskel er én `structure`-diff, og elementerne sammenlignes ikke videre                                                                                                  |
| Diff-arter                | `structure`, `value`, `type`, `missing`, `extra`; `path` er JSON-sti-lignende (`children[id=n1].x`)                                                                               |

Konsekvenser: element-id'er, elementantal, kantsektionstopologi og
antal knækpunkter er nøjagtige, fordi id'er og array-længder er nøjagtige;
koordinater og størrelser får `1e-6`. `formatDiffs` udskriver højst 20 diffs.

**Politik for kendte afvigelser.** En afvigelse absorberes aldrig ved at hæve `tol`
eller redigere et golden (AD-13). Hver enkelt registreres her med sin årsag og den
test eller fixture, den berører. Accepterede klasser:

- **`Math.*`-forskelle på ulp-niveau.** V8 og JVM'en kan afvige i sidste bit
  af `sin`, `cos`, `exp`, `log`, `pow` og lignende; Javas `StrictMath` er specificeret
  bitnøjagtigt, `Math` er ikke. Tilfældet, der allerede er opstået: `nextGaussian`
  er specificeret til at bruge `StrictMath.log`, så `src/java/util/Random.ts` bærer en
  `StrictMath.log`-nøjagtig implementering i stedet for `Math.log`. Foretræk en
  bitnøjagtig portering af `StrictMath`-algoritmen frem for at udvide tolerancen.
- **Iteration over identitets-hash (AD-10).** Iteration over en `HashMap`/`HashSet` med
  identitets-hashede nøgler er ikke-deterministisk i selve Java. Journalfør stedet
  og porter med indsættelsesrækkefølge; goldens må ikke afhænge af det.
  Værdi-hashede nøgler (String, Integer) skal reproducere Java-rækkefølgen.
- **Tidsseedet `Random`.** Med `randomSeed = 0` seeder ELK fra uret
  (`core/Core.melk:608`), så outputtet kan ikke reproduceres. Golden-input skal
  lade seedet være usat eller forskelligt fra nul (layereds standardseed er `1`).

Konkrete poster (tilføj kun én med brugerens godkendelse):

| #   | Afvigelse                     | Årsag                                                                         | Omfang                                                                                                                                                     | Godkendt               |
| --- | ----------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Tekst i parse-fejlmeddelelser | ANTLR-meddelelser er artefakter af den genererede parser, som aldrig porteres | Ugyldigt grammatikinput (`.elkt`, `.elkj`, `.elkr`): kun _forekomsten_ af en parse-fejl skal matche, ikke meddelelsen. Gyldigt input skal matche nøjagtigt | D8, bruger, 2026-10-11 |

**Domme.** Hvert tilfælde får én dom ud fra to separate JVM-kørsler af oraklet (D4, D5, OR-2):

| Dom                | Betydning                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Begge kørsler lagde modellen ud, og outputfilerne er byte-identiske                                                                                                                          |
| `throws`           | Begge kørsler kastede samme exception: præcis samme klasse og præcis samme meddelelse, efter at `@[0-9a-f]+` er blevet til `@<hash>` (meddelelsen må være null, f.eks. `StackOverflowError`) |
| `nondeterministic` | Kørslerne er uenige (outputbytes, exception, eller én `ok` og én `throws`)                                                                                                                   |
| `oracle-error`     | Fejl i harnessen (ulæseligt input, ukendt variant/algoritme/indstilling, mistet resultatlinje); aldrig acceptabel                                                                            |
| `timeout`          | En kørsel overskred `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                                   |

Forrang: `oracle-error`, derefter `timeout`, derefter `ok`/`throws` når de er ens, ellers
`nondeterministic`. Før bytesammenligningen erstattes hvert `@[0-9a-f]+`-token i begge outputs
med `@<hash>`, som i exception-meddelelser (D5a; `sameOutput` i `tools/corpus/sweep.ts`).
Årsag: discos programmatiske `debug.discoGraph`-indstilling eksporterer `...DCGraph@<identity hash>`,
som intet seed kan fastlåse. TS-komparatoren anvender samme erstatning. Ikke-deterministiske tilfælde
rapporteres separat og udelades af bestået-tallene, i tråd med identitets-hash-politikken ovenfor.

Reelle resterende kilder til `nondeterministic` (ELK-adfærd, ikke harness-fejl; antallene står i
paritetsrapporten): spore (`ElkGraphImporter.java:169` jitterer med `Math.random`) og `random`
(standard-`randomSeed` 0 er unseedet på indlejrede composites; retarget seeder kun roden, D2,
bevaret efter brugerens beslutning). Eksportørens `_g<random>`-id-omdøbninger er ikke en kilde: seam-
patchet retter dem.

## 3. Goldens og korpus

AD-5. Referenceoutput er committet, så CI ikke behøver en JVM.

| Element         | Hvor                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Fastlåst korpus | `eclipse-elk/elk-models` ved `commit` i `test/corpus/manifest.json` (ikke vendoret)             |
| Modelmappe      | `$ELK_MODELS_DIR`, standard `../../eclipse-elk/elk-models` relativt til dette repository        |
| Kurateret sæt   | `golden[]` i `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Refs            | `test/golden/refs/elk/<id>.json`, én pr. manifest-`id`                                          |
| Proveniens      | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Afbildning fra id til sti.** `golden[].path` er relativ til `$ELK_MODELS_DIR`, og
inputtet er `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` kører harnessen på
disse input og lægger hvert `<basename>.json`-output som `refs/elk/<id>.json`.
Eksempel: id'et `ptolemy-scrambler` er
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerering** (`tools/oracle/regen-goldens.sh`):

1. Kræver, at models-klonen står præcis på manifest-committet (ellers exit `1`).
2. Kræver et bygget orakel (`run.sh` har brug for `oracle-build.json`).
3. Stager alle refs og `_meta.json` i `test/golden/refs/.elk-staging.*` og
   bytter derefter mappen ud med to omdøbninger, så en fejlet kørsel efterlader de gamle refs.
4. `_meta.json` har ingen tidsstempler (`builtAt` bliver i `oracle-build.json`), så en
   regenerering uden ændrede input er en byte-for-byte no-op i git.

**Hvornår der skal regenereres:** efter ændring af `ELK_COMMIT`, patch-serien,
manifestets `golden[]`-sæt eller `commit`, eller harnessen. Aldrig ellers.

**Journalføringsregel.** Hver regenerering, der ændrer en ref, journalføres med
årsagen (patch-id'et eller commit-hævningen). Refs redigeres aldrig i hånden. Hvis en
TS-assertion eller et golden kun kan bestå ved at blive ændret, så stop og journalfør (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` lægger intet ud: den kører oraklet i parse-tilstand
over hver model og sammenligner resultatet med den committede `test/corpus/census.json` (898
modeller: id, formater, kilde, rodalgoritme, egenskabsantal). Exit `0` når ens, `1` ved drift;
`--write` omskriver filen. Den kører kun i den fastlåste models-klon og afbryder ved en
harness-fejl.

**Genereret korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` indeholder en seedet
grandom-konfiguration; dens søskende-`.json` er det oracle-genererede, ikke-udlagte input. Ni konfigurationer dækker
de algoritme-id'er, som ingen elk-models-model bruger: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Hver har højst 50 knuder og
ingen kantetiketter (`BlindTextGenerator` er unseedet). Harnessen navngiver den genererede rod `root`,
fordi ELK's `JsonExporter` løser en id-kollision med et unseedet tilfældigt suffiks. Regenerer
kun med `tools/oracle/regen-generated.sh` (staging-mappe og omdøbning; en konfiguration, der fejler,
efterlader de gamle filer); en gentagelse uden ændringer er en git-no-op. TS-grandom-porteringen skal
reproducere disse `.json`-filer byte for byte; algoritme-goldens afhænger aldrig af den.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planlægger hvert tilfælde, kører hvert to gange i separate JVM'er (shards
er som standard `min(cpus, 8)` samtidige `run.sh`-processer) og skriver
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` udskriver tilfældeantal pr. tier og kører intet; `--filter` beholder tilfælde-id'er, der indeholder
delstrengen; `--limit` tager en stikprøve med lige stride. Exit `0` medmindre et tilfælde er `oracle-error`
(`1`); en værktøjsfejl afslutter med `2`. Output pr. tilfælde forbliver lokalt (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(standard `30000`, læses kun af `tools/`) begrænser hvert tilfælde; `run.sh` genstarter en JVM efter en
timeout (JVM-exitkode 75) på de tilfælde, der mangler en resultatlinje.

**Paritetsrapport (D9).** `docs/parity-report.md` genereres fra sweep-cachen og committes:
antal pr. algoritme og dom, med ELK- og models-commits og uden tidsstempler. Regenerer
med `npx tsx tools/corpus/parity-report.ts --write`; uden `--write` afslutter kommandoen med `1`,
når den committede rapport er forældet. Redigér den aldrig i hånden.

**Korpustests.** `resolveModelsDir()` i `test/corpus/corpus.ts` returnerer en
`skip`-årsag, når klonen mangler eller står på et andet commit; tests, der har brug for den,
springes over med den fastlåste sha i meddelelsen. I dag kontrollerer `test/golden/oracle-refs.test.ts`
kun de committede refs: én pr. manifest-id, geometri på hver knude,
port, etiket og kant, selvsammenligning, og at `_meta.json` matcher
`ELK_COMMIT`, manifestet og generatoren. Der er endnu ingen TS-mod-orakel-layouttest;
den kommer med den første portede algoritme.

## 4. Seam-patches

Seam-patches ændrer oraklet; de er sjældne og altid parret med et TS-seam.

1. Redigér og commit i orakel-worktreet (`$ELK_ORACLE_DIR`), eller skriv patchet i en scratch-
   klon ved `ELK_COMMIT`. For at tilføje et færdigt patch til det eksisterende worktree på stedet (bevarer
   `census/`- og `sweep/`-cachene, som fjernelse af worktreet sletter), anvend det med
   `build.sh`'s identitet:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verificerer så serien og genbygger på stedet (cirka 3 minutter), så trin 4-5
   kan springes over.
2. Eksportér:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (eller kun de nye commits). Filerne hedder `NNNN-<slug>.patch`; det numeriske
   præfiks fastlægger anvendelsesrækkefølgen.
3. Tilføj det tilsvarende TS-seam (samme adfærd, injicerbart, i `src/`), med tests,
   hvis forventede værdier kommer fra det patchede orakel (AD-13).
4. Ellers fjern worktreet: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (tilføj `--force`, hvis build-output gør det beskidt).
5. Genbyg: `tools/oracle/build.sh` (anvender serien forfra).
6. Regenerer: `tools/oracle/regen-goldens.sh`; gennemgå `git diff test/golden/refs`.
7. Journalfør en post, der nævner patchet (`NNNN-<slug>.patch`) og angiver hver
   ref, der ændrede sig. `patches` i `_meta.json` registrerer serien automatisk.

Efterlad aldrig en ucommittet ændring i worktreet: `build.sh` behandler den som forældet
(exit `2`). Redigér aldrig selve `ELK_SOURCE_DIR`.

## 5. Orakeldrift (runbook)

| Fejl                                                                               | Registrering                                                                                                                                                                                                                                                                            | Afhjælpning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-build fejler (p2 utilgængelig, JDK, Maven-version)                           | `tools/oracle/build.sh` afslutter med en værdi forskellig fra nul; fuldt Maven-output i `.oracle-build.log` i repoets rod. Exit `1` er et manglende værktøj eller forkert Maven; exit `3` betyder, at en bundle-jar ikke blev produceret                                                | Maven skal være **3.9.x**: Tycho 4.0.12 fejler på Maven 3.10 (Homebrews 3.10.0) med `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. En lokal 3.9.11 ligger i `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Brug JDK 21, eller JDK 17 via `JAVA_HOME`. Tjek netværket (første kørsel henter p2-artefakter), og kør igen. `build.sh --record-only` springer Maven over og omskriver kun `oracle-build.json` fra jar-filer, der allerede er bygget. Exit `2`: fjern worktreet (afsnit 4 trin 4) og genbyg. Ellers eskalér med slutningen af loggen |
| `build.sh` afslutter med `2` lige efter anvendelse af et patch                     | Worktree meldt som forældet                                                                                                                                                                                                                                                             | `build.sh` folder indpakkede patch-emnelinjer ud (`git format-patch` ombryder dem efter cirka 78 tegn) og ignorerer de usporede `census/`- og `sweep/`-caches; andet snavs eller et ikke-opført patch giver stadig exit `2`: ret worktreet (afsnit 4)                                                                                                                                                                                                                                                                                                                                                                                                    |
| Golden-drift efter et patch eller en commit-hævning                                | `tools/oracle/regen-goldens.sh` efterfulgt af `git diff --exit-code test/golden/refs` er ikke tom; `test/golden/oracle-refs.test.ts` fejler på en forældet `_meta.json` (`elkCommit`, `modelsCommit`); en TS-overensstemmelsestest fejler, når den findes, med en `formatDiffs`-rapport | Genbyg (`build.sh`), kør `regen-goldens.sh`, gennemgå diffen, journalfør patch-id'et. Redigér aldrig en ref i hånden og løsn aldrig `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Xtext/ANTLR-jar mangler i p2-cachen (`.elkt`, `.elkr` eller enhver `run.sh`-start) | `run.sh` afslutter med en værdi forskellig fra nul og `bundle <name> not in p2 cache <dir>` (f.eks. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                | Sæt `P2_BUNDLES` til den Tycho-p2-cache, der indeholder den, eller kør `build.sh` med netværksadgang, så Tycho henter den; kør `run.sh` igen. Erstat ikke med jar-filer fra andre steder                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sweep hænger eller OOM                                                             | Et tilfælde kører til timeout og rapporterer `timeout` (en stderr-linje nævner det); en kørsel uden resultatlinje giver `oracle-error` og `sweep: shard <n> run <A or B> exited <code>` på stderr; maskinen swapper under 8 samtidige JVM'er                                            | Sænk samtidighed og batchstørrelse: `sweep.sh --shards 2`, indsnævr med `--filter` eller `--limit`. Hæv kun `ELK_SWEEP_TIMEOUT_MS` for en model, der er langsom, men korrekt. En reproducerbar `timeout` er et fund: journalfør tilfælde-id'et, udvid ikke grænsen for at skjule det                                                                                                                                                                                                                                                                                                                                                                     |
| Census-drift efter en pin-hævning (`ELK_COMMIT` eller models-`commit`)             | `npx tsx tools/corpus/census.ts` afslutter med `1` og lister de afvigende modeller; `test/corpus/census.test.ts` fejler                                                                                                                                                                 | Bekræft, at klonen og oraklet står på de nye pins, kør `census.ts --write` igen, gennemgå `git diff test/corpus/census.json`, journalfør årsagen, kør så `sweep.sh` igen og regenerer paritetsrapporten. Redigér aldrig census i hånden                                                                                                                                                                                                                                                                                                                                                                                                                  |
| elk-models mangler eller forkert sha                                               | Korpustests springes over med en meddelelse, der nævner den forventede sha; `regen-goldens.sh` afslutter med `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                         | Kør `test/corpus/fetch.sh` (kloner og checker det fastlåste commit ud). Den afslutter med `2`, hvis en eksisterende klon står på et andet commit, og rører den ikke: ret selv den klon, eller peg `ELK_MODELS_DIR` på en ny sti. Flyt aldrig HEAD på en eksisterende klon fra et script                                                                                                                                                                                                                                                                                                                                                                  |

Andre `run.sh`-fejl: `oracle-build.json missing` eller `oracle jar missing`
betyder, at du skal køre `build.sh` først; `bundle <name> not in p2 cache` betyder, at du skal sætte
`P2_BUNDLES` til Tycho-p2-cachen eller køre `build.sh` igen med netværksadgang.

## 6. Gates

Hver ændring:

| Gate              | Kommando                                                    | Krav                                                                           |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Typer             | `npm run typecheck`                                         | exit 0                                                                         |
| Tests og coverage | `npm run coverage`                                          | alle tests består; 90 % statements, branches, functions og lines over `src/**` |
| Arkitektur        | `test/architecture/*.fitness.test.ts` (køres af `npm test`) | modulgrænser, modulglobaler, ingen Node-builtins i `src/`, SPDX-headere        |
| Orakel-refs       | `test/golden/oracle-refs.test.ts`                           | committede refs er konsistente med manifestet og `ELK_COMMIT`                  |

Ændringer i `tools/oracle/`, manifestet eller patch-serien kræver desuden:

| Gate              | Kommando                                                                          | Krav                                                               |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Orakel-build      | `tools/oracle/build.sh`                                                           | exit 0                                                             |
| Orakel-kørsel     | `tools/oracle/run.sh <outDir> <input.json>...`                                    | exit 0, ingen `ERROR`-linjer                                       |
| Golden-stabilitet | `tools/oracle/regen-goldens.sh`, derefter `git diff --exit-code test/golden/refs` | ingen diff, medmindre ændringen skal flytte refs og er journalført |
| Shell             | `shellcheck tools/oracle/*.sh`                                                    | ren                                                                |

Ændringer i `tools/oracle/` eller `tools/corpus/` kræver desuden:

| Gate                 | Kommando                                                                                 | Krav                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Census               | `npx tsx tools/corpus/census.ts`                                                         | exit 0 (ingen drift)                                          |
| Genereret stabilitet | `tools/oracle/regen-generated.sh`, derefter `git diff --exit-code test/corpus/generated` | ingen diff                                                    |
| Sweep                | `tools/oracle/sweep.sh` (eller `--filter`/`--limit` for en stikprøve)                    | exit 0: ingen `oracle-error`                                  |
| Paritetsrapport      | `npx tsx tools/corpus/parity-report.ts`                                                  | exit 0 (committet rapport er aktuel); regenerer med `--write` |
