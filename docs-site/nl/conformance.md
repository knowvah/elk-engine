---
title: Conformiteit
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformiteit: wat “match” betekent

@knowvah/elk-engine wordt gevalideerd tegen de upstream Eclipse ELK (Java), gebouwd vanuit de
broncode. Een TypeScript-layout is **conform** met het orakel wanneer, nadat beide als ELK JSON zijn
geparsed, de structuur en elke niet-numerieke waarde exact gelijk zijn en elk eindig getal binnen een
absolute tolerantie van `1e-6` overeenkomt.
De comparator is [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
dit document beschrijft wat hij implementeert. De portingregels staan in
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Sectie                                              | Beantwoordt                                     |
| --- | --------------------------------------------------- | ----------------------------------------------- |
| 1   | [Orakel](#1-orakel)                                 | Wat is “correct”, en bij welke commit?          |
| 1a  | [Conformiteitseenheid](#1a-conformiteitseenheid)    | Wat is één geval, en welke gevallen bestaan er? |
| 2   | [Conformiteitscriterium](#2-conformiteitscriterium) | Wat telt als gelijk?                            |
| 3   | [Goldens en corpus](#3-goldens-en-corpus)           | Waar komen de referentie-uitvoeren vandaan?     |
| 4   | [Seam-patches](#4-seam-patches)                     | Hoe wijzigen we het orakel?                     |
| 5   | [Orakelbeheer](#5-orakelbeheer-runbook)             | Wat doe ik als het stukgaat?                    |
| 6   | [Gates](#6-gates)                                   | Wat moet slagen voordat een wijziging landt?    |

## 1. Orakel

Het orakel (AD-3) is de upstream ELK, **gebouwd vanuit de broncode** in een losgekoppelde
git-worktree van `$ELK_SOURCE_DIR`, die `tools/oracle/build.sh` aanmaakt in `$ELK_ORACLE_DIR`.
Beide staan buiten deze repository; geen van beide wordt meegeleverd.

| Onderdeel              | Waar                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Vastgepinde ELK-commit | `tools/oracle/ELK_COMMIT` (momenteel `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)     |
| Patchreeks             | `tools/oracle/patches/*.patch`, in lexicale volgorde toegepast met `git am --3way`   |
| Build                  | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho downloadt p2-artefacten)        |
| Batch-runner           | `tools/oracle/run.sh <outDir> <input>...` of `run.sh --cases <cases.jsonl> <outDir>` |
| Harness                | `tools/oracle/harness/ElkOracle.java`                                                |
| Buildmanifest          | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar per bundle)           |

**Build.** `build.sh` voert `mvn -P elk-meta clean install -DskipTests` uit (de melk-compiler) en
daarna `mvn clean install -DskipTests -Dmaven.test.skip=true` vanuit `build/` in de worktree, en
legt vervolgens de jar van elk bundle binnen het bereik (`core`, `graph`, `graph.json`, `alg.common`
en de algoritmen `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`) vast in `oracle-build.json`. Een bestaande worktree wordt alleen
hergebruikt als hij afstamt van `ELK_COMMIT`, precies de patchonderwerpen uit
`tools/oracle/patches/` draagt en schoon is op buildoutput na; anders stopt
`build.sh` met `2` en laat hij de worktree ongemoeid.

**Run.** `run.sh` compileert `ElkOracle.java` tegen de bundle-jars plus de bundles van derden (Gson,
Guava, EMF, Xtext/Xtend-bibliotheken) uit de Tycho-p2-cache (`P2_BUNDLES`, standaard
`~/.m2/repository/p2/osgi/bundle`; van elk wordt de nieuwste versie gebruikt). Eén JVM legt elke
invoer uit met `RecursiveGraphLayoutEngine` en schrijft `<outDir>/<input basename>.json`
met layout, nulafmetingen en nulposities erbij en onbekende layoutopties weggelaten. Een mislukkende
invoer print `ERROR <input>: <message>`; de JVM stopt met `1` als een invoer is mislukt.
De basisnamen van invoerbestanden moeten binnen één run uniek zijn, omdat de uitvoernaam de basisnaam is.

**Semantiek van de patchreeks.** De reeks bevat nu één patch:

| Patch                                                                   | Effect                                                                                                                                                                                                                                      | Bijbehorende TS-seam                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` lost id-botsingen op met `"_g" + Random.nextInt(1000000)`; de patch seedt die `Random` vanuit de systeemeigenschap `org.eclipse.elk.graph.json.exportSeed` (niet ingesteld = ELK-gedrag). `run.sh` geeft `EXPORT_SEED=1` mee | Injecteerbare `Random` in de `graph.json`-portering; wacht op die portering (de TS-`Random`-shim reproduceert de reeks al: seed 1 geeft 548985, 764588) |

Patches bestaan alleen om nauw afgebakende seams toe te voegen die het gedrag van JVM en JS
vergelijkbaar maken; elk is gekoppeld aan een TS-zijdige seam (sectie 4).

**Waarom geen elkjs?** elkjs is ELK, gecompileerd door GWT. Het kan onze patchreeks niet
dragen, en de GWT-emulatie van de JRE wijkt af van de JVM waarvan wij porteren.
Het wordt niet als orakel geraadpleegd.

## 1a. Conformiteitseenheid

Een **geval** is `(algorithm, model, variant)` (D1). Het pariteitsdashboard heeft één rij per
layoutalgoritme; de elk-models-map en de census-kenmerken zijn filters, geen rijen.

**Geval-id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, bijvoorbeeld
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` is de algoritme-id
zonder `org.eclipse.elk.`. Bij gegenereerde modellen is `modelId` gelijk aan `generated/<name>`.

**Model-id en bron (D3).** De model-id is het pad in elk-models zonder extensie.
Een geval leest de `.json` als die bestaat, anders de `.elkt`; `.elkg` (EMF XMI) wordt nooit gelezen.

**Varianten (D6).** Benoemde optie-overlays in `test/corpus/variants.json`, toegepast op de wortel:
`default` (geen), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritme                                            | Modellen                        | Varianten               |
| ------------ | ---------------------------------------------------- | ------------------------------- | ----------------------- |
| native       | de eigen `rootAlgorithm` van het model               | elk census-model                | alle zeven              |
| retarget     | elk vermeld algoritme behalve dat van het model zelf | elk census-model                | alleen `default` (OR-1) |
| generated    | het algoritme dat de bestandsprefix noemt            | `test/corpus/generated/*.json`  | alle zeven              |
| ported JUnit | per algoritme-mission                                | upstream JUnit-gevallen (AD-13) | zoals geporteerd        |

`tools/oracle/run.sh --list-algorithms` is de lijst met algoritme-id's (nu 14).

**Retarget (D2).** De harness zet `org.eclipse.elk.algorithm` op **elke knoop die
kinderen heeft** en vervangt daarbij elke gedeclareerde waarde, en `org.eclipse.elk.randomSeed = 1` op de wortel. ELK
bepaalt het algoritme per knoop, en een knoop zonder instelling valt terug op layered. Een wortel zonder
kinderen krijgt alleen de seed. De retarget-tier slaat de eigen `rootAlgorithm` van elk model over (de
native tier dekt die).

## 2. Conformiteitscriterium

AD-4, precies zoals `compareLayout(expected, actual, { tol })` het implementeert:

| Regel                     | Gedrag                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerantie                | Absoluut, `DEFAULT_TOLERANCE = 1e-6`; eindige getallen slagen wanneer `abs(e - a) <= tol`                                                                                               |
| Niet-eindige getallen     | `NaN` en `±Infinity` moeten exact gelijk zijn (`Object.is` of `===`), ook met `tol: Infinity`                                                                                           |
| Strings, booleans, `null` | Strikt gelijk, anders `value`                                                                                                                                                           |
| Soortverschil             | Verschillende JSON-soorten (`null`, array, object, getal, string, boolean) geven één `type`-diff                                                                                        |
| Objectsleutels            | De sleutelverzameling moet identiek zijn: een sleutel alleen in expected is `missing`, alleen in actual is `extra`                                                                      |
| Arrays                    | Gekoppeld **op `id`** wanneer elk element aan beide kanten een object met een string-`id` is en de id's per kant uniek zijn (een lege array telt als gesleuteld); anders **op positie** |
| Gesleutelde arrays        | Een id aan één kant is een `structure`-diff bij `path[id=<id>]`; de volgorde wordt genegeerd                                                                                            |
| Positionele arrays        | Een lengteverschil is één `structure`-diff en de elementen worden verder niet vergeleken                                                                                                |
| Diff-soorten              | `structure`, `value`, `type`, `missing`, `extra`; `path` lijkt op een JSON-pad (`children[id=n1].x`)                                                                                    |

Gevolgen: element-id's, aantallen elementen, topologie van kantsecties en
aantallen buigpunten zijn exact, omdat id's en arraylengtes exact zijn;
coördinaten en afmetingen krijgen `1e-6`. `formatDiffs` print hooguit 20 diffs.

**Beleid voor bekende afwijkingen.** Een afwijking wordt nooit opgevangen door `tol` te verhogen
of een golden te bewerken (AD-13). Elke afwijking wordt hier vastgelegd met haar oorzaak en de
test of fixture die ze raakt. Geaccepteerde klassen:

- **`Math.*`-verschillen op ulp-niveau.** V8 en de JVM kunnen in het laatste bit verschillen
  bij `sin`, `cos`, `exp`, `log`, `pow` en verwanten; `StrictMath` van Java is bitexact
  gespecificeerd, `Math` niet. Het geval dat zich al voordeed: `nextGaussian`
  is gespecificeerd als gebruikmakend van `StrictMath.log`, dus `src/java/util/Random.ts` bevat een
  `StrictMath.log`-exacte implementatie in plaats van `Math.log`. Geef de voorkeur aan een
  bitexacte portering van het `StrictMath`-algoritme boven het verruimen van de tolerantie.
- **Iteratie over identiteitshashes (AD-10).** Itereren over een `HashMap`/`HashSet` met
  identiteitsgehashte sleutelobjecten is in Java zelf niet-deterministisch. Journaliseer de plek
  en porteer met invoegvolgorde; goldens mogen er niet van afhangen.
  Waardegehashte sleutels (String, Integer) moeten de Java-volgorde reproduceren.
- **Op tijd geseede `Random`.** Bij `randomSeed = 0` seedt ELK vanaf de klok
  (`core/Core.melk:608`), dus de uitvoer is niet reproduceerbaar. Golden-invoer moet
  de seed ongezet of ongelijk aan nul laten (de standaardseed van layered is `1`).

Concrete vermeldingen (voeg er alleen een toe met toestemming van de gebruiker):

| #   | Afwijking                  | Oorzaak                                                                                | Bereik                                                                                                                                                                    | Goedgekeurd               |
| --- | -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Tekst van parsefoutmelding | ANTLR-meldingen zijn artefacten van de gegenereerde parser, die nooit wordt geporteerd | Ongeldige grammaticainvoer (`.elkt`, `.elkj`, `.elkr`): alleen het _bestaan_ van een parsefout moet overeenkomen, niet de melding. Geldige invoer moet exact overeenkomen | D8, gebruiker, 2026-10-11 |

**Uitspraken.** Elk geval krijgt één uitspraak uit twee afzonderlijke JVM-runs van het orakel (D4, D5, OR-2):

| Uitspraak          | Betekenis                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Beide runs hebben het model uitgelegd en de uitvoerbestanden zijn byte-identiek                                                                                                              |
| `throws`           | Beide runs gooiden dezelfde exception: exact dezelfde klasse en exact dezelfde melding nadat `@[0-9a-f]+` is vervangen door `@<hash>` (de melding mag null zijn, bijv. `StackOverflowError`) |
| `nondeterministic` | De runs wijken af (uitvoerbytes, exception, of één keer `ok` en één keer `throws`)                                                                                                           |
| `oracle-error`     | Fout van de harness (onleesbare invoer, onbekende variant/algoritme/optie, verloren resultaatregel); nooit acceptabel                                                                        |
| `timeout`          | Een run overschreed `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                                   |

Voorrang: `oracle-error`, dan `timeout`, dan `ok`/`throws` als ze gelijk zijn, anders
`nondeterministic`. Vóór de bytevergelijking wordt elk `@[0-9a-f]+`-token in beide uitvoeren
vervangen door `@<hash>`, zoals in exceptionmeldingen (D5a; `sameOutput` in `tools/corpus/sweep.ts`).
Oorzaak: de programmatische optie `debug.discoGraph` van disco exporteert `...DCGraph@<identity hash>`,
wat geen enkele seed kan vastleggen. De TS-comparator past dezelfde vervanging toe. Niet-deterministische gevallen
worden apart gerapporteerd en uitgesloten van de slagingstellingen, in lijn met het bovenstaande
beleid voor identiteitshashes.

Werkelijke resterende bronnen van `nondeterministic` (ELK-gedrag, geen harnessfouten; de aantallen staan in het
pariteitsrapport): spore (`ElkGraphImporter.java:169` jittert met `Math.random`) en `random`
(de standaard-`randomSeed` 0 is niet geseed op geneste composites; retarget seedt alleen de wortel, D2,
gehandhaafd op beslissing van de gebruiker). De `_g<random>`-hernoemingen van id's door de exporter zijn geen bron: de seam-
patch verhelpt ze.

## 3. Goldens en corpus

AD-5. Referentie-uitvoeren zijn gecommit, zodat CI geen JVM nodig heeft.

| Onderdeel         | Waar                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Vastgepind corpus | `eclipse-elk/elk-models` bij de `commit` in `test/corpus/manifest.json` (niet meegeleverd)      |
| Modellenmap       | `$ELK_MODELS_DIR`, standaard `../../eclipse-elk/elk-models` ten opzichte van deze repository    |
| Samengestelde set | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs              | `test/golden/refs/elk/<id>.json`, één per manifest-`id`                                         |
| Herkomst          | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Afbeelding van id naar pad.** `golden[].path` is relatief ten opzichte van `$ELK_MODELS_DIR`, en
de invoer is `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` draait de harness op die invoer
en plaatst elke `<basename>.json`-uitvoer als `refs/elk/<id>.json`.
Voorbeeld: id `ptolemy-scrambler` is
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneratie** (`tools/oracle/regen-goldens.sh`):

1. Vereist dat de modellenkloon precies op de manifest-commit staat (anders exit `1`).
2. Vereist een gebouwd orakel (`run.sh` heeft `oracle-build.json` nodig).
3. Plaatst alle refs en `_meta.json` in `test/golden/refs/.elk-staging.*` en wisselt daarna de
   map om met twee hernoemingen, zodat een mislukte run de oude refs laat staan.
4. `_meta.json` bevat geen tijdstempels (`builtAt` blijft in `oracle-build.json`), dus een
   regeneratie zonder gewijzigde invoer is in git byte voor byte een no-op.

**Wanneer te regenereren:** na het wijzigen van `ELK_COMMIT`, de patchreeks, de
`golden[]`-set of de `commit` van het manifest, of de harness. Anders nooit.

**Journaalregel.** Elke regeneratie die een ref wijzigt, wordt gejournaliseerd met de oorzaak
(de patch-id of de commit-verhoging). Refs worden nooit met de hand bewerkt. Als een
TS-assertie of golden alleen kan slagen door gewijzigd te worden, stop dan en journaliseer (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` legt niets uit: het draait het orakel in parsemodus
over elk model en vergelijkt het resultaat met de gecommitte `test/corpus/census.json` (898
modellen: id, formaten, bron, wortelalgoritme, kenmerkaantallen). Exit `0` bij gelijkheid, `1` bij drift;
`--write` herschrijft het bestand. Het draait alleen in de vastgepinde modellenkloon en breekt af bij een
harnessfout.

**Gegenereerd corpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` bevat een geseede
grandom-configuratie; de bijbehorende `.json` is de door het orakel gegenereerde, nog niet uitgelegde invoer. Negen configuraties dekken
de algoritme-id's die geen elk-models-model gebruikt: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Elk heeft hooguit 50 knopen en
geen kantlabels (`BlindTextGenerator` is niet geseed). De harness noemt de gegenereerde wortel `root`,
omdat de `JsonExporter` van ELK een id-botsing oplost met een niet-geseed willekeurig achtervoegsel. Regenereer
alleen met `tools/oracle/regen-generated.sh` (stagingmap en hernoeming; een mislukkende configuratie
laat de oude bestanden staan); een nieuwe run zonder wijzigingen is een git-no-op. De TS-grandom-portering moet deze `.json`-bestanden
byte voor byte reproduceren; algoritme-goldens hangen er nooit van af.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` plant elk geval, draait elk tweemaal in afzonderlijke JVM's (shards
standaard `min(cpus, 8)` gelijktijdige `run.sh`-processen) en schrijft
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` print de aantallen gevallen per tier en draait niets; `--filter` houdt geval-id's die de
substring bevatten; `--limit` neemt een steekproef met gelijke tussenruimte. Exit `0` tenzij een geval `oracle-error` is
(`1`); een toolfout stopt met `2`. Uitvoer per geval blijft lokaal (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(standaard `30000`, alleen gelezen door `tools/`) begrenst elk geval; `run.sh` herstart een JVM na een
timeout (JVM-exitcode 75) voor de gevallen zonder resultaatregel.

**Pariteitsrapport (D9).** `docs/parity-report.md` wordt gegenereerd uit de sweepcache en gecommit:
aantallen per algoritme en uitspraak, met de ELK- en models-commits en zonder tijdstempels. Regenereer
met `npx tsx tools/corpus/parity-report.ts --write`; zonder `--write` stopt de opdracht met `1`
als het gecommitte rapport verouderd is. Nooit met de hand bewerken.

**Corpustests.** `resolveModelsDir()` in `test/corpus/corpus.ts` geeft een
`skip`-reden terug wanneer de kloon ontbreekt of op een andere commit staat; tests die hem nodig hebben,
worden overgeslagen, met de vastgepinde sha in de melding. Vandaag controleert `test/golden/oracle-refs.test.ts`
alleen de gecommitte refs: één per manifest-id, geometrie op elke knoop, poort, elk label en elke kant,
zelfvergelijking, en dat `_meta.json` overeenkomt met `ELK_COMMIT`, het manifest en de generator. Een
TS-tegen-orakel-layouttest is er nog niet; die komt met het eerste geporteerde algoritme.

## 4. Seam-patches

Seam-patches wijzigen het orakel; ze zijn zeldzaam en altijd gekoppeld aan een TS-seam.

1. Bewerk en commit in de orakel-worktree (`$ELK_ORACLE_DIR`), of schrijf de patch in een scratchkloon op
   `ELK_COMMIT`. Om een voltooide patch ter plekke aan de bestaande worktree toe te voegen (behoudt de
   caches `census/` en `sweep/`, die verwijderen van de worktree wist), past u hem toe met de identiteit van
   `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verifieert daarna de reeks en bouwt ter plekke opnieuw (ongeveer 3 minuten), zodat stap 4-5
   kunnen vervallen.
2. Exporteer:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (of alleen de nieuwe commits). Bestanden heten `NNNN-<slug>.patch`; het numerieke
   voorvoegsel bepaalt de toepassingsvolgorde.
3. Voeg de bijbehorende TS-seam toe (zelfde gedrag, injecteerbaar, in `src/`), met tests
   waarvan de verwachte waarden uit het gepatchte orakel komen (AD-13).
4. Verwijder anders de worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (voeg `--force` toe als buildoutput hem vuil maakt).
5. Bouw opnieuw: `tools/oracle/build.sh` (past de reeks vanaf nul opnieuw toe).
6. Regenereer: `tools/oracle/regen-goldens.sh`; bekijk `git diff test/golden/refs`.
7. Journaliseer een vermelding die de patch noemt (`NNNN-<slug>.patch`) en elke
   gewijzigde ref opsomt. `patches` in `_meta.json` legt de reeks automatisch vast.

Laat nooit een niet-gecommitte wijziging in de worktree staan: `build.sh` behandelt die als verouderd
(exit `2`). Bewerk nooit `ELK_SOURCE_DIR` zelf.

## 5. Orakelbeheer (runbook)

| Fout                                                                                   | Detectie                                                                                                                                                                                                                                                                                | Mitigatie                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-build mislukt (p2 onbereikbaar, JDK, Maven-versie)                               | `tools/oracle/build.sh` stopt met een waarde ongelijk aan nul; de volledige Maven-uitvoer staat in `.oracle-build.log` in de repositorywortel. Exit `1` is een ontbrekende tool of verkeerde Maven; exit `3` betekent dat een bundle-jar niet is geproduceerd                           | Maven moet **3.9.x** zijn: Tycho 4.0.12 faalt op Maven 3.10 (Homebrews 3.10.0) met `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Een lokale 3.9.11 staat in `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Gebruik JDK 21, of JDK 17 via `JAVA_HOME`. Controleer het netwerk (de eerste run downloadt p2-artefacten) en draai opnieuw. `build.sh --record-only` slaat Maven over en herschrijft alleen `oracle-build.json` uit reeds gebouwde jars. Exit `2`: verwijder de worktree (sectie 4 stap 4) en bouw opnieuw. Escaleer anders met het einde van het log |
| `build.sh` stopt met `2` direct na het toepassen van een patch                         | Worktree als verouderd gemeld                                                                                                                                                                                                                                                           | `build.sh` vouwt omgebroken patchonderwerpen weer uit (`git format-patch` breekt die af bij ongeveer 78 tekens) en negeert de niet-gevolgde caches `census/` en `sweep/`; ander vuil of een niet-vermelde patch geeft nog steeds exit `2`: herstel de worktree (sectie 4)                                                                                                                                                                                                                                                                                                                                                                                                  |
| Golden-drift na een patch of commit-verhoging                                          | `tools/oracle/regen-goldens.sh` gevolgd door `git diff --exit-code test/golden/refs` is niet leeg; `test/golden/oracle-refs.test.ts` faalt op een verouderde `_meta.json` (`elkCommit`, `modelsCommit`); een TS-conformiteitstest faalt, zodra die er is, met een `formatDiffs`-rapport | Bouw opnieuw (`build.sh`), draai `regen-goldens.sh`, bekijk de diff, journaliseer de patch-id. Bewerk nooit een ref met de hand en versoepel `tol` nooit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Xtext/ANTLR-jar ontbreekt in de p2-cache (`.elkt`, `.elkr` of elke start van `run.sh`) | `run.sh` stopt met een waarde ongelijk aan nul en `bundle <name> not in p2 cache <dir>` (bijv. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                     | Zet `P2_BUNDLES` op de Tycho-p2-cache die hem bevat, of draai `build.sh` met netwerktoegang zodat Tycho hem ophaalt; draai `run.sh` opnieuw. Vervang jars niet door exemplaren van elders                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Sweep loopt vast of OOM                                                                | Een geval loopt door tot de timeout en meldt `timeout` (een stderr-regel noemt het); een run zonder resultaatregel geeft `oracle-error` en `sweep: shard <n> run <A or B> exited <code>` op stderr; de machine swapt bij 8 gelijktijdige JVM's                                          | Verlaag de gelijktijdigheid en batchgrootte: `sweep.sh --shards 2`, beperk met `--filter` of `--limit`. Verhoog `ELK_SWEEP_TIMEOUT_MS` alleen voor een model dat traag maar correct is. Een reproduceerbare `timeout` is een bevinding: journaliseer de geval-id, verruim de limiet niet om hem te verbergen                                                                                                                                                                                                                                                                                                                                                               |
| Census-drift na een pin-verhoging (`ELK_COMMIT` of `commit` van de models)             | `npx tsx tools/corpus/census.ts` stopt met `1` en somt de afwijkende modellen op; `test/corpus/census.test.ts` faalt                                                                                                                                                                    | Bevestig dat kloon en orakel op de nieuwe pins staan, draai `census.ts --write` opnieuw, bekijk `git diff test/corpus/census.json`, journaliseer de oorzaak, draai daarna `sweep.sh` opnieuw en regenereer het pariteitsrapport. Bewerk de census nooit met de hand                                                                                                                                                                                                                                                                                                                                                                                                        |
| elk-models ontbreekt of verkeerde sha                                                  | Corpustests worden overgeslagen met een melding die de verwachte sha noemt; `regen-goldens.sh` stopt met `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                             | Draai `test/corpus/fetch.sh` (kloont en checkt de vastgepinde commit uit). Het stopt met `2` als een bestaande kloon op een andere commit staat en raakt die niet aan: herstel die kloon zelf of wijs `ELK_MODELS_DIR` naar een nieuw pad. Verplaats de HEAD van een bestaande kloon nooit vanuit een script                                                                                                                                                                                                                                                                                                                                                               |

Andere `run.sh`-fouten: `oracle-build.json missing` of `oracle jar missing`
betekent dat u eerst `build.sh` moet draaien; `bundle <name> not in p2 cache` betekent dat u `P2_BUNDLES`
op de Tycho-p2-cache moet zetten of `build.sh` opnieuw met netwerktoegang moet draaien.

## 6. Gates

Elke wijziging:

| Gate              | Opdracht                                                      | Criterium                                                                     |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Types             | `npm run typecheck`                                           | exit 0                                                                        |
| Tests en coverage | `npm run coverage`                                            | alle tests slagen; 90% statements, branches, functions en lines over `src/**` |
| Architectuur      | `test/architecture/*.fitness.test.ts` (draait via `npm test`) | modulegrenzen, module-globals, geen Node-builtins in `src/`, SPDX-headers     |
| Orakel-refs       | `test/golden/oracle-refs.test.ts`                             | gecommitte refs consistent met manifest en `ELK_COMMIT`                       |

Wijzigingen aan `tools/oracle/`, het manifest of de patchreeks vereisen bovendien:

| Gate               | Opdracht                                                                        | Criterium                                                                    |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Orakel-build       | `tools/oracle/build.sh`                                                         | exit 0                                                                       |
| Orakel-run         | `tools/oracle/run.sh <outDir> <input.json>...`                                  | exit 0, geen `ERROR`-regels                                                  |
| Golden-stabiliteit | `tools/oracle/regen-goldens.sh`, daarna `git diff --exit-code test/golden/refs` | geen diff, tenzij de wijziging refs bedoeld verschuift en gejournaliseerd is |
| Shell              | `shellcheck tools/oracle/*.sh`                                                  | schoon                                                                       |

Wijzigingen aan `tools/oracle/` of `tools/corpus/` vereisen bovendien:

| Gate                     | Opdracht                                                                               | Criterium                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Census                   | `npx tsx tools/corpus/census.ts`                                                       | exit 0 (geen drift)                                         |
| Gegenereerde stabiliteit | `tools/oracle/regen-generated.sh`, daarna `git diff --exit-code test/corpus/generated` | geen diff                                                   |
| Sweep                    | `tools/oracle/sweep.sh` (of `--filter`/`--limit` voor een steekproef)                  | exit 0: geen `oracle-error`                                 |
| Pariteitsrapport         | `npx tsx tools/corpus/parity-report.ts`                                                | exit 0 (gecommit rapport actueel); regenereer met `--write` |
