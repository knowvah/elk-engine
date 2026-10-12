---
title: Samsvar
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Samsvar: hva «match» betyr

@knowvah/elk-engine valideres mot oppstrøms Eclipse ELK (Java) bygd fra
kildekode. Et TypeScript-layout er **samsvarende** med orakelet når strukturen og hver ikke-numerisk
verdi er nøyaktig like, og hvert endelig tall stemmer innenfor en absolutt toleranse på `1e-6`,
etter at begge er parset som ELK JSON.
Komparatoren er [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
dette dokumentet beskriver hva den implementerer. Porteringsreglene står i
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Seksjon                                   | Svarer på                                        |
| --- | ----------------------------------------- | ------------------------------------------------ |
| 1   | [Orakel](#1-orakel)                       | Hva er «riktig», og ved hvilken commit?          |
| 1a  | [Samsvarsenhet](#1a-samsvarsenhet)        | Hva er ett tilfelle, og hvilke tilfeller finnes? |
| 2   | [Samsvarskrav](#2-samsvarskrav)           | Hva regnes som likt?                             |
| 3   | [Goldens og korpus](#3-goldens-og-korpus) | Hvor kommer referanseutdataene fra?              |
| 4   | [Seam-patcher](#4-seam-patcher)           | Hvordan endrer vi orakelet?                      |
| 5   | [Orakeldrift](#5-orakeldrift-runbook)     | Hva gjør jeg når det slutter å fungere?          |
| 6   | [Gates](#6-gates)                         | Hva må bestå før en endring kan landes?          |

## 1. Orakel

Orakelet (AD-3) er oppstrøms ELK **bygd fra kildekode** i et frakoblet git-worktree av
`$ELK_SOURCE_DIR`, opprettet i `$ELK_ORACLE_DIR` av `tools/oracle/build.sh`.
Begge ligger utenfor dette repositoriet; ingen av dem er vendoret.

| Element           | Plassering                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- |
| Festet ELK-commit | `tools/oracle/ELK_COMMIT` (for tiden `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)        |
| Patch-serie       | `tools/oracle/patches/*.patch`, anvendt i leksikalsk rekkefølge med `git am --3way`     |
| Bygg              | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho laster ned p2-artefakter)          |
| Batch-kjører      | `tools/oracle/run.sh <outDir> <input>...` eller `run.sh --cases <cases.jsonl> <outDir>` |
| Harness           | `tools/oracle/harness/ElkOracle.java`                                                   |
| Byggmanifest      | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patcher, JDK, jar per bundle)              |

**Bygg.** `build.sh` kjører `mvn -P elk-meta clean install -DskipTests` (melk-kompilatoren) og
deretter `mvn clean install -DskipTests -Dmaven.test.skip=true` fra `build/` i worktreet, og
registrerer så jar-filen til hver bundle i omfanget
(`core`, `graph`, `graph.json`, `alg.common`, og algoritmene `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex`) i `oracle-build.json`. Et eksisterende worktree gjenbrukes
bare hvis det stammer fra `ELK_COMMIT`, har nøyaktig de patch-emnene som står i
`tools/oracle/patches/`, og er rent bortsett fra byggutdata; ellers
avslutter `build.sh` med `2` og lar det være urørt.

**Kjøring.** `run.sh` kompilerer `ElkOracle.java` mot bundle-jarene pluss
tredjepartsbundlene (Gson, Guava, EMF, Xtext/Xtend-biblioteker) fra Tycho p2-cachen
(`P2_BUNDLES`, standard `~/.m2/repository/p2/osgi/bundle`; den nyeste
versjonen av hver brukes). Én JVM legger ut hver inndata med
`RecursiveGraphLayoutEngine` og skriver `<outDir>/<input basename>.json`
med layout, nulldimensjoner og nullposisjoner inkludert, og ukjente layoutalternativer
utelatt. En inndata som feiler skriver ut `ERROR <input>: <message>`; JVM-en
avslutter med `1` hvis noen inndata feilet. Basenavnene på inndata må være unike innenfor én
kjøring, siden utdatanavnet er basenavnet.

**Semantikk for patch-serien.** Serien inneholder én patch i dag:

| Patch                                                                   | Effekt                                                                                                                                                                                                                            | Paret TS-seam                                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` løser id-kollisjoner med `"_g" + Random.nextInt(1000000)`; patchen seeder denne `Random` fra systemegenskapen `org.eclipse.elk.graph.json.exportSeed` (ikke satt = ELK-oppførsel). `run.sh` sender `EXPORT_SEED=1` | Injiserbar `Random` i `graph.json`-porteringen; venter på den porteringen (TS-`Random`-shimen reproduserer allerede strømmen: seed 1 gir 548985, 764588) |

Patcher finnes bare for å legge til snevert avgrensede seams som gjør JVM- og JS-oppførsel sammenlignbar;
hver er paret med en TS-side-seam (seksjon 4).

**Hvorfor ikke elkjs?** elkjs er ELK kompilert av GWT. Den kan ikke bære patch-serien vår,
og GWT-emuleringen av JRE-en avviker fra JVM-en vi porterer fra.
Den brukes ikke som orakel.

## 1a. Samsvarsenhet

Et **tilfelle** er `(algorithm, model, variant)` (D1). Paritetsdashbordet har én rad per
layoutalgoritme; elk-models-mappen og census-egenskapene er filtre, ikke rader.

**Tilfelle-id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, for eksempel
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` er algoritme-id-en
uten `org.eclipse.elk.`. For genererte modeller er `modelId` `generated/<name>`.

**Modell-id og kilde (D3).** Modell-id-en er stien i elk-models uten filendelse.
Et tilfelle leser `.json` når den finnes, ellers `.elkt`; `.elkg` (EMF XMI) leses aldri.

**Varianter (D6).** Navngitte alternativoverlegg i `test/corpus/variants.json`, anvendt på roten:
`default` (ingen), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritme                                     | Modeller                          | Varianter             |
| ------------ | --------------------------------------------- | --------------------------------- | --------------------- |
| native       | modellens egen `rootAlgorithm`                | hver census-modell                | alle sju              |
| retarget     | hver oppført algoritme unntatt modellens egen | hver census-modell                | bare `default` (OR-1) |
| generated    | algoritmen som er navngitt av filprefikset    | `test/corpus/generated/*.json`    | alle sju              |
| ported JUnit | per algoritme-mission                         | oppstrøms JUnit-tilfeller (AD-13) | som portert           |

`tools/oracle/run.sh --list-algorithms` er listen over algoritme-id-er (14 i dag).

**Retarget (D2).** Harnessen setter `org.eclipse.elk.algorithm` på **hver node som har
barn**, og erstatter enhver deklarert verdi, og `org.eclipse.elk.randomSeed = 1` på roten. ELK
løser algoritmen per node, og en node uten verdi faller tilbake til layered. En rot uten
barn får bare seeden. Retarget-tieren hopper over hver models egen `rootAlgorithm` (native-tieren
dekker den).

## 2. Samsvarskrav

AD-4, nøyaktig slik `compareLayout(expected, actual, { tol })` implementerer det:

| Regel                      | Oppførsel                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toleranse                  | Absolutt, `DEFAULT_TOLERANCE = 1e-6`; endelige tall består når `abs(e - a) <= tol`                                                                                                 |
| Ikke-endelige tall         | `NaN` og `±Infinity` må være nøyaktig like (`Object.is` eller `===`), selv med `tol: Infinity`                                                                                     |
| Strenger, booleans, `null` | Strengt like, ellers `value`                                                                                                                                                       |
| Typeavvik                  | Ulike JSON-typer (`null`, array, objekt, tall, streng, boolean) gir ett `type`-diff                                                                                                |
| Objektnøkler               | Nøkkelsettet må være identisk: en nøkkel bare i expected er `missing`, bare i actual er `extra`                                                                                    |
| Arrayer                    | Matches **etter `id`** når hvert element på begge sider er et objekt med en streng-`id` og id-ene er unike per side (en tom array regnes som nøkkelbasert); ellers **posisjonelt** |
| Nøkkelbaserte arrayer      | En id på bare én side er et `structure`-diff ved `path[id=<id>]`; rekkefølgen ignoreres                                                                                            |
| Posisjonelle arrayer       | En lengdeforskjell er ett `structure`-diff, og elementene sammenlignes ikke videre                                                                                                 |
| Diff-typer                 | `structure`, `value`, `type`, `missing`, `extra`; `path` er JSON-sti-aktig (`children[id=n1].x`)                                                                                   |

Konsekvenser: element-id-er, elementantall, kantseksjonstopologi og
antall knekkpunkter er nøyaktige fordi id-er og array-lengder er nøyaktige;
koordinater og størrelser får `1e-6`. `formatDiffs` skriver ut høyst 20 diffs.

**Policy for kjente avvik.** Et avvik absorberes aldri ved å heve `tol`
eller redigere en golden (AD-13). Hvert avvik registreres her med årsak og
testen eller fixturen det påvirker. Godtatte klasser:

- **`Math.*`-forskjeller på ulp-nivå.** V8 og JVM-en kan avvike i siste bit
  av `sin`, `cos`, `exp`, `log`, `pow` og lignende; Javas `StrictMath` er
  spesifisert bitnøyaktig, `Math` er det ikke. Tilfellet som allerede har oppstått: `nextGaussian`
  er spesifisert til å bruke `StrictMath.log`, så `src/java/util/Random.ts` har en
  `StrictMath.log`-nøyaktig implementasjon i stedet for `Math.log`. Foretrekk en
  bitnøyaktig portering av `StrictMath`-algoritmen framfor å utvide toleransen.
- **Iterasjon over identitetshash (AD-10).** Å iterere over et `HashMap`/`HashSet` med
  identitetshashede objekter som nøkler er ikke-deterministisk i Java selv. Journalfør
  stedet og porter med innsettingsrekkefølge; goldens må ikke avhenge av det.
  Verdihashede nøkler (String, Integer) må reprodusere Java-rekkefølgen.
- **Tidsseedet `Random`.** Med `randomSeed = 0` seeder ELK fra klokken
  (`core/Core.melk:608`), så utdataene er ikke reproduserbare. Golden-inndata må
  la seeden stå usatt eller ulik null (standard seed for layered er `1`).

Konkrete oppføringer (legg til en bare med brukerens godkjenning):

| #   | Avvik                     | Årsak                                                                       | Omfang                                                                                                                                                       | Godkjent               |
| --- | ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 1   | Tekst i parse-feilmelding | ANTLR-meldinger er artefakter av den genererte parseren, som aldri porteres | Ugyldig grammatikk-inndata (`.elkt`, `.elkj`, `.elkr`): bare _forekomsten_ av en parse-feil må samsvare, ikke meldingen. Gyldig inndata må samsvare nøyaktig | D8, bruker, 2026-10-11 |

**Dommer.** Hvert tilfelle får én dom fra to separate JVM-kjøringer av orakelet (D4, D5, OR-2):

| Dom                | Betydning                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Begge kjøringene la ut modellen, og utdatafilene er byte-identiske                                                                                                         |
| `throws`           | Begge kjøringene kastet samme unntak: nøyaktig klasse, og nøyaktig melding etter at `@[0-9a-f]+` blir til `@<hash>` (meldingen kan være null, f.eks. `StackOverflowError`) |
| `nondeterministic` | Kjøringene er uenige (utdata-bytes, unntak, eller én `ok` og én `throws`)                                                                                                  |
| `oracle-error`     | Feil i harnessen (uleselig inndata, ukjent variant/algoritme/alternativ, tapt resultatlinje); aldri akseptabelt                                                            |
| `timeout`          | En kjøring overskred `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                |

Prioritet: `oracle-error`, deretter `timeout`, deretter `ok`/`throws` når like, ellers
`nondeterministic`. Før byte-sammenligningen erstattes hvert `@[0-9a-f]+`-token i begge utdataene
med `@<hash>`, som i unntaksmeldinger (D5a; `sameOutput` i `tools/corpus/sweep.ts`).
Årsak: discos programmatiske `debug.discoGraph`-alternativ eksporterer `...DCGraph@<identity hash>`,
som ingen seed kan feste. TS-komparatoren anvender samme erstatning. Ikke-deterministiske tilfeller
rapporteres separat og holdes utenfor bestått-tallene, i tråd med identitetshash-policyen ovenfor.

Reelle gjenværende kilder til `nondeterministic` (ELK-oppførsel, ikke harness-feil; antallene står i
paritetsrapporten): spore (`ElkGraphImporter.java:169` jitrer med `Math.random`) og `random`
(standard `randomSeed` 0 er useedet på nestede composites; retarget seeder bare roten, D2,
beholdt etter brukerens beslutning). Eksportørens `_g<random>`-id-omdøpinger er ikke en kilde: seam-patchen
fikser dem.

## 3. Goldens og korpus

AD-5. Referanseutdata er innsjekket slik at CI ikke trenger JVM.

| Element       | Plassering                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Festet korpus | `eclipse-elk/elk-models` ved `commit` i `test/corpus/manifest.json` (ikke vendoret)             |
| Modellmappe   | `$ELK_MODELS_DIR`, standard `../../eclipse-elk/elk-models` relativt til dette repoet            |
| Kuratert sett | `golden[]` i `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Refs          | `test/golden/refs/elk/<id>.json`, én per manifest-`id`                                          |
| Proveniens    | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Kobling fra id til sti.** `golden[].path` er relativ til `$ELK_MODELS_DIR`, og
inndata er `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` kjører harnessen på
disse inndataene og stager hver `<basename>.json`-utdata som `refs/elk/<id>.json`.
Eksempel: id `ptolemy-scrambler` er
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerering** (`tools/oracle/regen-goldens.sh`):

1. Krever at models-klonen står på nøyaktig manifest-committen (ellers exit `1`).
2. Krever et bygd orakel (`run.sh` trenger `oracle-build.json`).
3. Stager alle refs og `_meta.json` i `test/golden/refs/.elk-staging.*`, og
   bytter deretter mappen med to omdøpinger, slik at en kjøring som feiler lar de gamle refs stå.
4. `_meta.json` har ingen tidsstempler (`builtAt` blir i `oracle-build.json`), så en
   regenerering uten endrede inndata er en byte-for-byte no-op i git.

**Når du skal regenerere:** etter endring av `ELK_COMMIT`, patch-serien, manifestets
`golden[]`-sett eller `commit`, eller harnessen. Aldri ellers.

**Journalføringsregel.** Hver regenerering som endrer en ref journalføres med
årsaken (patch-id-en, eller commit-oppdateringen). Refs redigeres aldri for hånd. Hvis en
TS-assertion eller golden bare kan bestå ved å endres, stopp og journalfør (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` legger ikke ut noe: den kjører orakelet i parse-modus
over hver modell og sammenligner resultatet med den innsjekkede `test/corpus/census.json` (898
modeller: id, formater, kilde, rotalgoritme, egenskapsantall). Exit `0` når like, `1` ved drift;
`--write` skriver filen på nytt. Den kjører bare i den festede models-klonen og avbryter ved en
harness-feil.

**Generert korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` inneholder en seedet
grandom-konfigurasjon; søsken-`.json` er den orakelgenererte inndataen uten layout. Ni konfigurasjoner dekker
algoritme-id-ene som ingen elk-models-modell bruker: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Hver har høyst 50 noder og
ingen kantetiketter (`BlindTextGenerator` er useedet). Harnessen kaller den genererte roten `root`,
fordi ELKs `JsonExporter` løser en id-kollisjon med et useedet tilfeldig suffiks. Regenerer
bare med `tools/oracle/regen-generated.sh` (stagingmappe og omdøping; en konfigurasjon som feiler
lar de gamle filene stå); en ny kjøring uten endringer er en git-no-op. TS-grandom-porteringen må
reprodusere disse `.json`-filene byte for byte; algoritme-goldens avhenger aldri av den.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planlegger hvert tilfelle, kjører hvert to ganger i separate JVM-er (shards er som
standard `min(cpus, 8)` samtidige `run.sh`-prosesser), og skriver
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` skriver ut tilfelleantall per tier og kjører ingenting; `--filter` beholder tilfelle-id-er som inneholder
delstrengen; `--limit` tar et utvalg med jevn steglengde. Exit `0` med mindre et tilfelle er `oracle-error`
(`1`); en verktøyfeil gir exit `2`. Utdata per tilfelle blir lokale (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(standard `30000`, leses bare av `tools/`) begrenser hvert tilfelle; `run.sh` starter en JVM på nytt etter en
timeout (JVM-exitkode 75) for tilfellene uten resultatlinje.

**Paritetsrapport (D9).** `docs/parity-report.md` genereres fra sweep-cachen og sjekkes inn:
antall per algoritme og dom, med ELK- og models-commitene og uten tidsstempler. Regenerer
med `npx tsx tools/corpus/parity-report.ts --write`; uten `--write` avslutter kommandoen med `1`
når den innsjekkede rapporten er utdatert. Rediger den aldri for hånd.

**Korpustester.** `resolveModelsDir()` i `test/corpus/corpus.ts` returnerer en
`skip`-årsak når klonen mangler eller står på en annen commit; tester som trenger
den hoppes over, med den festede sha-en i meldingen. I dag sjekker `test/golden/oracle-refs.test.ts`
bare de innsjekkede refs: én per manifest-id, geometri på hver node,
port, etikett og kant, selvsammenligning, og at `_meta.json` stemmer med
`ELK_COMMIT`, manifestet og generatoren. Det finnes ingen TS-mot-orakel-layouttest
ennå; den kommer med den første porterte algoritmen.

## 4. Seam-patcher

Seam-patcher endrer orakelet; de er sjeldne og alltid paret med en TS-seam.

1. Rediger og commit i orakel-worktreet (`$ELK_ORACLE_DIR`), eller forfatt patchen i en scratch-klon på
   `ELK_COMMIT`. For å legge en ferdig patch til det eksisterende worktreet på stedet (beholder
   `census/`- og `sweep/`-cachene, som slettes når worktreet fjernes), anvend den med
   `build.sh`s identitet:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verifiserer deretter serien og bygger på nytt på stedet (omtrent 3 minutter), så trinn 4-5
   kan hoppes over.
2. Eksporter:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (eller bare de nye commitene). Filene heter `NNNN-<slug>.patch`; det numeriske
   prefikset fastsetter anvendelsesrekkefølgen.
3. Legg til den tilsvarende TS-seamen (samme oppførsel, injiserbar, i `src/`), med tester
   hvis forventede verdier kommer fra det patchede orakelet (AD-13).
4. Ellers fjern worktreet: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (legg til `--force` hvis byggutdata gjør det skittent).
5. Bygg på nytt: `tools/oracle/build.sh` (anvender serien på nytt fra bunnen).
6. Regenerer: `tools/oracle/regen-goldens.sh`; gå gjennom `git diff test/golden/refs`.
7. Journalfør en oppføring som navngir patchen (`NNNN-<slug>.patch`) og lister hver
   ref som endret seg. `patches` i `_meta.json` registrerer serien automatisk.

La aldri en ukommittet endring stå i worktreet: `build.sh` behandler det som utdatert
(exit `2`). Rediger aldri `ELK_SOURCE_DIR` selv.

## 5. Orakeldrift (runbook)

| Feil                                                                                | Oppdagelse                                                                                                                                                                                                                                                                     | Tiltak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tycho-bygg feiler (p2 utilgjengelig, JDK, Maven-versjon)                            | `tools/oracle/build.sh` avslutter med ikke-null; full Maven-utdata i `.oracle-build.log` i repo-roten. Exit `1` er et manglende verktøy eller feil Maven; exit `3` betyr at en bundle-jar ikke ble produsert                                                                   | Maven må være **3.9.x**: Tycho 4.0.12 feiler på Maven 3.10 (Homebrews 3.10.0) med `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. En lokal 3.9.11 ligger i `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Bruk JDK 21, eller JDK 17 via `JAVA_HOME`. Sjekk nettverket (første kjøring laster ned p2-artefakter), og kjør på nytt. `build.sh --record-only` hopper over Maven og skriver bare `oracle-build.json` på nytt fra jar-filer som allerede er bygd. Exit `2`: fjern worktreet (seksjon 4 trinn 4) og bygg på nytt. Ellers eskaler med slutten av loggen |
| `build.sh` avslutter med `2` rett etter at en patch er anvendt                      | Worktree rapportert som utdatert                                                                                                                                                                                                                                               | `build.sh` folder ut brutte patch-emner (`git format-patch` bryter dem over omtrent 78 tegn) og ignorerer de usporede `census/`- og `sweep/`-cachene; annet rusk eller en patch som ikke er oppført gir fortsatt exit `2`: fiks worktreet (seksjon 4)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Golden-drift etter en patch eller commit-oppdatering                                | `tools/oracle/regen-goldens.sh` etterfulgt av `git diff --exit-code test/golden/refs` er ikke tom; `test/golden/oracle-refs.test.ts` feiler på en utdatert `_meta.json` (`elkCommit`, `modelsCommit`); en TS-samsvarstest, når den finnes, feiler med en `formatDiffs`-rapport | Bygg på nytt (`build.sh`), kjør `regen-goldens.sh`, gå gjennom diffen, journalfør patch-id-en. Rediger aldri en ref for hånd og løsne aldri `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Xtext/ANTLR-jar mangler i p2-cachen (`.elkt`, `.elkr`, eller enhver `run.sh`-start) | `run.sh` avslutter med ikke-null og `bundle <name> not in p2 cache <dir>` (f.eks. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                         | Sett `P2_BUNDLES` til Tycho p2-cachen som har den, eller kjør `build.sh` med nettverkstilgang slik at Tycho henter den; kjør `run.sh` på nytt. Ikke bytt inn jar-filer fra andre steder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Sweep henger eller går tom for minne                                                | Et tilfelle kjører til timeout og rapporterer `timeout` (en stderr-linje navngir det); en kjøring uten resultatlinje gir `oracle-error` og `sweep: shard <n> run <A or B> exited <code>` på stderr; maskinen swapper under 8 samtidige JVM-er                                  | Senk samtidigheten og batch-størrelsen: `sweep.sh --shards 2`, avgrens med `--filter` eller `--limit`. Hev `ELK_SWEEP_TIMEOUT_MS` bare for en modell som er treg, men korrekt. En reproduserbar `timeout` er et funn: journalfør tilfelle-id-en, ikke utvid grensen for å skjule det                                                                                                                                                                                                                                                                                                                                                                                     |
| Census-drift etter en pin-oppdatering (`ELK_COMMIT` eller models-`commit`)          | `npx tsx tools/corpus/census.ts` avslutter med `1` og lister modellene som avviker; `test/corpus/census.test.ts` feiler                                                                                                                                                        | Bekreft at klonen og orakelet står på de nye pinene, kjør `census.ts --write` på nytt, gå gjennom `git diff test/corpus/census.json`, journalfør årsaken, kjør så `sweep.sh` på nytt og regenerer paritetsrapporten. Rediger aldri census for hånd                                                                                                                                                                                                                                                                                                                                                                                                                       |
| elk-models mangler eller feil sha                                                   | Korpustester hoppes over med en melding som navngir forventet sha; `regen-goldens.sh` avslutter med `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                         | Kjør `test/corpus/fetch.sh` (kloner og sjekker ut den festede committen). Den avslutter med `2` hvis en eksisterende klone står på en annen commit, og rører den ikke: fiks den klonen selv eller pek `ELK_MODELS_DIR` til en fersk sti. Flytt aldri HEAD på en eksisterende klone fra et skript                                                                                                                                                                                                                                                                                                                                                                         |

Andre `run.sh`-feil: `oracle-build.json missing` eller `oracle jar missing`
betyr at du først må kjøre `build.sh`; `bundle <name> not in p2 cache` betyr at du må sette
`P2_BUNDLES` til Tycho p2-cachen eller kjøre `build.sh` på nytt med nettverkstilgang.

## 6. Gates

Hver endring:

| Gate               | Kommando                                                    | Krav                                                                            |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Typer              | `npm run typecheck`                                         | exit 0                                                                          |
| Tester og coverage | `npm run coverage`                                          | alle tester består; 90 % statements, branches, functions og lines over `src/**` |
| Arkitektur         | `test/architecture/*.fitness.test.ts` (kjørt av `npm test`) | modulgrenser, modul-globaler, ingen Node-builtins i `src/`, SPDX-headere        |
| Orakel-refs        | `test/golden/oracle-refs.test.ts`                           | innsjekkede refs konsistente med manifestet og `ELK_COMMIT`                     |

Endringer i `tools/oracle/`, manifestet eller patch-serien krever også:

| Gate              | Kommando                                                                          | Krav                                                                |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Orakelbygg        | `tools/oracle/build.sh`                                                           | exit 0                                                              |
| Orakelkjøring     | `tools/oracle/run.sh <outDir> <input.json>...`                                    | exit 0, ingen `ERROR`-linjer                                        |
| Golden-stabilitet | `tools/oracle/regen-goldens.sh`, deretter `git diff --exit-code test/golden/refs` | ingen diff, med mindre endringen skal flytte refs og er journalført |
| Shell             | `shellcheck tools/oracle/*.sh`                                                    | rent                                                                |

Endringer i `tools/oracle/` eller `tools/corpus/` krever også:

| Gate                | Kommando                                                                                 | Krav                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Census              | `npx tsx tools/corpus/census.ts`                                                         | exit 0 (ingen drift)                                              |
| Generert stabilitet | `tools/oracle/regen-generated.sh`, deretter `git diff --exit-code test/corpus/generated` | ingen diff                                                        |
| Sweep               | `tools/oracle/sweep.sh` (eller `--filter`/`--limit` for et utvalg)                       | exit 0: ingen `oracle-error`                                      |
| Paritetsrapport     | `npx tsx tools/corpus/parity-report.ts`                                                  | exit 0 (innsjekket rapport er oppdatert); regenerer med `--write` |
