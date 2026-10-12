---
title: Conformitate
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformitate: ce înseamnă „corespondență”

@knowvah/elk-engine este validat în raport cu Eclipse ELK (Java) din upstream, compilat din
surse. Un layout TypeScript este **conform** cu oracolul atunci când, după parsarea ambelor
ca ELK JSON, structura și fiecare valoare nenumerică sunt exact egale, iar fiecare număr finit
coincide în limita unei toleranțe absolute de `1e-6`.
Comparatorul este [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
acest document descrie ce implementează el. Regulile de portare se găsesc în
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Secțiune                                                  | Răspunde la                                           |
| --- | --------------------------------------------------------- | ----------------------------------------------------- |
| 1   | [Oracol](#1-oracol)                                       | Ce este „corect” și la ce commit?                     |
| 1a  | [Unitatea de conformitate](#1a-unitatea-de-conformitate)  | Ce este un caz și ce cazuri există?                   |
| 2   | [Criteriul de conformitate](#2-criteriul-de-conformitate) | Ce se consideră egal?                                 |
| 3   | [Goldens și corpus](#3-goldens-și-corpus)                 | De unde provin ieșirile de referință?                 |
| 4   | [Patch-uri seam](#4-patch-uri-seam)                       | Cum modificăm oracolul?                               |
| 5   | [Operarea oracolului](#5-operarea-oracolului-runbook)     | Ce fac când se defectează?                            |
| 6   | [Gates](#6-gates)                                         | Ce trebuie să treacă înainte ca o schimbare să intre? |

## 1. Oracol

Oracolul (AD-3) este ELK din upstream, **compilat din surse** într-un worktree git detașat
al `$ELK_SOURCE_DIR`, creat în `$ELK_ORACLE_DIR` de `tools/oracle/build.sh`.
Ambele se află în afara acestui depozit; niciunul nu este inclus.

| Element               | Unde                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| Commit ELK fixat      | `tools/oracle/ELK_COMMIT` (în prezent `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)       |
| Seria de patch-uri    | `tools/oracle/patches/*.patch`, aplicate în ordine lexicală cu `git am --3way`          |
| Compilare             | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho descarcă artefacte p2)             |
| Executor de loturi    | `tools/oracle/run.sh <outDir> <input>...` sau `run.sh --cases <cases.jsonl> <outDir>`   |
| Harness               | `tools/oracle/harness/ElkOracle.java`                                                   |
| Manifestul compilării | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patch-uri, JDK, jar pentru fiecare bundle) |

**Compilarea.** `build.sh` rulează `mvn -P elk-meta clean install -DskipTests` (compilatorul
melk) și apoi `mvn clean install -DskipTests -Dmaven.test.skip=true` din
`build/` în worktree, după care înregistrează în `oracle-build.json` jar-ul fiecărui bundle
din domeniu
(`core`, `graph`, `graph.json`, `alg.common` și algoritmii `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex`). Un worktree existent este reutilizat
doar dacă descinde din `ELK_COMMIT`, poartă exact subiectele patch-urilor din
`tools/oracle/patches/` și este curat, în afara ieșirilor de compilare; în caz contrar,
`build.sh` se încheie cu `2` și îl lasă neatins.

**Rularea.** `run.sh` compilează `ElkOracle.java` în raport cu jar-urile bundle-urilor și cu
bundle-urile terțe (Gson, Guava, EMF, bibliotecile Xtext/Xtend) din cache-ul p2 Tycho
(`P2_BUNDLES`, implicit `~/.m2/repository/p2/osgi/bundle`; se folosește cea mai nouă
versiune a fiecăruia). O singură JVM aplică layout pentru fiecare intrare cu
`RecursiveGraphLayoutEngine` și scrie `<outDir>/<input basename>.json`
cu layout, dimensiuni zero și poziții zero incluse, iar opțiunile de layout necunoscute sunt omise.
O intrare care eșuează tipărește `ERROR <input>: <message>`; JVM se încheie cu `1` dacă
vreo intrare a eșuat. Numele de bază ale intrărilor trebuie să fie unice într-o
singură rulare, deoarece numele ieșirii este numele de bază.

**Semantica seriei de patch-uri.** Seria conține astăzi un singur patch:

| Patch                                                                   | Efect                                                                                                                                                                                                                                                     | Seam TS asociat                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` rezolvă coliziunile de id cu `"_g" + Random.nextInt(1000000)`; patch-ul inițializează acel `Random` din proprietatea de sistem `org.eclipse.elk.graph.json.exportSeed` (nesetată = comportamentul ELK). `run.sh` transmite `EXPORT_SEED=1` | `Random` injectabil în portarea `graph.json`; în așteptarea acelei portări (shim-ul TS `Random` reproduce deja secvența: seed 1 dă 548985, 764588) |

Patch-urile există doar pentru a adăuga seam-uri strict delimitate, care fac comparabile comportamentul JVM și cel JS;
fiecare este asociat cu un seam din partea TS (secțiunea 4).

**De ce nu elkjs?** elkjs este ELK compilat cu GWT. Nu poate purta seria noastră de patch-uri,
iar emularea JRE de către GWT diferă de JVM-ul din care portăm.
Nu este consultat ca oracol.

## 1a. Unitatea de conformitate

Un **caz** este `(algorithm, model, variant)` (D1). Tabloul de bord al parității are un rând pentru fiecare
algoritm de layout; folderul elk-models și caracteristicile recensământului sunt filtre, nu rânduri.

**Id-ul cazului.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, de exemplu
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` este id-ul algoritmului
fără `org.eclipse.elk.`. Pentru modelele generate, `modelId` este `generated/<name>`.

**Id-ul și sursa modelului (D3).** Id-ul modelului este calea din elk-models fără extensie.
Un caz citește `.json` când există, altfel `.elkt`; `.elkg` (EMF XMI) nu este citit niciodată.

**Variante (D6).** Suprapuneri denumite de opțiuni în `test/corpus/variants.json`, aplicate la rădăcină:
`default` (niciuna), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritm                                                        | Modele                            | Variante                 |
| ------------ | --------------------------------------------------------------- | --------------------------------- | ------------------------ |
| native       | propriul `rootAlgorithm` al modelului                           | fiecare model din recensământ     | toate cele șapte         |
| retarget     | fiecare algoritm listat, cu excepția celui propriu al modelului | fiecare model din recensământ     | doar `default` (OR-1)    |
| generated    | algoritmul indicat de prefixul fișierului                       | `test/corpus/generated/*.json`    | toate cele șapte         |
| ported JUnit | pe fiecare misiune de algoritm                                  | cazuri JUnit din upstream (AD-13) | după cum au fost portate |

`tools/oracle/run.sh --list-algorithms` este lista id-urilor de algoritm (14 în prezent).

**Retarget (D2).** Harness-ul setează `org.eclipse.elk.algorithm` pe **fiecare nod care are
copii**, înlocuind orice valoare declarată, și `org.eclipse.elk.randomSeed = 1` la rădăcină. ELK
rezolvă algoritmul pentru fiecare nod, iar un nod nesetat revine la layered. O rădăcină fără
copii primește doar seed-ul. Tier-ul retarget omite `rootAlgorithm`-ul propriu al fiecărui model (tier-ul
native îl acoperă).

## 2. Criteriul de conformitate

AD-4, exact așa cum îl implementează `compareLayout(expected, actual, { tol })`:

| Regulă                   | Comportament                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toleranță                | Absolută, `DEFAULT_TOLERANCE = 1e-6`; numerele finite trec când `abs(e - a) <= tol`                                                                                                                     |
| Numere nefinite          | `NaN` și `±Infinity` trebuie să fie exact egale (`Object.is` sau `===`), chiar și cu `tol: Infinity`                                                                                                    |
| Șiruri, booleeni, `null` | Strict egale, altfel `value`                                                                                                                                                                            |
| Neconcordanță de tip     | Tipuri JSON diferite (`null`, array, obiect, număr, șir, boolean) dau o singură diferență `type`                                                                                                        |
| Chei de obiect           | Mulțimea de chei trebuie să fie identică: o cheie doar în expected este `missing`, doar în actual este `extra`                                                                                          |
| Array-uri                | Asociate **după `id`** când fiecare element de pe ambele părți este un obiect cu `id` de tip șir, iar id-urile sunt unice pe fiecare parte (un array gol contează ca având chei); altfel **pozițional** |
| Array-uri cu chei        | Un id doar pe o parte este o diferență `structure` la `path[id=<id>]`; ordinea este ignorată                                                                                                            |
| Array-uri poziționale    | O diferență de lungime este o singură diferență `structure`, iar elementele nu se mai compară în continuare                                                                                             |
| Tipuri de diferență      | `structure`, `value`, `type`, `missing`, `extra`; `path` este similar unei căi JSON (`children[id=n1].x`)                                                                                               |

Consecințe: id-urile elementelor, numărul de elemente, topologia secțiunilor de muchie și
numărul punctelor de îndoire sunt exacte, deoarece id-urile și lungimile array-urilor sunt exacte;
coordonatele și dimensiunile primesc `1e-6`. `formatDiffs` tipărește cel mult 20 de diferențe.

**Politica divergențelor cunoscute.** O divergență nu este niciodată absorbită prin creșterea `tol`
sau prin editarea unui golden (AD-13). Fiecare este consemnată aici, cu cauza ei și cu testul sau
fixture-ul pe care îl afectează. Clase acceptate:

- **Diferențe `Math.*` la nivel de ulp.** V8 și JVM pot diferi în ultimul bit
  al lui `sin`, `cos`, `exp`, `log`, `pow` și al celor asemănătoare; `StrictMath` din Java este
  specificat ca exact la nivel de bit, `Math` nu. Cazul deja întâlnit: `nextGaussian`
  este specificat să folosească `StrictMath.log`, astfel că `src/java/util/Random.ts` conține o
  implementare exactă față de `StrictMath.log`, în loc de `Math.log`. Preferați o portare
  exactă la nivel de bit a algoritmului `StrictMath` în locul lărgirii toleranței.
- **Iterarea după hash de identitate (AD-10).** Iterarea unui `HashMap`/`HashSet` cu chei
  obiect cu hash de identitate este nedeterministă chiar și în Java. Consemnați locul în jurnal
  și portați cu ordinea de inserare; goldens nu trebuie să depindă de ea.
  Cheile cu hash după valoare (String, Integer) trebuie să reproducă ordinea din Java.
- **`Random` inițializat din timp.** Cu `randomSeed = 0`, ELK inițializează din ceas
  (`core/Core.melk:608`), deci ieșirea nu este reproductibilă. Intrările golden trebuie să
  lase seed-ul nesetat sau nenul (seed-ul implicit al layered este `1`).

Intrări concrete (adăugați una doar cu aprobarea utilizatorului):

| #   | Divergență                            | Cauză                                                                               | Domeniu                                                                                                                                                                          | Aprobat                    |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Textul mesajului de eroare de parsare | Mesajele ANTLR sunt artefacte ale parserului generat, care nu este niciodată portat | Intrare de gramatică invalidă (`.elkt`, `.elkj`, `.elkr`): doar _existența_ unei erori de parsare trebuie să corespundă, nu mesajul. Intrarea validă trebuie să corespundă exact | D8, utilizator, 2026-10-11 |

**Verdicte.** Fiecare caz primește un verdict din două rulări JVM separate ale oracolului (D4, D5, OR-2):

| Verdict            | Semnificație                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Ambele rulări au aplicat layout modelului, iar fișierele de ieșire sunt identice la nivel de octet                                                                    |
| `throws`           | Ambele rulări au aruncat aceeași excepție: clasă exactă și mesaj exact după ce `@[0-9a-f]+` devine `@<hash>` (mesajul poate fi null, de exemplu `StackOverflowError`) |
| `nondeterministic` | Rulările diferă (octeții ieșirii, excepția, sau una `ok` și una `throws`)                                                                                             |
| `oracle-error`     | Defecțiune a harness-ului (intrare ilizibilă, variantă/algoritm/opțiune necunoscută, linie de rezultat pierdută); niciodată acceptabil                                |
| `timeout`          | O rulare a depășit `ELK_SWEEP_TIMEOUT_MS`                                                                                                                             |

Precedență: `oracle-error`, apoi `timeout`, apoi `ok`/`throws` când sunt egale, altfel
`nondeterministic`. Înainte de compararea octeților, fiecare token `@[0-9a-f]+` din ambele ieșiri este
înlocuit cu `@<hash>`, ca în mesajele excepțiilor (D5a; `sameOutput` în `tools/corpus/sweep.ts`).
Cauză: opțiunea programatică `debug.discoGraph` a disco exportă `...DCGraph@<identity hash>`,
pe care niciun seed nu îl poate fixa. Comparatorul TS aplică aceeași înlocuire. Cazurile nedeterministe
sunt raportate separat și excluse din numărătorile de trecere, în acord cu politica
hash-urilor de identitate de mai sus.

Sursele reale rămase de `nondeterministic` (comportament ELK, nu defecțiuni ale harness-ului; numărătorile sunt în
raportul de paritate): spore (`ElkGraphImporter.java:169` introduce zgomot cu `Math.random`) și `random`
(`randomSeed` implicit 0 nu este inițializat pe compozitele imbricate; retarget inițializează doar rădăcina, D2,
păstrat prin decizia utilizatorului). Redenumirile de id `_g<random>` ale exportatorului nu sunt o sursă: patch-ul seam
le remediază.

## 3. Goldens și corpus

AD-5. Ieșirile de referință sunt comise, astfel încât CI-ul să nu aibă nevoie de JVM.

| Element            | Unde                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Corpus fixat       | `eclipse-elk/elk-models` la `commit`-ul din `test/corpus/manifest.json` (nu este inclus)        |
| Director de modele | `$ELK_MODELS_DIR`, implicit `../../eclipse-elk/elk-models` relativ la acest depozit             |
| Set curatat        | `golden[]` în `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs               | `test/golden/refs/elk/<id>.json`, câte unul pentru fiecare `id` din manifest                    |
| Proveniență        | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Maparea id → cale.** `golden[].path` este relativ la `$ELK_MODELS_DIR`, iar
intrarea este `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` rulează harness-ul pe
aceste intrări și plasează fiecare ieșire `<basename>.json` ca `refs/elk/<id>.json`.
Exemplu: id-ul `ptolemy-scrambler` este
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerarea** (`tools/oracle/regen-goldens.sh`):

1. Necesită ca clona models să fie exact la commit-ul din manifest (altfel ieșire `1`).
2. Necesită un oracol compilat (`run.sh` are nevoie de `oracle-build.json`).
3. Plasează toate refs și `_meta.json` în `test/golden/refs/.elk-staging.*`, apoi
   schimbă directorul prin două redenumiri, astfel încât o rulare eșuată să lase refs vechi.
4. `_meta.json` nu conține marcaje de timp (`builtAt` rămâne în `oracle-build.json`), deci o
   regenerare fără intrări modificate este, în git, un no-op octet cu octet.

**Când se regenerează:** după modificarea `ELK_COMMIT`, a seriei de patch-uri, a setului
`golden[]` sau a `commit`-ului din manifest, ori a harness-ului. Niciodată altfel.

**Regula jurnalizării.** Fiecare regenerare care modifică un ref este consemnată în jurnal cu
cauza (id-ul patch-ului sau creșterea commit-ului). Refs nu se editează niciodată manual. Dacă o
aserțiune TS sau un golden poate trece doar prin modificare, opriți-vă și consemnați în jurnal (AD-13).

**Recensământul.** `npx tsx tools/corpus/census.ts` nu aplică niciun layout: rulează oracolul în modul parse
peste fiecare model și compară rezultatul cu `test/corpus/census.json` comis (898
de modele: id, formate, sursă, algoritm rădăcină, numărători de caracteristici). Ieșire `0` când sunt egale, `1` la derivă;
`--write` rescrie fișierul. Rulează doar în clona models fixată și se oprește la o
defecțiune a harness-ului.

**Corpusul generat (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` conține o configurație
grandom cu seed; `.json`-ul alăturat este intrarea generată de oracol, fără layout. Nouă configurații acoperă
id-urile de algoritm pe care niciun model elk-models nu le folosește: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Fiecare are cel mult 50 de noduri și
nicio etichetă de muchie (`BlindTextGenerator` nu are seed). Harness-ul numește rădăcina generată `root`,
deoarece `JsonExporter` din ELK rezolvă o coliziune de id cu un sufix aleatoriu fără seed. Regenerați
doar cu `tools/oracle/regen-generated.sh` (director de staging și redenumire; o configurație care eșuează
lasă fișierele vechi); o rerulare fără modificări este un no-op în git. Portarea TS a grandom trebuie
să reproducă aceste fișiere `.json` octet cu octet; goldens ale algoritmilor nu depind niciodată de ea.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planifică fiecare caz, rulează fiecare caz de două ori în JVM-uri separate (shards
implicit `min(cpus, 8)` procese `run.sh` concurente) și scrie
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` tipărește numărul de cazuri pe tier și nu rulează nimic; `--filter` păstrează id-urile de caz care conțin
subșirul; `--limit` ia un eșantion cu pas uniform. Ieșire `0`, cu excepția cazului în care un caz este `oracle-error`
(`1`); o defecțiune a uneltei se încheie cu `2`. Ieșirile pe caz rămân locale (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(implicit `30000`, citit doar de `tools/`) limitează fiecare caz; `run.sh` repornește o JVM după un
timeout (cod de ieșire JVM 75) pentru cazurile fără linie de rezultat.

**Raportul de paritate (D9).** `docs/parity-report.md` este generat din cache-ul sweep și comis:
numărători pe algoritm și verdict, cu commit-urile ELK și models și fără marcaje de timp. Regenerați
cu `npx tsx tools/corpus/parity-report.ts --write`; fără `--write`, comanda se încheie cu `1`
când raportul comis este depășit. Nu îl editați niciodată manual.

**Teste de corpus.** `resolveModelsDir()` din `test/corpus/corpus.ts` returnează un
motiv `skip` când clona lipsește sau este la alt commit; testele care au nevoie de ea
sunt omise, cu sha-ul fixat în mesaj. Astăzi, `test/golden/oracle-refs.test.ts`
verifică doar refs comise: unul pentru fiecare id din manifest, geometrie pe fiecare nod,
port, etichetă și muchie, autocomparare, și că `_meta.json` corespunde cu
`ELK_COMMIT`, manifestul și generatorul. Nu există încă un test de layout TS-versus-oracol;
apare odată cu primul algoritm portat.

## 4. Patch-uri seam

Patch-urile seam modifică oracolul; sunt rare și întotdeauna asociate cu un seam TS.

1. Editați și comiteți în worktree-ul oracolului (`$ELK_ORACLE_DIR`) sau redactați patch-ul într-o clonă temporară la
   `ELK_COMMIT`. Pentru a adăuga un patch finalizat pe loc la worktree-ul existent (păstrează
   cache-urile `census/` și `sweep/`, pe care ștergerea worktree-ului le elimină), aplicați-l cu
   identitatea lui `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verifică apoi seria și recompilează pe loc (aproximativ 3 minute), deci pașii 4-5
   pot fi omiși.
2. Exportați:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (sau doar commit-urile noi). Fișierele se numesc `NNNN-<slug>.patch`; prefixul
   numeric fixează ordinea de aplicare.
3. Adăugați seam-ul TS corespunzător (același comportament, injectabil, în `src/`), cu teste
   ale căror valori așteptate provin din oracolul cu patch-uri (AD-13).
4. Altfel, eliminați worktree-ul: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (adăugați `--force` dacă ieșirile de compilare îl murdăresc).
5. Recompilați: `tools/oracle/build.sh` (reaplică seria de la zero).
6. Regenerați: `tools/oracle/regen-goldens.sh`; revizuiți `git diff test/golden/refs`.
7. Consemnați în jurnal o intrare care numește patch-ul (`NNNN-<slug>.patch`) și listează fiecare
   ref modificat. `patches` din `_meta.json` înregistrează seria automat.

Nu lăsați niciodată o modificare necomisă în worktree: `build.sh` o tratează ca depășită
(ieșire `2`). Nu editați niciodată `ELK_SOURCE_DIR` însuși.

## 5. Operarea oracolului (runbook)

| Defecțiune                                                                             | Detectare                                                                                                                                                                                                                                                                      | Remediere                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compilarea Tycho eșuează (p2 inaccesibil, JDK, versiunea Maven)                        | `tools/oracle/build.sh` se încheie cu cod nenul; ieșirea completă Maven este în `.oracle-build.log` în rădăcina depozitului. Ieșirea `1` înseamnă o unealtă lipsă sau un Maven greșit; ieșirea `3` înseamnă că un jar de bundle nu a fost produs                               | Maven trebuie să fie **3.9.x**: Tycho 4.0.12 eșuează pe Maven 3.10 (3.10.0 din Homebrew) cu `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Un 3.9.11 local se află în `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Folosiți JDK 21 sau JDK 17 prin `JAVA_HOME`. Verificați rețeaua (prima rulare descarcă artefacte p2), apoi rulați din nou. `build.sh --record-only` omite Maven și rescrie doar `oracle-build.json` din jar-urile deja compilate. Ieșire `2`: eliminați worktree-ul (secțiunea 4, pasul 4) și recompilați. În caz contrar, escaladați cu finalul jurnalului |
| `build.sh` se încheie cu `2` imediat după aplicarea unui patch                         | Worktree raportat ca depășit                                                                                                                                                                                                                                                   | `build.sh` despachetează subiectele de patch-uri înfășurate (`git format-patch` le înfășoară peste aproximativ 78 de caractere) și ignoră cache-urile neurmărite `census/` și `sweep/`; orice altă murdărie sau un patch nelistat dă în continuare ieșire `2`: reparați worktree-ul (secțiunea 4)                                                                                                                                                                                                                                                                                                                                                                                         |
| Derivă a goldens după un patch sau o creștere de commit                                | `tools/oracle/regen-goldens.sh` urmat de `git diff --exit-code test/golden/refs` este nevid; `test/golden/oracle-refs.test.ts` eșuează la un `_meta.json` depășit (`elkCommit`, `modelsCommit`); un test de conformitate TS, odată prezent, eșuează cu un raport `formatDiffs` | Recompilați (`build.sh`), rulați `regen-goldens.sh`, revizuiți diferența, consemnați în jurnal id-ul patch-ului. Nu editați niciodată manual un ref și nu slăbiți `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Jar Xtext/ANTLR lipsește din cache-ul p2 (`.elkt`, `.elkr` sau orice pornire `run.sh`) | `run.sh` se încheie cu cod nenul și `bundle <name> not in p2 cache <dir>` (de exemplu `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                     | Setați `P2_BUNDLES` la cache-ul p2 Tycho care îl conține sau rulați `build.sh` cu acces la rețea, ca Tycho să îl aducă; rulați din nou `run.sh`. Nu înlocuiți cu jar-uri din altă parte                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sweep blocat sau OOM                                                                   | Un caz rulează până la timeout și raportează `timeout` (o linie stderr îl numește); o rulare fără linie de rezultat dă `oracle-error` și `sweep: shard <n> run <A or B> exited <code>` pe stderr; mașina face swap sub 8 JVM-uri concurente                                    | Reduceți concurența și dimensiunea lotului: `sweep.sh --shards 2`, restrângeți cu `--filter` sau `--limit`. Mărați `ELK_SWEEP_TIMEOUT_MS` doar pentru un model lent, dar corect. Un `timeout` reproductibil este o constatare: consemnați în jurnal id-ul cazului, nu lărgiți limita pentru a-l ascunde                                                                                                                                                                                                                                                                                                                                                                                   |
| Derivă a recensământului după o creștere de pin (`ELK_COMMIT` sau `commit` models)     | `npx tsx tools/corpus/census.ts` se încheie cu `1` și listează modelele diferite; `test/corpus/census.test.ts` eșuează                                                                                                                                                         | Confirmați că clona și oracolul sunt la noile pin-uri, rulați din nou `census.ts --write`, revizuiți `git diff test/corpus/census.json`, consemnați cauza în jurnal, apoi rulați din nou `sweep.sh` și regenerați raportul de paritate. Nu editați niciodată manual recensământul                                                                                                                                                                                                                                                                                                                                                                                                         |
| elk-models lipsește sau sha greșit                                                     | Testele de corpus sunt omise cu un mesaj care numește sha-ul așteptat; `regen-goldens.sh` se încheie cu `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                     | Rulați `test/corpus/fetch.sh` (clonează și extrage commit-ul fixat). Se încheie cu `2` dacă o clonă existentă este la alt commit și nu o atinge: reparați singuri acea clonă sau îndreptați `ELK_MODELS_DIR` către o cale nouă. Nu mutați niciodată HEAD-ul unei clone existente dintr-un script                                                                                                                                                                                                                                                                                                                                                                                          |

Alte defecțiuni `run.sh`: `oracle-build.json missing` sau `oracle jar missing`
înseamnă că trebuie rulat mai întâi `build.sh`; `bundle <name> not in p2 cache` înseamnă că trebuie setat
`P2_BUNDLES` la cache-ul p2 Tycho sau rulat din nou `build.sh` cu acces la rețea.

## 6. Gates

Orice schimbare:

| Gate                | Comandă                                                      | Criteriu                                                                           |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Tipuri              | `npm run typecheck`                                          | ieșire 0                                                                           |
| Teste și coverage   | `npm run coverage`                                           | toate testele trec; 90% statements, branches, functions și lines peste `src/**`    |
| Arhitectură         | `test/architecture/*.fitness.test.ts` (rulate de `npm test`) | granițe de module, globale de modul, fără built-in-uri Node în `src/`, antete SPDX |
| Refs ale oracolului | `test/golden/oracle-refs.test.ts`                            | refs comise consecvente cu manifestul și `ELK_COMMIT`                              |

Schimbările la `tools/oracle/`, manifest sau seria de patch-uri necesită în plus:

| Gate                  | Comandă                                                                       | Criteriu                                                                                      |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Compilarea oracolului | `tools/oracle/build.sh`                                                       | ieșire 0                                                                                      |
| Rularea oracolului    | `tools/oracle/run.sh <outDir> <input.json>...`                                | ieșire 0, fără linii `ERROR`                                                                  |
| Stabilitatea goldens  | `tools/oracle/regen-goldens.sh`, apoi `git diff --exit-code test/golden/refs` | fără diferențe, cu excepția cazului în care schimbarea mută intenționat refs și e jurnalizată |
| Shell                 | `shellcheck tools/oracle/*.sh`                                                | curat                                                                                         |

Schimbările la `tools/oracle/` sau `tools/corpus/` necesită în plus:

| Gate                 | Comandă                                                                              | Criteriu                                                       |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Recensământ          | `npx tsx tools/corpus/census.ts`                                                     | ieșire 0 (fără derivă)                                         |
| Stabilitate generată | `tools/oracle/regen-generated.sh`, apoi `git diff --exit-code test/corpus/generated` | fără diferențe                                                 |
| Sweep                | `tools/oracle/sweep.sh` (sau `--filter`/`--limit` pentru un eșantion)                | ieșire 0: fără `oracle-error`                                  |
| Raport de paritate   | `npx tsx tools/corpus/parity-report.ts`                                              | ieșire 0 (raportul comis este actual); regenerați cu `--write` |
