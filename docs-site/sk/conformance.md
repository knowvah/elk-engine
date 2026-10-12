---
title: Zhoda
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Zhoda: čo znamená „zhodovať sa“

@knowvah/elk-engine sa overuje voči upstreamovému Eclipse ELK (Java) zostavenému zo
zdrojov. Rozloženie v TypeScripte je s orákulom **zhodné**, ak po spracovaní oboch ako
ELK JSON je štruktúra a každá nenumerická hodnota presne rovnaká a každé konečné číslo sa
zhoduje v rámci absolútnej tolerancie `1e-6`.
Komparátorom je [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
tento dokument opisuje, čo implementuje. Pravidlá portovania sú v
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Oddiel                                            | Odpovedá na                                         |
| --- | ------------------------------------------------- | --------------------------------------------------- |
| 1   | [Orákulum](#1-orákulum)                           | Čo je „správne“ a pri ktorom commite?               |
| 1a  | [Jednotka zhody](#1a-jednotka-zhody)              | Čo je jeden prípad a aké prípady existujú?          |
| 2   | [Kritérium zhody](#2-kritérium-zhody)             | Čo sa považuje za rovnaké?                          |
| 3   | [Goldeny a korpus](#3-goldeny-a-korpus)           | Odkiaľ pochádzajú referenčné výstupy?               |
| 4   | [Seam patche](#4-seam-patche)                     | Ako meníme orákulum?                                |
| 5   | [Prevádzka orákula](#5-prevádzka-orákula-runbook) | Čo robiť, keď sa pokazí?                            |
| 6   | [Brány](#6-brány)                                 | Čo musí prejsť, kým sa zmena dostane do repozitára? |

## 1. Orákulum

Orákulum (AD-3) je upstreamový ELK **zostavený zo zdrojov** v odpojenom git worktree
adresára `$ELK_SOURCE_DIR`, ktorý vytvorí `tools/oracle/build.sh` v `$ELK_ORACLE_DIR`.
Oba sú mimo tohto repozitára; ani jeden sa nedodáva spolu s ním.

| Položka             | Kde                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Pripnutý commit ELK | `tools/oracle/ELK_COMMIT` (momentálne `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)           |
| Séria patchov       | `tools/oracle/patches/*.patch`, aplikované v lexikografickom poradí pomocou `git am --3way` |
| Zostavenie          | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho sťahuje artefakty p2)                  |
| Dávkový spúšťač     | `tools/oracle/run.sh <outDir> <input>...` alebo `run.sh --cases <cases.jsonl> <outDir>`     |
| Harness             | `tools/oracle/harness/ElkOracle.java`                                                       |
| Manifest zostavenia | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patche, JDK, jar pre každý bundle)             |

**Zostavenie.** `build.sh` spustí `mvn -P elk-meta clean install -DskipTests` (kompilátor
melk) a potom `mvn clean install -DskipTests -Dmaven.test.skip=true` z `build/` vo worktree,
a následne zaznamená jar každého bundle v rozsahu (`core`, `graph`, `graph.json`,
`alg.common` a algoritmy `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`,
`spore`, `topdownpacking`, `vertiflex`) do `oracle-build.json`. Existujúci worktree sa
znovu použije, iba ak pochádza z `ELK_COMMIT`, nesie presne tie predmety patchov, ktoré sú
v `tools/oracle/patches/`, a je čistý okrem výstupu zostavenia; inak sa `build.sh` ukončí
s kódom `2` a worktree nechá nedotknutý.

**Spustenie.** `run.sh` skompiluje `ElkOracle.java` voči jarom bundlov a voči bundlom
tretích strán (Gson, Guava, EMF, knižnice Xtext/Xtend) z cache p2 nástroja Tycho
(`P2_BUNDLES`, predvolene `~/.m2/repository/p2/osgi/bundle`; použije sa vždy najnovšia
verzia). Jedna JVM rozloží každý vstup pomocou `RecursiveGraphLayoutEngine` a zapíše
`<outDir>/<input basename>.json` s rozložením, nulovými rozmermi a nulovými pozíciami;
neznáme voľby rozloženia sa vynechajú. Zlyhávajúci vstup vypíše
`ERROR <input>: <message>`; JVM sa ukončí s kódom `1`, ak zlyhal ktorýkoľvek vstup.
Základné názvy vstupov musia byť v rámci jedného behu jedinečné, pretože názov výstupu je
základný názov.

**Sémantika série patchov.** Séria dnes obsahuje jeden patch:

| Patch                                                                   | Účinok                                                                                                                                                                                                                                         | Párový seam v TS                                                                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` rieši kolízie id pomocou `"_g" + Random.nextInt(1000000)`; patch inicializuje tento `Random` zo systémovej vlastnosti `org.eclipse.elk.graph.json.exportSeed` (nenastavená = správanie ELK). `run.sh` odovzdáva `EXPORT_SEED=1` | Injektovateľný `Random` v portovaní `graph.json`; čaká na toto portovanie (shim `Random` v TS už tento prúd reprodukuje: seed 1 dáva 548985, 764588) |

Patche existujú iba na pridanie úzko vymedzených seamov, vďaka ktorým je správanie JVM a JS
porovnateľné; každý je spárovaný so seamom na strane TS (oddiel 4).

**Prečo nie elkjs?** elkjs je ELK skompilovaný pomocou GWT. Nemôže niesť našu sériu
patchov a emulácia JRE v GWT sa líši od JVM, z ktorej portujeme. Ako orákulum sa
nepoužíva.

## 1a. Jednotka zhody

**Prípad** je `(algorithm, model, variant)` (D1). Dashboard parity má jeden riadok na
každý algoritmus rozloženia; priečinok elk-models a vlastnosti census sú filtre, nie riadky.

**Id prípadu.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, napríklad
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` je id algoritmu
bez `org.eclipse.elk.`. Pri generovaných modeloch je `modelId` rovné `generated/<name>`.

**Id modelu a zdroj (D3).** Id modelu je cesta v elk-models bez prípony.
Prípad číta `.json`, ak existuje, inak `.elkt`; `.elkg` (EMF XMI) sa nikdy nečíta.

**Varianty (D6).** Pomenované prekrytia volieb v `test/corpus/variants.json`, aplikované na koreň:
`default` (žiadne), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmus                                      | Modely                            | Varianty             |
| ------------ | ----------------------------------------------- | --------------------------------- | -------------------- |
| native       | vlastný `rootAlgorithm` modelu                  | každý model census                | všetkých sedem       |
| retarget     | každý uvedený algoritmus okrem vlastného modelu | každý model census                | iba `default` (OR-1) |
| generated    | algoritmus pomenovaný predponou súboru          | `test/corpus/generated/*.json`    | všetkých sedem       |
| ported JUnit | podľa misie algoritmu                           | upstreamové prípady JUnit (AD-13) | podľa portovania     |

`tools/oracle/run.sh --list-algorithms` je zoznam id algoritmov (dnes 14).

**Retarget (D2).** Harness nastaví `org.eclipse.elk.algorithm` na **každom uzle, ktorý má
potomkov**, pričom prepíše akúkoľvek deklarovanú hodnotu, a `org.eclipse.elk.randomSeed = 1`
na koreni. ELK určuje algoritmus pre každý uzol zvlášť a nenastavený uzol sa vráti k layered.
Koreň bez potomkov dostane iba seed. Tier retarget preskočí vlastný `rootAlgorithm` každého
modelu (pokrýva ho tier native).

## 2. Kritérium zhody

AD-4, presne tak, ako ho implementuje `compareLayout(expected, actual, { tol })`:

| Pravidlo                  | Správanie                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerancia                | Absolútna, `DEFAULT_TOLERANCE = 1e-6`; konečné čísla prejdú, ak `abs(e - a) <= tol`                                                                                                         |
| Nekonečné čísla           | `NaN` a `±Infinity` musia byť presne rovnaké (`Object.is` alebo `===`), aj s `tol: Infinity`                                                                                                |
| Reťazce, booleany, `null` | Striktne rovnaké, inak `value`                                                                                                                                                              |
| Nezhoda druhu             | Rôzne druhy JSON (`null`, pole, objekt, číslo, reťazec, boolean) dajú jeden rozdiel `type`                                                                                                  |
| Kľúče objektu             | Množina kľúčov musí byť identická: kľúč iba v expected je `missing`, iba v actual je `extra`                                                                                                |
| Polia                     | Priraďujú sa **podľa `id`**, ak je každý prvok na oboch stranách objekt s reťazcovým `id` a id sú na každej strane jedinečné (prázdne pole sa počíta ako kľúčované); inak **podľa pozície** |
| Kľúčované polia           | Id iba na jednej strane je rozdiel `structure` pri `path[id=<id>]`; poradie sa ignoruje                                                                                                     |
| Pozičné polia             | Rozdiel v dĺžke je jeden rozdiel `structure` a prvky sa ďalej neporovnávajú                                                                                                                 |
| Druhy rozdielov           | `structure`, `value`, `type`, `missing`, `extra`; `path` je v štýle JSON cesty (`children[id=n1].x`)                                                                                        |

Dôsledky: id prvkov, počty prvkov, topológia sekcií hrán a počty bodov zlomu sú presné,
pretože id a dĺžky polí sú presné; súradnice a rozmery dostávajú `1e-6`. `formatDiffs`
vypíše najviac 20 rozdielov.

**Politika známych odchýlok.** Odchýlka sa nikdy neabsorbuje zvýšením `tol` ani úpravou
goldenu (AD-13). Každá je tu zaznamenaná s príčinou a testom alebo fixtúrou, ktoré
ovplyvňuje. Akceptované triedy:

- **Rozdiely `Math.*` na úrovni ulp.** V8 a JVM sa môžu líšiť v poslednom bite funkcií
  `sin`, `cos`, `exp`, `log`, `pow` a im podobných; `StrictMath` v Jave je špecifikovaný
  bitovo presne, `Math` nie. Prípad, ktorý už nastal: `nextGaussian` je špecifikovaný tak,
  že používa `StrictMath.log`, preto `src/java/util/Random.ts` obsahuje implementáciu
  presnú ako `StrictMath.log` namiesto `Math.log`. Bitovo presné portovanie algoritmu
  `StrictMath` uprednostnite pred rozšírením tolerancie.
- **Iterácia podľa identity hash (AD-10).** Iterácia cez `HashMap`/`HashSet` s kľúčmi
  hashovanými podľa identity je v samotnej Jave nedeterministická. Miesto zaznamenajte do
  žurnálu a portujte s poradím vloženia; goldeny od toho nesmú závisieť. Kľúče hashované
  podľa hodnoty (String, Integer) musia reprodukovať poradie Javy.
- **`Random` inicializovaný časom.** Pri `randomSeed = 0` ELK inicializuje z hodín
  (`core/Core.melk:608`), takže výstup nie je reprodukovateľný. Vstupy goldenov musia
  nechať seed nenastavený alebo nenulový (predvolený seed layered je `1`).

Konkrétne záznamy (pridajte ho iba so súhlasom používateľa):

| #   | Odchýlka                     | Príčina                                                                  | Rozsah                                                                                                                                                     | Schválené                  |
| --- | ---------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Text chybovej správy parsera | Správy ANTLR sú artefakty generovaného parsera, ktorý sa nikdy neportuje | Neplatný vstup gramatiky (`.elkt`, `.elkj`, `.elkr`): musí sa zhodovať iba _prítomnosť_ chyby parsovania, nie správa. Platný vstup sa musí zhodovať presne | D8, používateľ, 2026-10-11 |

**Verdikty.** Každý prípad dostane jeden verdikt z dvoch samostatných behov orákula na JVM (D4, D5, OR-2):

| Verdikt            | Význam                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Oba behy rozložili model a výstupné súbory sú bajtovo identické                                                                                                            |
| `throws`           | Oba behy vyhodili rovnakú výnimku: presne rovnakú triedu a presne rovnakú správu po zmene `@[0-9a-f]+` na `@<hash>` (správa môže byť null, napr. pri `StackOverflowError`) |
| `nondeterministic` | Behy sa rozchádzajú (bajty výstupu, výnimka, alebo jeden `ok` a jeden `throws`)                                                                                            |
| `oracle-error`     | Chyba harnessu (nečitateľný vstup, neznáma varianta/algoritmus/voľba, stratený riadok výsledku); nikdy neprijateľná                                                        |
| `timeout`          | Beh prekročil `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                       |

Priorita: `oracle-error`, potom `timeout`, potom `ok`/`throws`, ak sú rovnaké, inak
`nondeterministic`. Pred porovnaním bajtov sa každý token `@[0-9a-f]+` v oboch výstupoch
nahradí `@<hash>`, rovnako ako v správach výnimiek (D5a; `sameOutput` v
`tools/corpus/sweep.ts`). Príčina: programová voľba `debug.discoGraph` v disco exportuje
`...DCGraph@<identity hash>`, čo žiadny seed nedokáže zafixovať. Komparátor v TS aplikuje
rovnakú náhradu. Nedeterministické prípady sa hlásia osobitne a vylučujú sa z počtov
úspešných, v súlade s vyššie uvedenou politikou identity hash.

Skutočné zostávajúce zdroje `nondeterministic` (správanie ELK, nie chyby harnessu; počty sú v
správe o parite): spore (`ElkGraphImporter.java:169` rozptyľuje pomocou `Math.random`) a
`random` (predvolený `randomSeed` 0 je na vnorených zložených uzloch bez seedu; retarget
inicializuje iba koreň, D2, ponechané rozhodnutím používateľa). Premenovania id
`_g<random>` v exportéri zdrojom nie sú: seam patch ich opravuje.

## 3. Goldeny a korpus

AD-5. Referenčné výstupy sú commitnuté, aby CI nepotrebovalo JVM.

| Položka           | Kde                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Pripnutý korpus   | `eclipse-elk/elk-models` pri `commit` v `test/corpus/manifest.json` (nedodáva sa spolu s repozitárom) |
| Adresár modelov   | `$ELK_MODELS_DIR`, predvolene `../../eclipse-elk/elk-models` relatívne k tomuto repozitáru            |
| Kurátorovaná sada | `golden[]` v `test/corpus/manifest.json`: `{ id, path, note }`                                        |
| Refs              | `test/golden/refs/elk/<id>.json`, jeden na každé `id` v manifeste                                     |
| Pôvod             | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy`       |

**Mapovanie id na cestu.** `golden[].path` je relatívna k `$ELK_MODELS_DIR` a vstupom je
`$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` spustí harness na týchto vstupoch a každý
výstup `<basename>.json` uloží ako `refs/elk/<id>.json`.
Príklad: id `ptolemy-scrambler` je
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerácia** (`tools/oracle/regen-goldens.sh`):

1. Vyžaduje, aby klon models bol presne pri commite z manifestu (inak koniec s kódom `1`).
2. Vyžaduje zostavené orákulum (`run.sh` potrebuje `oracle-build.json`).
3. Všetky refs a `_meta.json` pripraví v `test/golden/refs/.elk-staging.*` a potom
   adresár vymení dvoma premenovaniami, takže zlyhaný beh ponechá staré refs.
4. `_meta.json` neobsahuje časové pečiatky (`builtAt` ostáva v `oracle-build.json`), takže
   regenerácia bez zmenených vstupov je v gite bajt po bajte no-op.

**Kedy regenerovať:** po zmene `ELK_COMMIT`, série patchov, sady `golden[]` alebo `commit`
v manifeste, alebo harnessu. Inak nikdy.

**Pravidlo žurnalovania.** Každá regenerácia, ktorá zmení ref, sa zaznamená do žurnálu
s príčinou (id patchu alebo zvýšenie commitu). Refs sa nikdy neupravujú ručne. Ak asercia
v TS alebo golden môže prejsť iba zmenou, zastavte sa a zaznamenajte do žurnálu (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` nič nerozkladá: spustí orákulum v režime
parsovania nad každým modelom a porovná výsledok s commitnutým `test/corpus/census.json`
(898 modelov: id, formáty, zdroj, koreňový algoritmus, počty vlastností). Koniec s kódom `0`
pri zhode, `1` pri drifte; `--write` súbor prepíše. Beží iba v pripnutom klone models a pri
chybe harnessu sa preruší.

**Generovaný korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` obsahuje
konfiguráciu grandom so seedom; súrodenecký `.json` je vstup vygenerovaný orákulom, bez
rozloženia. Deväť konfigurácií pokrýva id algoritmov, ktoré nepoužíva žiadny model z
elk-models: `disco`, `force`, `mrtree`, `radial`, `random`, `sporeCompaction`,
`sporeOverlap`, `topdownpacking`, `vertiflex`. Každá má najviac 50 uzlov a žiadne popisky
hrán (`BlindTextGenerator` nemá seed). Harness pomenúva vygenerovaný koreň `root`, pretože
`JsonExporter` v ELK rieši kolíziu id náhodnou príponou bez seedu. Regenerujte iba pomocou
`tools/oracle/regen-generated.sh` (pracovný adresár a premenovanie; zlyhávajúca konfigurácia
ponechá staré súbory); opakovaný beh bez zmien je v gite no-op. Portovanie grandom v TS
musí tieto súbory `.json` reprodukovať bajt po bajte; goldeny algoritmov od neho nikdy
nezávisia.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` naplánuje každý prípad, každý spustí dvakrát v samostatných
JVM (shardy predvolene `min(cpus, 8)` súbežných procesov `run.sh`) a zapíše
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` vypíše počty prípadov podľa tieru a nič nespustí; `--filter` ponechá id
prípadov obsahujúce podreťazec; `--limit` vezme vzorku s rovnomerným krokom. Koniec s kódom
`0`, pokiaľ nie je nejaký prípad `oracle-error` (`1`); zlyhanie nástroja skončí s kódom `2`.
Výstupy jednotlivých prípadov ostávajú lokálne (AD-5). `ELK_SWEEP_TIMEOUT_MS` (predvolene
`30000`, číta ho iba `tools/`) obmedzuje každý prípad; `run.sh` po timeoute (kód ukončenia
JVM 75) reštartuje JVM pre prípady bez riadka výsledku.

**Správa o parite (D9).** `docs/parity-report.md` sa generuje z cache sweepu a je
commitnutá: počty podľa algoritmu a verdiktu, s commitmi ELK a models a bez časových
pečiatok. Regenerujte pomocou `npx tsx tools/corpus/parity-report.ts --write`; bez
`--write` sa príkaz skončí s kódom `1`, ak je commitnutá správa zastaraná. Nikdy ju
neupravujte ručne.

**Testy korpusu.** `resolveModelsDir()` v `test/corpus/corpus.ts` vráti dôvod `skip`, ak
klon chýba alebo je pri inom commite; testy, ktoré ho potrebujú, sa preskočia s pripnutým
sha v správe. Dnes `test/golden/oracle-refs.test.ts` kontroluje iba commitnuté refs: jeden
na každé id z manifestu, geometriu na každom uzle, porte, popisku a hrane, porovnanie so
sebou samým a že `_meta.json` zodpovedá `ELK_COMMIT`, manifestu a generátoru. Test
rozloženia TS oproti orákulu zatiaľ neexistuje; prichádza s prvým portovaným algoritmom.

## 4. Seam patche

Seam patche menia orákulum; sú zriedkavé a vždy spárované so seamom v TS.

1. Upravte a commitnite vo worktree orákula (`$ELK_ORACLE_DIR`), alebo patch napíšte v
   pracovnom klone pri `ELK_COMMIT`. Ak chcete hotový patch pridať do existujúceho
   worktree na mieste (zachová cache `census/` a `sweep/`, ktoré odstránenie worktree
   zmaže), aplikujte ho s identitou z `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` potom overí sériu a prebuduje na mieste (asi 3 minúty), takže kroky 4-5
   možno preskočiť.
2. Exportujte:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (alebo iba nové commity). Súbory sa volajú `NNNN-<slug>.patch`; číselná
   predpona určuje poradie aplikácie.
3. Pridajte zodpovedajúci seam v TS (rovnaké správanie, injektovateľný, v `src/`) s testmi,
   ktorých očakávané hodnoty pochádzajú z patchovaného orákula (AD-13).
4. Inak worktree odstráňte: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (pridajte `--force`, ak ho výstup zostavenia robí špinavým).
5. Prebudujte: `tools/oracle/build.sh` (sériu aplikuje odznova).
6. Regenerujte: `tools/oracle/regen-goldens.sh`; skontrolujte `git diff test/golden/refs`.
7. Zaznamenajte do žurnálu záznam, ktorý pomenúva patch (`NNNN-<slug>.patch`) a uvádza každý
   zmenený ref. `patches` v `_meta.json` zaznamenáva sériu automaticky.

Nikdy v worktree nenechávajte necommitnutú úpravu: `build.sh` ju považuje za zastaranú
(koniec s kódom `2`). Nikdy neupravujte samotný `ELK_SOURCE_DIR`.

## 5. Prevádzka orákula (runbook)

| Zlyhanie                                                                           | Detekcia                                                                                                                                                                                                                                                                  | Riešenie                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zostavenie Tycho zlyhá (p2 nedostupné, JDK, verzia Mavenu)                         | `tools/oracle/build.sh` skončí nenulovým kódom; úplný výstup Mavenu je v `.oracle-build.log` v koreni repozitára. Kód `1` je chýbajúci nástroj alebo nesprávny Maven; kód `3` znamená, že jar bundlu nevznikol                                                            | Maven musí byť **3.9.x**: Tycho 4.0.12 zlyhá na Maven 3.10 (Homebrew 3.10.0) s `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Lokálny 3.9.11 je v `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Použite JDK 21, alebo JDK 17 cez `JAVA_HOME`. Skontrolujte sieť (prvý beh sťahuje artefakty p2), potom spustite znova. `build.sh --record-only` preskočí Maven a iba prepíše `oracle-build.json` z už zostavených jarov. Kód `2`: odstráňte worktree (oddiel 4, krok 4) a zostavte znova. Inak eskalujte s koncom logu |
| `build.sh` skončí s kódom `2` hneď po aplikovaní patchu                            | Worktree nahlásený ako zastaraný                                                                                                                                                                                                                                          | `build.sh` rozbalí zalomené predmety patchov (`git format-patch` ich zalamuje po približne 78 znakoch) a ignoruje nesledované cache `census/` a `sweep/`; iná špina alebo neuvedený patch stále dá kód `2`: opravte worktree (oddiel 4)                                                                                                                                                                                                                                                                                                                                                                                          |
| Drift goldenov po patchi alebo zvýšení commitu                                     | `tools/oracle/regen-goldens.sh` nasledovaný `git diff --exit-code test/golden/refs` nie je prázdny; `test/golden/oracle-refs.test.ts` zlyhá na zastaranom `_meta.json` (`elkCommit`, `modelsCommit`); test zhody v TS, keď bude existovať, zlyhá so správou `formatDiffs` | Prebudujte (`build.sh`), spustite `regen-goldens.sh`, skontrolujte diff, zaznamenajte id patchu do žurnálu. Nikdy ručne neupravujte ref ani nepovoľujte `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Chýba jar Xtext/ANTLR v cache p2 (`.elkt`, `.elkr` alebo akýkoľvek štart `run.sh`) | `run.sh` skončí nenulovým kódom s `bundle <name> not in p2 cache <dir>` (napr. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                       | Nastavte `P2_BUNDLES` na cache p2 nástroja Tycho, ktorá ho obsahuje, alebo spustite `build.sh` s prístupom do siete, aby ho Tycho stiahol; spustite `run.sh` znova. Nenahrádzajte jary z iného miesta                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Sweep sa zasekne alebo OOM                                                         | Prípad beží do timeoutu a hlási `timeout` (pomenuje ho riadok na stderr); beh bez riadka výsledku dá `oracle-error` a `sweep: shard <n> run <A or B> exited <code>` na stderr; počítač swapuje pri 8 súbežných JVM                                                        | Znížte súbežnosť a veľkosť dávky: `sweep.sh --shards 2`, zúžte pomocou `--filter` alebo `--limit`. `ELK_SWEEP_TIMEOUT_MS` zvýšte iba pre model, ktorý je pomalý, ale správny. Reprodukovateľný `timeout` je zistenie: zaznamenajte id prípadu do žurnálu, limit nerozširujte, aby ste ho zakryli                                                                                                                                                                                                                                                                                                                                 |
| Drift census po zvýšení pinu (`ELK_COMMIT` alebo `commit` models)                  | `npx tsx tools/corpus/census.ts` skončí s kódom `1` a vypíše odlišné modely; `test/corpus/census.test.ts` zlyhá                                                                                                                                                           | Overte, že klon a orákulum sú pri nových pinoch, spustite znova `census.ts --write`, skontrolujte `git diff test/corpus/census.json`, zaznamenajte príčinu do žurnálu, potom znova spustite `sweep.sh` a regenerujte správu o parite. Census nikdy neupravujte ručne                                                                                                                                                                                                                                                                                                                                                             |
| elk-models chýba alebo má nesprávne sha                                            | Testy korpusu sa preskočia so správou pomenúvajúcou očakávané sha; `regen-goldens.sh` skončí s kódom `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                   | Spustite `test/corpus/fetch.sh` (naklonuje a načíta pripnutý commit). Skončí s kódom `2`, ak je existujúci klon pri inom commite, a nedotkne sa ho: opravte ten klon sami alebo nasmerujte `ELK_MODELS_DIR` na novú cestu. Nikdy neposúvajte HEAD existujúceho klonu zo skriptu                                                                                                                                                                                                                                                                                                                                                  |

Iné zlyhania `run.sh`: `oracle-build.json missing` alebo `oracle jar missing`
znamená, že najprv spustite `build.sh`; `bundle <name> not in p2 cache` znamená, že
nastavte `P2_BUNDLES` na cache p2 nástroja Tycho alebo znova spustite `build.sh`
s prístupom do siete.

## 6. Brány

Každá zmena:

| Brána            | Príkaz                                                    | Kritérium                                                                             |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Typy             | `npm run typecheck`                                       | koniec s kódom 0                                                                      |
| Testy a pokrytie | `npm run coverage`                                        | všetky testy prejdú; 90 % statements, branches, functions a lines v `src/**`          |
| Architektúra     | `test/architecture/*.fitness.test.ts` (spúšťa `npm test`) | hranice modulov, globály modulov, žiadne vstavané moduly Node v `src/`, hlavičky SPDX |
| Refs orákula     | `test/golden/oracle-refs.test.ts`                         | commitnuté refs konzistentné s manifestom a `ELK_COMMIT`                              |

Zmeny v `tools/oracle/`, manifeste alebo sérii patchov vyžadujú navyše:

| Brána              | Príkaz                                                                         | Kritérium                                                                  |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Zostavenie orákula | `tools/oracle/build.sh`                                                        | koniec s kódom 0                                                           |
| Beh orákula        | `tools/oracle/run.sh <outDir> <input.json>...`                                 | koniec s kódom 0, žiadne riadky `ERROR`                                    |
| Stabilita goldenov | `tools/oracle/regen-goldens.sh`, potom `git diff --exit-code test/golden/refs` | žiadny diff, pokiaľ zmena nemá posunúť refs a nie je zaznamenaná v žurnáli |
| Shell              | `shellcheck tools/oracle/*.sh`                                                 | čisté                                                                      |

Zmeny v `tools/oracle/` alebo `tools/corpus/` vyžadujú navyše:

| Brána                  | Príkaz                                                                                | Kritérium                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Census                 | `npx tsx tools/corpus/census.ts`                                                      | koniec s kódom 0 (žiadny drift)                                              |
| Stabilita generovaných | `tools/oracle/regen-generated.sh`, potom `git diff --exit-code test/corpus/generated` | žiadny diff                                                                  |
| Sweep                  | `tools/oracle/sweep.sh` (alebo `--filter`/`--limit` pre vzorku)                       | koniec s kódom 0: žiadny `oracle-error`                                      |
| Správa o parite        | `npx tsx tools/corpus/parity-report.ts`                                               | koniec s kódom 0 (commitnutá správa aktuálna); regenerujte pomocou `--write` |
