---
title: Shoda
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Shoda: co znamená „shoda“

@knowvah/elk-engine se ověřuje proti upstreamovému Eclipse ELK (Java) sestavenému ze zdrojů.
Rozvržení v TypeScriptu je s orákulem **ve shodě**, když po naparsování obou jako ELK JSON
jsou struktura a každá nečíselná hodnota přesně stejné a každé konečné číslo se shoduje
v rámci absolutní tolerance `1e-6`.
Komparátor je [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
tento dokument popisuje, co implementuje. Pravidla portování jsou v
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Sekce                                       | Odpovídá na                                 |
| --- | ------------------------------------------- | ------------------------------------------- |
| 1   | [Orákulum](#1-orákulum)                     | Co je „správně“ a při kterém commitu?       |
| 1a  | [Jednotka shody](#1a-jednotka-shody)        | Co je jeden případ a jaké případy existují? |
| 2   | [Kritérium shody](#2-kritérium-shody)       | Co se považuje za stejné?                   |
| 3   | [Goldeny a korpus](#3-goldeny-a-korpus)     | Odkud pocházejí referenční výstupy?         |
| 4   | [Seam patche](#4-seam-patche)               | Jak měníme orákulum?                        |
| 5   | [Provoz orákula](#5-provoz-orákula-runbook) | Co dělat, když se rozbije?                  |
| 6   | [Gates](#6-gates)                           | Co musí projít, než se změna začlení?       |

## 1. Orákulum

Orákulum (AD-3) je upstreamový ELK **sestavený ze zdrojů** v odpojeném git
worktree adresáře `$ELK_SOURCE_DIR`, který `tools/oracle/build.sh` vytvoří v `$ELK_ORACLE_DIR`.
Oba leží mimo tento repozitář; ani jeden není součástí distribuce.

| Položka             | Kde                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------- |
| Připnutý commit ELK | `tools/oracle/ELK_COMMIT` (aktuálně `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)        |
| Série patchů        | `tools/oracle/patches/*.patch`, aplikované v lexikálním pořadí pomocí `git am --3way`  |
| Build               | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho stahuje artefakty p2)             |
| Dávkový spouštěč    | `tools/oracle/run.sh <outDir> <input>...` nebo `run.sh --cases <cases.jsonl> <outDir>` |
| Harness             | `tools/oracle/harness/ElkOracle.java`                                                  |
| Manifest buildu     | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patche, JDK, jar pro každý bundle)        |

**Build.** `build.sh` spustí `mvn -P elk-meta clean install -DskipTests` (kompilátor melk)
a poté `mvn clean install -DskipTests -Dmaven.test.skip=true` z adresáře `build/` ve worktree
a pak zaznamená jar každého bundlu v rozsahu (`core`, `graph`, `graph.json`, `alg.common` a algoritmy
`layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`) do `oracle-build.json`. Existující worktree se znovu použije
jen tehdy, když pochází z `ELK_COMMIT`, nese přesně ty předměty patchů, které jsou v
`tools/oracle/patches/`, a je čistý s výjimkou výstupů buildu; jinak
`build.sh` skončí s kódem `2` a worktree nechá nedotčený.

**Run.** `run.sh` zkompiluje `ElkOracle.java` proti jarům bundlů plus bundlům třetích stran (Gson,
Guava, EMF, knihovny Xtext/Xtend) z cache p2 nástroje Tycho (`P2_BUNDLES`, výchozí
`~/.m2/repository/p2/osgi/bundle`; použije se vždy nejnovější verze). Jedna JVM rozvrhne
každý vstup pomocí `RecursiveGraphLayoutEngine` a zapíše `<outDir>/<input basename>.json`
včetně rozvržení, nulových rozměrů a nulových pozic; neznámé volby rozvržení se vynechají. Selhávající
vstup vypíše `ERROR <input>: <message>`; JVM skončí s kódem `1`, pokud selhal
kterýkoli vstup. Základní názvy vstupů musí být v rámci jednoho běhu
jedinečné, protože název výstupu je základní název.

**Sémantika série patchů.** Série dnes obsahuje jeden patch:

| Patch                                                                   | Účinek                                                                                                                                                                                                                                 | Párový seam v TS                                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` řeší kolize id pomocí `"_g" + Random.nextInt(1000000)`; patch inicializuje tento `Random` ze systémové vlastnosti `org.eclipse.elk.graph.json.exportSeed` (nenastaveno = chování ELK). `run.sh` předává `EXPORT_SEED=1` | Injektovatelný `Random` v portu `graph.json`; čeká na tento port (shim `Random` v TS už posloupnost reprodukuje: seed 1 dává 548985, 764588) |

Patche existují jen proto, aby přidaly úzce vymezené seamy, které činí chování JVM a JS
srovnatelným; každý je spárován se seamem na straně TS (sekce 4).

**Proč ne elkjs?** elkjs je ELK zkompilovaný pomocí GWT. Nemůže nést naši sérii
patchů a emulace JRE v GWT se liší od JVM, ze které portujeme.
Jako orákulum se nepoužívá.

## 1a. Jednotka shody

**Případ** je `(algorithm, model, variant)` (D1). Dashboard parity má jeden řádek na
algoritmus rozvržení; složka elk-models a rysy censu jsou filtry, ne řádky.

**Id případu.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, například
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` je id algoritmu
bez `org.eclipse.elk.`. U generovaných modelů je `modelId` rovno `generated/<name>`.

**Id modelu a zdroj (D3).** Id modelu je cesta v elk-models bez přípony.
Případ načte `.json`, pokud existuje, jinak `.elkt`; `.elkg` (EMF XMI) se nikdy nečte.

**Varianty (D6).** Pojmenované překryvy voleb v `test/corpus/variants.json`, aplikované na kořen:
`default` (žádná), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmus                                                | Modely                            | Varianty               |
| ------------ | --------------------------------------------------------- | --------------------------------- | ---------------------- |
| native       | vlastní `rootAlgorithm` modelu                            | každý model v censu               | všech sedm             |
| retarget     | každý uvedený algoritmus kromě vlastního algoritmu modelu | každý model v censu               | pouze `default` (OR-1) |
| generated    | algoritmus pojmenovaný předponou souboru                  | `test/corpus/generated/*.json`    | všech sedm             |
| ported JUnit | podle mise algoritmu                                      | upstreamové případy JUnit (AD-13) | jak byly portovány     |

`tools/oracle/run.sh --list-algorithms` je seznam id algoritmů (dnes 14).

**Retarget (D2).** Harness nastaví `org.eclipse.elk.algorithm` na **každém uzlu, který má
potomky**, a nahradí jakoukoli deklarovanou hodnotu, a `org.eclipse.elk.randomSeed = 1` na kořeni. ELK
řeší algoritmus pro každý uzel zvlášť a nenastavený uzel se vrací k layered. Kořen bez
potomků dostane jen seed. Tier retarget přeskakuje vlastní `rootAlgorithm` každého modelu (tier
native ho pokrývá).

## 2. Kritérium shody

AD-4, přesně tak, jak ho implementuje `compareLayout(expected, actual, { tol })`:

| Pravidlo                  | Chování                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerance                 | Absolutní, `DEFAULT_TOLERANCE = 1e-6`; konečná čísla projdou, když `abs(e - a) <= tol`                                                                                                      |
| Nekonečná čísla           | `NaN` a `±Infinity` musí být přesně stejné (`Object.is` nebo `===`), i s `tol: Infinity`                                                                                                    |
| Řetězce, booleany, `null` | Striktně stejné, jinak `value`                                                                                                                                                              |
| Neshoda druhu             | Různé druhy JSON (`null`, pole, objekt, číslo, řetězec, boolean) dají jeden rozdíl `type`                                                                                                   |
| Klíče objektu             | Množina klíčů musí být totožná: klíč jen v expected je `missing`, jen v actual je `extra`                                                                                                   |
| Pole                      | Párují se **podle `id`**, když je každý prvek na obou stranách objekt s řetězcovým `id` a id jsou na každé straně jedinečná (prázdné pole se počítá jako klíčované); jinak **podle pozice** |
| Klíčovaná pole            | Id jen na jedné straně je rozdíl `structure` na `path[id=<id>]`; pořadí se ignoruje                                                                                                         |
| Pozičně párovaná pole     | Rozdíl v délce je jeden rozdíl `structure` a prvky se dále neporovnávají                                                                                                                    |
| Druhy rozdílů             | `structure`, `value`, `type`, `missing`, `extra`; `path` je ve stylu JSON cesty (`children[id=n1].x`)                                                                                       |

Důsledky: id prvků, počty prvků, topologie úseků hran a počty
ohybů jsou přesné, protože id a délky polí jsou přesné;
souřadnice a velikosti dostávají `1e-6`. `formatDiffs` vypíše nejvýše 20 rozdílů.

**Zásady známých odchylek.** Odchylka se nikdy neabsorbuje zvýšením `tol`
ani úpravou goldenu (AD-13). Každá je zde zaznamenána se svou příčinou a testem nebo
fixture, které ovlivňuje. Přijaté třídy:

- **Rozdíly `Math.*` na úrovni ulp.** V8 a JVM se mohou lišit v posledním bitu
  `sin`, `cos`, `exp`, `log`, `pow` a příbuzných; `StrictMath` v Javě je specifikován
  bitově přesně, `Math` nikoli. Případ, který už nastal: `nextGaussian`
  je specifikován tak, že používá `StrictMath.log`, proto `src/java/util/Random.ts` obsahuje
  implementaci přesnou vůči `StrictMath.log` místo `Math.log`. Bitově přesný port
  algoritmu `StrictMath` je lepší než rozšiřování tolerance.
- **Iterace přes identitní hashe (AD-10).** Iterace přes `HashMap`/`HashSet` s klíči
  hashovanými podle identity je v samotné Javě nedeterministická. Místo zaznamenejte
  do žurnálu a portujte s pořadím vkládání; goldeny na tom nesmějí záviset.
  Klíče hashované podle hodnoty (String, Integer) musí reprodukovat pořadí z Javy.
- **`Random` seedovaný časem.** Při `randomSeed = 0` ELK seeduje z hodin
  (`core/Core.melk:608`), takže výstup není reprodukovatelný. Vstupy goldenů musí
  nechat seed nenastavený nebo nenulový (výchozí seed layered je `1`).

Konkrétní záznamy (přidávejte jen se souhlasem uživatele):

| #   | Odchylka                    | Příčina                                                                    | Rozsah                                                                                                                                                  | Schváleno                |
| --- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Text chybové zprávy parseru | Zprávy ANTLR jsou artefakty generovaného parseru, který se nikdy neportuje | Neplatný vstup gramatiky (`.elkt`, `.elkj`, `.elkr`): musí se shodovat jen _existence_ chyby parsování, ne zpráva. Platný vstup se musí shodovat přesně | D8, uživatel, 2026-10-11 |

**Verdikty.** Každý případ dostane jeden verdikt ze dvou samostatných běhů orákula na JVM (D4, D5, OR-2):

| Verdikt            | Význam                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Oba běhy model rozvrhly a výstupní soubory jsou bajtově totožné                                                                                                             |
| `throws`           | Oba běhy vyhodily stejnou výjimku: přesně stejnou třídu a přesně stejnou zprávu po nahrazení `@[0-9a-f]+` za `@<hash>` (zpráva může být null, např. u `StackOverflowError`) |
| `nondeterministic` | Běhy se liší (výstupní bajty, výjimka, nebo jeden `ok` a jeden `throws`)                                                                                                    |
| `oracle-error`     | Chyba harnessu (nečitelný vstup, neznámá varianta/algoritmus/volba, ztracený řádek s výsledkem); nikdy nepřijatelné                                                         |
| `timeout`          | Běh překročil `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                        |

Přednost: `oracle-error`, pak `timeout`, pak `ok`/`throws`, když jsou stejné, jinak
`nondeterministic`. Před bajtovým porovnáním se v obou výstupech každý token `@[0-9a-f]+`
nahradí za `@<hash>`, stejně jako ve zprávách výjimek (D5a; `sameOutput` v `tools/corpus/sweep.ts`).
Příčina: programová volba `debug.discoGraph` algoritmu disco exportuje `...DCGraph@<identity hash>`,
což žádný seed nezafixuje. Komparátor v TS používá stejné nahrazení. Nedeterministické případy
se hlásí zvlášť a vylučují se z počtů úspěšných, v souladu s výše uvedenými
zásadami pro identitní hashe.

Skutečné zbývající zdroje `nondeterministic` (chování ELK, ne chyby harnessu; počty jsou v
reportu parity): spore (`ElkGraphImporter.java:169` přidává šum pomocí `Math.random`) a `random`
(výchozí `randomSeed` 0 je u vnořených složených uzlů neseedovaný; retarget seeduje jen kořen, D2,
ponecháno na rozhodnutí uživatele). Přejmenování id `_g<random>` exportérem zdrojem nejsou: seam
patch je opravuje.

## 3. Goldeny a korpus

AD-5. Referenční výstupy jsou commitnuté, takže CI nepotřebuje JVM.

| Položka           | Kde                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Připnutý korpus   | `eclipse-elk/elk-models` na `commit` v `test/corpus/manifest.json` (není součástí distribuce)   |
| Adresář modelů    | `$ELK_MODELS_DIR`, výchozí `../../eclipse-elk/elk-models` vzhledem k tomuto repozitáři          |
| Kurátorovaná sada | `golden[]` v `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Refy              | `test/golden/refs/elk/<id>.json`, jeden na každé `id` v manifestu                               |
| Původ             | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Mapování id na cestu.** `golden[].path` je relativní k `$ELK_MODELS_DIR` a
vstup je `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` spustí harness na
těchto vstupech a každý výstup `<basename>.json` uloží jako `refs/elk/<id>.json`.
Příklad: id `ptolemy-scrambler` je
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerace** (`tools/oracle/regen-goldens.sh`):

1. Vyžaduje, aby klon models byl přesně na commitu z manifestu (jinak exit `1`).
2. Vyžaduje sestavené orákulum (`run.sh` potřebuje `oracle-build.json`).
3. Připraví všechny refy a `_meta.json` v `test/golden/refs/.elk-staging.*` a poté
   prohodí adresář dvěma přejmenováními, takže neúspěšný běh zanechá staré refy.
4. `_meta.json` neobsahuje časová razítka (`builtAt` zůstává v `oracle-build.json`), takže
   regenerace bez změněných vstupů je v gitu bajt po bajtu no-op.

**Kdy regenerovat:** po změně `ELK_COMMIT`, série patchů, sady
`golden[]` nebo `commit` v manifestu, nebo harnessu. Jinak nikdy.

**Pravidlo žurnálování.** Každá regenerace, která změní ref, se zaznamená do žurnálu
s příčinou (id patche nebo posun commitu). Refy se nikdy needitují ručně. Pokud
aserce v TS nebo golden mohou projít jen změnou, zastavte se a zaznamenejte do žurnálu (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` nic nerozvrhuje: spustí orákulum v režimu parsování
nad všemi modely a výsledek porovná s commitnutým `test/corpus/census.json` (898
modelů: id, formáty, zdroj, kořenový algoritmus, počty rysů). Exit `0` při shodě, `1` při driftu;
`--write` soubor přepíše. Běží jen v připnutém klonu models a při chybě
harnessu se přeruší.

**Generovaný korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` obsahuje seedovanou
konfiguraci grandom; sousední `.json` je orákulem vygenerovaný nerozvržený vstup. Devět konfigurací pokrývá
id algoritmů, která nepoužívá žádný model z elk-models: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Každá má nejvýše 50 uzlů a
žádné popisky hran (`BlindTextGenerator` je neseedovaný). Harness pojmenuje generovaný kořen `root`,
protože `JsonExporter` v ELK řeší kolizi id neseedovanou náhodnou příponou. Regenerujte
jen pomocí `tools/oracle/regen-generated.sh` (pracovní adresář a přejmenování; selhávající konfigurace
zanechá staré soubory); opakovaný běh bez změn je v gitu no-op. Port grandom v TS musí
tyto soubory `.json` reprodukovat bajt po bajtu; goldeny algoritmů na něm nikdy nezávisí.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` naplánuje každý případ, každý spustí dvakrát v samostatných JVM (shardy
jsou ve výchozím nastavení `min(cpus, 8)` souběžných procesů `run.sh`) a zapíše
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` vypíše počty případů podle tieru a nic nespustí; `--filter` ponechá id případů obsahující
podřetězec; `--limit` vezme vzorek s rovnoměrným krokem. Exit `0`, pokud žádný případ není `oracle-error`
(`1`); selhání nástroje skončí kódem `2`. Výstupy jednotlivých případů zůstávají lokální (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(výchozí `30000`, čte jen `tools/`) omezuje každý případ; `run.sh` po timeoutu
restartuje JVM (exit kód JVM 75) pro případy bez řádku s výsledkem.

**Report parity (D9).** `docs/parity-report.md` se generuje z cache sweepu a je commitnutý:
počty podle algoritmu a verdiktu, s commity ELK a models a bez časových razítek. Regenerujte
pomocí `npx tsx tools/corpus/parity-report.ts --write`; bez `--write` příkaz skončí s `1`,
pokud je commitnutý report zastaralý. Nikdy ho neupravujte ručně.

**Testy korpusu.** `resolveModelsDir()` v `test/corpus/corpus.ts` vrací
důvod `skip`, když klon chybí nebo je na jiném commitu; testy, které ho potřebují,
se přeskočí s připnutým sha ve zprávě. Dnes `test/golden/oracle-refs.test.ts`
kontroluje jen commitnuté refy: jeden na každé id v manifestu, geometrii na každém uzlu,
portu, popisku a hraně, porovnání se sebou samým a to, že `_meta.json` odpovídá
`ELK_COMMIT`, manifestu a generátoru. Test rozvržení TS proti orákulu
zatím neexistuje; přijde s prvním portovaným algoritmem.

## 4. Seam patche

Seam patche mění orákulum; jsou vzácné a vždy spárované se seamem v TS.

1. Upravte a commitněte ve worktree orákula (`$ELK_ORACLE_DIR`), nebo patch vytvořte ve scratch
   klonu na `ELK_COMMIT`. Chcete-li hotový patch přidat do existujícího worktree na místě (zachová
   cache `census/` a `sweep/`, které odstranění worktree smaže), aplikujte ho s identitou
   `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` pak ověří sérii a přebuilduje na místě (asi 3 minuty), takže kroky 4-5
   lze vynechat.
2. Exportujte:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (nebo jen nové commity). Soubory se jmenují `NNNN-<slug>.patch`; číselná
   předpona určuje pořadí aplikace.
3. Přidejte odpovídající seam v TS (stejné chování, injektovatelný, v `src/`) s testy,
   jejichž očekávané hodnoty pocházejí z patchovaného orákula (AD-13).
4. Jinak odstraňte worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (přidejte `--force`, pokud ho výstupy buildu znečistily).
5. Přebuildujte: `tools/oracle/build.sh` (aplikuje sérii znovu od začátku).
6. Regenerujte: `tools/oracle/regen-goldens.sh`; zkontrolujte `git diff test/golden/refs`.
7. Zapište do žurnálu záznam, který pojmenuje patch (`NNNN-<slug>.patch`) a vypíše každý
   změněný ref. `patches` v `_meta.json` zaznamená sérii automaticky.

Nikdy nenechávejte ve worktree necommitnutou úpravu: `build.sh` ji považuje za zastaralou
(exit `2`). Nikdy neupravujte samotný `ELK_SOURCE_DIR`.

## 5. Provoz orákula (runbook)

| Selhání                                                                          | Zjištění                                                                                                                                                                                                                                                               | Řešení                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build Tycho selže (p2 nedostupné, JDK, verze Mavenu)                             | `tools/oracle/build.sh` skončí nenulově; úplný výstup Mavenu je v `.oracle-build.log` v kořeni repozitáře. Exit `1` je chybějící nástroj nebo špatný Maven; exit `3` znamená, že jar bundlu nevznikl                                                                   | Maven musí být **3.9.x**: Tycho 4.0.12 selže na Mavenu 3.10 (Homebrew 3.10.0) s `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Lokální 3.9.11 je v `.tools/apache-maven-3.9.11/` (v gitignore): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Použijte JDK 21, nebo JDK 17 přes `JAVA_HOME`. Zkontrolujte síť (první běh stahuje artefakty p2), pak spusťte znovu. `build.sh --record-only` přeskočí Maven a jen přepíše `oracle-build.json` z už sestavených jarů. Exit `2`: odstraňte worktree (sekce 4 krok 4) a přebuildujte. Jinak eskalujte s koncem logu |
| `build.sh` skončí s `2` hned po aplikaci patche                                  | Worktree ohlášen jako zastaralý                                                                                                                                                                                                                                        | `build.sh` rozbaluje zalomené předměty patchů (`git format-patch` je láme zhruba po 78 znacích) a ignoruje nesledované cache `census/` a `sweep/`; jiná špína nebo nevypsaný patch stále dá exit `2`: opravte worktree (sekce 4)                                                                                                                                                                                                                                                                                                                                                                                              |
| Drift goldenů po patchi nebo posunu commitu                                      | `tools/oracle/regen-goldens.sh` následovaný `git diff --exit-code test/golden/refs` je neprázdný; `test/golden/oracle-refs.test.ts` selže na zastaralém `_meta.json` (`elkCommit`, `modelsCommit`); test shody v TS, až bude existovat, selže s reportem `formatDiffs` | Přebuildujte (`build.sh`), spusťte `regen-goldens.sh`, zkontrolujte diff, zapište id patche do žurnálu. Nikdy neupravujte ref ručně ani neuvolňujte `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| V cache p2 chybí jar Xtext/ANTLR (`.elkt`, `.elkr` nebo jakýkoli start `run.sh`) | `run.sh` skončí nenulově s `bundle <name> not in p2 cache <dir>` (např. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                           | Nastavte `P2_BUNDLES` na cache p2 nástroje Tycho, která ho obsahuje, nebo spusťte `build.sh` s přístupem k síti, aby ho Tycho stáhl; spusťte `run.sh` znovu. Nenahrazujte jary odjinud                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sweep se zasekne nebo OOM                                                        | Případ běží až do timeoutu a hlásí `timeout` (řádek na stderr ho pojmenuje); běh bez řádku s výsledkem dá `oracle-error` a `sweep: shard <n> run <A or B> exited <code>` na stderr; stroj swapuje při 8 souběžných JVM                                                 | Snižte souběžnost a velikost dávky: `sweep.sh --shards 2`, zúžte pomocí `--filter` nebo `--limit`. `ELK_SWEEP_TIMEOUT_MS` zvyšujte jen pro model, který je pomalý, ale správný. Reprodukovatelný `timeout` je nález: zapište id případu do žurnálu, limit nerozšiřujte, abyste ho skryli                                                                                                                                                                                                                                                                                                                                      |
| Drift censu po posunu pinu (`ELK_COMMIT` nebo `commit` models)                   | `npx tsx tools/corpus/census.ts` skončí s `1` a vypíše odlišné modely; `test/corpus/census.test.ts` selže                                                                                                                                                              | Potvrďte, že klon a orákulum jsou na nových pinech, spusťte znovu `census.ts --write`, zkontrolujte `git diff test/corpus/census.json`, zapište příčinu do žurnálu, pak spusťte znovu `sweep.sh` a regenerujte report parity. Nikdy neupravujte census ručně                                                                                                                                                                                                                                                                                                                                                                  |
| elk-models chybí nebo špatné sha                                                 | Testy korpusu se přeskočí se zprávou pojmenující očekávané sha; `regen-goldens.sh` skončí s `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                         | Spusťte `test/corpus/fetch.sh` (naklonuje a checkoutne připnutý commit). Skončí s `2`, pokud je existující klon na jiném commitu, a nedotkne se ho: opravte ten klon sami nebo nasměrujte `ELK_MODELS_DIR` na novou cestu. Nikdy neposouvejte HEAD existujícího klonu ze skriptu                                                                                                                                                                                                                                                                                                                                              |

Další selhání `run.sh`: `oracle-build.json missing` nebo `oracle jar missing`
znamená, že nejdřív spusťte `build.sh`; `bundle <name> not in p2 cache` znamená, že nastavte
`P2_BUNDLES` na cache p2 nástroje Tycho nebo znovu spusťte `build.sh` s přístupem k síti.

## 6. Gates

Každá změna:

| Gate             | Příkaz                                                     | Kritérium                                                                                     |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Typy             | `npm run typecheck`                                        | exit 0                                                                                        |
| Testy a coverage | `npm run coverage`                                         | všechny testy projdou; 90 % statements, branches, functions a lines v `src/**`                |
| Architektura     | `test/architecture/*.fitness.test.ts` (spouští `npm test`) | hranice modulů, globální proměnné modulů, žádné vestavěné moduly Node v `src/`, hlavičky SPDX |
| Refy orákula     | `test/golden/oracle-refs.test.ts`                          | commitnuté refy konzistentní s manifestem a `ELK_COMMIT`                                      |

Změny v `tools/oracle/`, manifestu nebo sérii patchů vyžadují navíc:

| Gate              | Příkaz                                                                        | Kritérium                                                            |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Build orákula     | `tools/oracle/build.sh`                                                       | exit 0                                                               |
| Běh orákula       | `tools/oracle/run.sh <outDir> <input.json>...`                                | exit 0, žádné řádky `ERROR`                                          |
| Stabilita goldenů | `tools/oracle/regen-goldens.sh`, poté `git diff --exit-code test/golden/refs` | žádný diff, pokud změna nemá posunout refy a není zapsána do žurnálu |
| Shell             | `shellcheck tools/oracle/*.sh`                                                | čisté                                                                |

Změny v `tools/oracle/` nebo `tools/corpus/` vyžadují navíc:

| Gate                   | Příkaz                                                                               | Kritérium                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Census                 | `npx tsx tools/corpus/census.ts`                                                     | exit 0 (žádný drift)                                              |
| Stabilita generovaných | `tools/oracle/regen-generated.sh`, poté `git diff --exit-code test/corpus/generated` | žádný diff                                                        |
| Sweep                  | `tools/oracle/sweep.sh` (nebo `--filter`/`--limit` pro vzorek)                       | exit 0: žádný `oracle-error`                                      |
| Report parity          | `npx tsx tools/corpus/parity-report.ts`                                              | exit 0 (commitnutý report aktuální); regenerujte pomocí `--write` |
