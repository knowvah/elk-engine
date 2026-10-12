---
title: Conformità
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformità: cosa significa «corrispondenza»

@knowvah/elk-engine viene validato rispetto a Eclipse ELK (Java) upstream compilato dai
sorgenti. Un layout TypeScript è **conforme** all'oracolo quando, dopo aver fatto il parsing di entrambi
come ELK JSON, la struttura e ogni valore non numerico sono esattamente uguali e ogni numero finito
coincide entro una tolleranza assoluta di `1e-6`.
Il comparatore è [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
questo documento descrive ciò che implementa. Le regole del porting sono in
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Sezione                                                      | Risponde a                                                |
| --- | ------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | [Oracolo](#1-oracolo)                                        | Cos'è «corretto», e a quale commit?                       |
| 1a  | [Unità di conformità](#1a-unità-di-conformità)               | Cos'è un caso, e quali casi esistono?                     |
| 2   | [Criterio di conformità](#2-criterio-di-conformità)          | Cosa conta come uguale?                                   |
| 3   | [Golden e corpus](#3-golden-e-corpus)                        | Da dove vengono gli output di riferimento?                |
| 4   | [Patch di seam](#4-patch-di-seam)                            | Come modifichiamo l'oracolo?                              |
| 5   | [Operazioni sull'oracolo](#5-operazioni-sulloracolo-runbook) | Cosa faccio quando si rompe?                              |
| 6   | [Gate](#6-gate)                                              | Cosa deve passare prima che una modifica venga integrata? |

## 1. Oracolo

L'oracolo (AD-3) è ELK upstream **compilato dai sorgenti** in un worktree git
scollegato di `$ELK_SOURCE_DIR`, creato in `$ELK_ORACLE_DIR` da
`tools/oracle/build.sh`. Entrambi stanno fuori da questo repository; nessuno dei due è incluso.

| Elemento           | Dove                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Commit ELK fissato | `tools/oracle/ELK_COMMIT` (attualmente `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)       |
| Serie di patch     | `tools/oracle/patches/*.patch`, applicate in ordine lessicale con `git am --3way`        |
| Build              | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho scarica gli artefatti p2)           |
| Runner batch       | `tools/oracle/run.sh <outDir> <input>...` oppure `run.sh --cases <cases.jsonl> <outDir>` |
| Harness            | `tools/oracle/harness/ElkOracle.java`                                                    |
| Manifest di build  | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patch, JDK, jar per bundle)                 |

**Build.** `build.sh` esegue `mvn -P elk-meta clean install -DskipTests` (il compilatore
melk) e poi `mvn clean install -DskipTests -Dmaven.test.skip=true` da
`build/` nel worktree, quindi registra in `oracle-build.json` il jar di ogni bundle nel perimetro
(`core`, `graph`, `graph.json`, `alg.common` e gli algoritmi `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex`). Un worktree esistente viene riutilizzato
solo se discende da `ELK_COMMIT`, contiene esattamente gli oggetti delle patch in
`tools/oracle/patches/` ed è pulito a parte l'output di build; altrimenti
`build.sh` termina con `2` e lo lascia intatto.

**Run.** `run.sh` compila `ElkOracle.java` rispetto ai jar dei bundle più i bundle
di terze parti (Gson, Guava, EMF, librerie Xtext/Xtend) dalla cache p2 di Tycho
(`P2_BUNDLES`, predefinito `~/.m2/repository/p2/osgi/bundle`; si usa la versione
più recente di ciascuno). Una sola JVM esegue il layout di ogni input con
`RecursiveGraphLayoutEngine` e scrive `<outDir>/<input basename>.json`
con layout, dimensioni zero e posizioni zero inclusi e con le opzioni di layout sconosciute
omesse. Un input che fallisce stampa `ERROR <input>: <message>`; la
JVM termina con `1` se un qualsiasi input è fallito. I basename degli input devono essere univoci all'interno di una
singola esecuzione, perché il nome dell'output è il basename.

**Semantica della serie di patch.** Oggi la serie contiene una sola patch:

| Patch                                                                   | Effetto                                                                                                                                                                                                                                                       | Seam TS associato                                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` risolve le collisioni di id con `"_g" + Random.nextInt(1000000)`; la patch inizializza quel `Random` dalla proprietà di sistema `org.eclipse.elk.graph.json.exportSeed` (non impostata = comportamento di ELK). `run.sh` passa `EXPORT_SEED=1` | `Random` iniettabile nel porting di `graph.json`; in attesa di quel porting (lo shim TS `Random` riproduce già la sequenza: il seed 1 dà 548985, 764588) |

Le patch esistono solo per aggiungere seam strettamente circoscritti che rendono confrontabile il comportamento di JVM e JS;
ciascuna è abbinata a un seam lato TS (sezione 4).

**Perché non elkjs?** elkjs è ELK compilato con GWT. Non può portare la nostra serie
di patch, e l'emulazione GWT della JRE differisce dalla JVM da cui facciamo il porting.
Non viene consultato come oracolo.

## 1a. Unità di conformità

Un **caso** è `(algorithm, model, variant)` (D1). La dashboard di parità ha una riga per
algoritmo di layout; la cartella di elk-models e le caratteristiche del censimento sono filtri, non righe.

**Id del caso.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, per esempio
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` è l'id dell'algoritmo
senza `org.eclipse.elk.`. Per i modelli generati `modelId` è `generated/<name>`.

**Id e sorgente del modello (D3).** L'id del modello è il percorso in elk-models senza estensione.
Un caso legge il `.json` se esiste, altrimenti il `.elkt`; `.elkg` (EMF XMI) non viene mai letto.

**Varianti (D6).** Sovrapposizioni di opzioni con nome in `test/corpus/variants.json`, applicate alla radice:
`default` (nessuna), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmo                                                 | Modelli                        | Varianti              |
| ------------ | --------------------------------------------------------- | ------------------------------ | --------------------- |
| native       | il `rootAlgorithm` proprio del modello                    | ogni modello del censimento    | tutte e sette         |
| retarget     | ogni algoritmo elencato tranne quello proprio del modello | ogni modello del censimento    | solo `default` (OR-1) |
| generated    | l'algoritmo indicato dal prefisso del file                | `test/corpus/generated/*.json` | tutte e sette         |
| ported JUnit | per missione di algoritmo                                 | casi JUnit upstream (AD-13)    | come portate          |

`tools/oracle/run.sh --list-algorithms` è l'elenco degli id degli algoritmi (14 oggi).

**Retarget (D2).** L'harness imposta `org.eclipse.elk.algorithm` su **ogni nodo che ha
figli**, sostituendo qualsiasi valore dichiarato, e `org.eclipse.elk.randomSeed = 1` sulla radice. ELK
risolve l'algoritmo per nodo, e un nodo non impostato ricade su layered. Una radice senza
figli riceve solo il seed. Il tier retarget salta il `rootAlgorithm` proprio di ciascun modello (il
tier native lo copre).

## 2. Criterio di conformità

AD-4, esattamente come lo implementa `compareLayout(expected, actual, { tol })`:

| Regola                     | Comportamento                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolleranza                 | Assoluta, `DEFAULT_TOLERANCE = 1e-6`; i numeri finiti passano quando `abs(e - a) <= tol`                                                                                                           |
| Numeri non finiti          | `NaN` e `±Infinity` devono essere esattamente uguali (`Object.is` o `===`), anche con `tol: Infinity`                                                                                              |
| Stringhe, booleani, `null` | Strettamente uguali, altrimenti `value`                                                                                                                                                            |
| Tipo diverso               | Tipi JSON diversi (`null`, array, oggetto, numero, stringa, booleano) producono un solo diff `type`                                                                                                |
| Chiavi degli oggetti       | L'insieme delle chiavi deve essere identico: una chiave solo in expected è `missing`, solo in actual è `extra`                                                                                     |
| Array                      | Abbinati **per `id`** quando ogni elemento su entrambi i lati è un oggetto con un `id` stringa e gli id sono univoci per lato (un array vuoto conta come con chiave); altrimenti **per posizione** |
| Array con chiave           | Un id presente su un solo lato è un diff `structure` a `path[id=<id>]`; l'ordine è ignorato                                                                                                        |
| Array posizionali          | Una differenza di lunghezza è un solo diff `structure` e gli elementi non vengono confrontati oltre                                                                                                |
| Tipi di diff               | `structure`, `value`, `type`, `missing`, `extra`; `path` è simile a un percorso JSON (`children[id=n1].x`)                                                                                         |

Conseguenze: gli id degli elementi, il numero di elementi, la topologia delle sezioni degli archi e il
numero di punti di piegatura sono esatti perché gli id e le lunghezze degli array sono esatti;
coordinate e dimensioni ottengono `1e-6`. `formatDiffs` stampa al massimo 20 diff.

**Politica sulle divergenze note.** Una divergenza non viene mai assorbita alzando `tol`
o modificando un golden (AD-13). Ognuna è registrata qui con la sua causa e il
test o la fixture che riguarda. Classi accettate:

- **Differenze a livello di ulp in `Math.*`.** V8 e la JVM possono differire nell'ultimo bit
  di `sin`, `cos`, `exp`, `log`, `pow` e simili; `StrictMath` di Java è
  specificato come esatto al bit, `Math` no. Il caso già incontrato: `nextGaussian`
  è specificato per usare `StrictMath.log`, perciò `src/java/util/Random.ts` contiene
  un'implementazione esatta di `StrictMath.log` invece di `Math.log`. Preferisci un porting esatto al bit
  dell'algoritmo di `StrictMath` all'allargamento della tolleranza.
- **Iterazione sugli hash di identità (AD-10).** Iterare su una `HashMap`/`HashSet` con chiavi
  oggetto con hash di identità non è deterministico nemmeno in Java. Registra nel journal il punto
  e fai il porting con l'ordine di inserimento; i golden non devono dipenderne.
  Le chiavi con hash sul valore (String, Integer) devono riprodurre l'ordine di Java.
- **`Random` inizializzato dal tempo.** Con `randomSeed = 0` ELK inizializza dall'orologio
  (`core/Core.melk:608`), quindi l'output non è riproducibile. Gli input dei golden devono
  lasciare il seed non impostato o diverso da zero (il seed predefinito di layered è `1`).

Voci concrete (aggiungine una solo con l'approvazione dell'utente):

| #   | Divergenza                               | Causa                                                                             | Ambito                                                                                                                                                                               | Approvata              |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 1   | Testo del messaggio di errore di parsing | I messaggi di ANTLR sono artefatti del parser generato, che non viene mai portato | Input di grammatica non valido (`.elkt`, `.elkj`, `.elkr`): deve coincidere solo la _presenza_ di un errore di parsing, non il messaggio. L'input valido deve coincidere esattamente | D8, utente, 2026-10-11 |

**Verdetti.** Ogni caso riceve un verdetto da due esecuzioni JVM separate dell'oracolo (D4, D5, OR-2):

| Verdetto           | Significato                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Entrambe le esecuzioni hanno calcolato il layout del modello e i file di output sono identici byte per byte                                                                                     |
| `throws`           | Entrambe le esecuzioni hanno lanciato la stessa eccezione: classe esatta e messaggio esatto dopo che `@[0-9a-f]+` diventa `@<hash>` (il messaggio può essere null, ad es. `StackOverflowError`) |
| `nondeterministic` | Le esecuzioni non concordano (byte di output, eccezione, oppure una `ok` e una `throws`)                                                                                                        |
| `oracle-error`     | Guasto dell'harness (input illeggibile, variante/algoritmo/opzione sconosciuti, riga di risultato persa); mai accettabile                                                                       |
| `timeout`          | Un'esecuzione ha superato `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                                |

Precedenza: `oracle-error`, poi `timeout`, poi `ok`/`throws` quando uguali, altrimenti
`nondeterministic`. Prima del confronto byte per byte, ogni token `@[0-9a-f]+` in entrambi gli output viene
sostituito con `@<hash>`, come nei messaggi delle eccezioni (D5a; `sameOutput` in `tools/corpus/sweep.ts`).
Causa: l'opzione programmatica `debug.discoGraph` di disco esporta `...DCGraph@<identity hash>`,
che nessun seed può fissare. Il comparatore TS applica la stessa sostituzione. I casi non deterministici
sono riportati separatamente ed esclusi dai conteggi dei successi, in linea con la politica sugli hash di identità qui sopra.

Le fonti genuine rimanenti di `nondeterministic` (comportamento di ELK, non guasti dell'harness; i conteggi sono nel
report di parità): spore (`ElkGraphImporter.java:169` introduce jitter con `Math.random`) e `random`
(il `randomSeed` predefinito 0 non ha seed sui compositi annidati; il retarget inizializza solo la radice, D2,
mantenuto per decisione dell'utente). Le rinomine di id `_g<random>` dell'esportatore non sono una fonte: la patch
di seam le risolve.

## 3. Golden e corpus

AD-5. Gli output di riferimento sono committati, così la CI non ha bisogno di una JVM.

| Elemento              | Dove                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Corpus fissato        | `eclipse-elk/elk-models` al `commit` in `test/corpus/manifest.json` (non incluso)               |
| Directory dei modelli | `$ELK_MODELS_DIR`, predefinita `../../eclipse-elk/elk-models` relativa a questo repository      |
| Insieme curato        | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Ref                   | `test/golden/refs/elk/<id>.json`, uno per `id` del manifest                                     |
| Provenienza           | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Mappatura da id a percorso.** `golden[].path` è relativo a `$ELK_MODELS_DIR`, e
l'input è `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` esegue l'harness su
quegli input e prepara ogni output `<basename>.json` come `refs/elk/<id>.json`.
Esempio: l'id `ptolemy-scrambler` è
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Rigenerazione** (`tools/oracle/regen-goldens.sh`):

1. Richiede che il clone dei modelli sia esattamente al commit del manifest (altrimenti exit `1`).
2. Richiede un oracolo compilato (`run.sh` ha bisogno di `oracle-build.json`).
3. Prepara tutti i ref e `_meta.json` in `test/golden/refs/.elk-staging.*`, poi
   scambia la directory con due rinomine, così un'esecuzione fallita lascia i vecchi ref.
4. `_meta.json` non ha timestamp (`builtAt` resta in `oracle-build.json`), quindi una
   rigenerazione senza input modificati è un no-op byte per byte in git.

**Quando rigenerare:** dopo aver modificato `ELK_COMMIT`, la serie di patch, l'insieme
`golden[]` o il `commit` del manifest, oppure l'harness. Mai in altri casi.

**Regola di journaling.** Ogni rigenerazione che modifica un ref viene registrata nel journal con la
causa (l'id della patch, o l'aggiornamento del commit). I ref non si modificano mai a mano. Se un'asserzione
TS o un golden può passare solo se modificato, fermati e registra nel journal (AD-13).

**Censimento.** `npx tsx tools/corpus/census.ts` non calcola alcun layout: esegue l'oracolo in modalità parse
su ogni modello e confronta il risultato con il `test/corpus/census.json` committato (898
modelli: id, formati, sorgente, algoritmo radice, conteggi delle caratteristiche). Exit `0` se uguali, `1` in caso di drift;
`--write` riscrive il file. Gira solo nel clone dei modelli fissato e si interrompe a un
guasto dell'harness.

**Corpus generato (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` contiene una
configurazione grandom con seed; il `.json` accanto è l'input generato dall'oracolo, senza layout. Nove configurazioni coprono
gli id degli algoritmi che nessun modello di elk-models usa: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Ognuna ha al massimo 50 nodi e
nessuna etichetta degli archi (`BlindTextGenerator` non ha seed). L'harness chiama `root` la radice generata,
perché il `JsonExporter` di ELK risolve una collisione di id con un suffisso casuale senza seed. Rigenera
solo con `tools/oracle/regen-generated.sh` (directory di staging e rinomina; una configurazione che fallisce
lascia i vecchi file); una riesecuzione senza modifiche è un no-op in git. Il porting TS di grandom deve
riprodurre questi file `.json` byte per byte; i golden degli algoritmi non ne dipendono mai.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` pianifica ogni caso, esegue ciascuno due volte in JVM separate (gli shard
sono per default `min(cpus, 8)` processi `run.sh` concorrenti) e scrive
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` stampa il numero di casi per tier e non esegue nulla; `--filter` mantiene gli id dei casi che contengono
la sottostringa; `--limit` prende un campione a passo uniforme. Exit `0` a meno che un caso sia `oracle-error`
(`1`); un guasto dello strumento termina con `2`. Gli output per caso restano locali (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(predefinito `30000`, letto solo da `tools/`) limita ogni caso; `run.sh` riavvia una JVM dopo un
timeout (exit code JVM 75) sui casi senza riga di risultato.

**Report di parità (D9).** `docs/parity-report.md` è generato dalla cache dello sweep e committato:
conteggi per algoritmo e verdetto, con i commit di ELK e dei modelli e senza timestamp. Rigenera
con `npx tsx tools/corpus/parity-report.ts --write`; senza `--write` il comando termina con `1`
quando il report committato è obsoleto. Non modificarlo mai a mano.

**Test del corpus.** `resolveModelsDir()` in `test/corpus/corpus.ts` restituisce un
motivo di `skip` quando il clone manca o è a un altro commit; i test che ne hanno bisogno
vengono saltati con lo sha fissato nel messaggio. Oggi `test/golden/oracle-refs.test.ts`
controlla solo i ref committati: uno per id del manifest, geometria su ogni nodo,
porta, etichetta e arco, auto-confronto, e che `_meta.json` corrisponda a
`ELK_COMMIT`, al manifest e al generatore. Non esiste ancora un test di layout
TS-contro-oracolo; arriverà con il primo algoritmo portato.

## 4. Patch di seam

Le patch di seam modificano l'oracolo; sono rare e sempre abbinate a un seam TS.

1. Modifica e committa nel worktree dell'oracolo (`$ELK_ORACLE_DIR`), oppure scrivi la patch in un clone
   di prova a `ELK_COMMIT`. Per aggiungere una patch finita al worktree esistente sul posto (mantiene le
   cache `census/` e `sweep/`, che la rimozione del worktree cancella), applicala con
   l'identità di `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` poi verifica la serie e ricompila sul posto (circa 3 minuti), quindi i passi 4-5
   si possono saltare.
2. Esporta:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (oppure solo i nuovi commit). I file si chiamano `NNNN-<slug>.patch`; il prefisso
   numerico fissa l'ordine di applicazione.
3. Aggiungi il seam TS corrispondente (stesso comportamento, iniettabile, in `src/`), con test
   i cui valori attesi provengono dall'oracolo con la patch (AD-13).
4. Altrimenti rimuovi il worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (aggiungi `--force` se l'output di build lo rende sporco).
5. Ricompila: `tools/oracle/build.sh` (riapplica la serie da zero).
6. Rigenera: `tools/oracle/regen-goldens.sh`; controlla `git diff test/golden/refs`.
7. Registra nel journal una voce che nomina la patch (`NNNN-<slug>.patch`) ed elenca ogni
   ref modificato. `patches` in `_meta.json` registra la serie automaticamente.

Non lasciare mai una modifica non committata nel worktree: `build.sh` la tratta come obsoleta
(exit `2`). Non modificare mai `ELK_SOURCE_DIR` stesso.

## 5. Operazioni sull'oracolo (runbook)

| Guasto                                                                                    | Rilevamento                                                                                                                                                                                                                                                                                  | Mitigazione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La build di Tycho fallisce (p2 irraggiungibile, JDK, versione di Maven)                   | `tools/oracle/build.sh` termina con codice diverso da zero; l'output completo di Maven è in `.oracle-build.log` nella radice del repo. Exit `1` è uno strumento mancante o un Maven sbagliato; exit `3` significa che un jar di bundle non è stato prodotto                                  | Maven deve essere **3.9.x**: Tycho 4.0.12 fallisce con Maven 3.10 (il 3.10.0 di Homebrew) con `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Un 3.9.11 locale si trova in `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Usa JDK 21, oppure JDK 17 tramite `JAVA_HOME`. Controlla la rete (la prima esecuzione scarica gli artefatti p2), poi riesegui. `build.sh --record-only` salta Maven e riscrive solo `oracle-build.json` dai jar già compilati. Exit `2`: rimuovi il worktree (sezione 4 passo 4) e ricompila. Altrimenti escala con la coda del log |
| `build.sh` termina con `2` subito dopo l'applicazione di una patch                        | Worktree segnalato come obsoleto                                                                                                                                                                                                                                                             | `build.sh` riunisce gli oggetti delle patch spezzati su più righe (`git format-patch` li spezza oltre circa 78 caratteri) e ignora le cache non tracciate `census/` e `sweep/`; altra sporcizia o una patch non elencata danno comunque exit `2`: correggi il worktree (sezione 4)                                                                                                                                                                                                                                                                                                                                                                                    |
| Drift dei golden dopo una patch o un aggiornamento del commit                             | `tools/oracle/regen-goldens.sh` seguito da `git diff --exit-code test/golden/refs` non è vuoto; `test/golden/oracle-refs.test.ts` fallisce per un `_meta.json` obsoleto (`elkCommit`, `modelsCommit`); un test di conformità TS, una volta presente, fallisce con un report di `formatDiffs` | Ricompila (`build.sh`), esegui `regen-goldens.sh`, controlla il diff, registra nel journal l'id della patch. Non modificare mai un ref a mano né allentare `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Jar Xtext/ANTLR mancante dalla cache p2 (`.elkt`, `.elkr`, o qualsiasi avvio di `run.sh`) | `run.sh` termina con codice diverso da zero con `bundle <name> not in p2 cache <dir>` (ad es. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                           | Imposta `P2_BUNDLES` sulla cache p2 di Tycho che lo contiene, oppure esegui `build.sh` con accesso alla rete così che Tycho lo scarichi; riesegui `run.sh`. Non sostituire con jar presi da altrove                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sweep bloccato o OOM                                                                      | Un caso gira fino al timeout e riporta `timeout` (una riga su stderr lo nomina); un'esecuzione senza riga di risultato dà `oracle-error` e `sweep: shard <n> run <A or B> exited <code>` su stderr; la macchina va in swap con 8 JVM concorrenti                                             | Riduci la concorrenza e la dimensione dei batch: `sweep.sh --shards 2`, restringi con `--filter` o `--limit`. Alza `ELK_SWEEP_TIMEOUT_MS` solo per un modello lento ma corretto. Un `timeout` riproducibile è un riscontro: registra nel journal l'id del caso, non allargare il limite per nasconderlo                                                                                                                                                                                                                                                                                                                                                               |
| Drift del censimento dopo un aggiornamento dei pin (`ELK_COMMIT` o `commit` dei modelli)  | `npx tsx tools/corpus/census.ts` termina con `1` ed elenca i modelli che differiscono; `test/corpus/census.test.ts` fallisce                                                                                                                                                                 | Conferma che clone e oracolo siano ai nuovi pin, riesegui `census.ts --write`, controlla `git diff test/corpus/census.json`, registra la causa nel journal, poi riesegui `sweep.sh` e rigenera il report di parità. Non modificare mai il censimento a mano                                                                                                                                                                                                                                                                                                                                                                                                           |
| elk-models mancante o sha sbagliato                                                       | I test del corpus vengono saltati con un messaggio che nomina lo sha atteso; `regen-goldens.sh` termina con `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                               | Esegui `test/corpus/fetch.sh` (clona e fa il checkout del commit fissato). Termina con `2` se un clone esistente è a un altro commit e non lo tocca: correggi tu quel clone oppure punta `ELK_MODELS_DIR` a un percorso nuovo. Non spostare mai l'HEAD di un clone esistente da uno script                                                                                                                                                                                                                                                                                                                                                                            |

Altri errori di `run.sh`: `oracle-build.json missing` o `oracle jar missing`
significa che devi eseguire prima `build.sh`; `bundle <name> not in p2 cache` significa che devi impostare
`P2_BUNDLES` sulla cache p2 di Tycho o rieseguire `build.sh` con accesso alla rete.

## 6. Gate

Ogni modifica:

| Gate             | Comando                                                        | Soglia                                                                                |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Tipi             | `npm run typecheck`                                            | exit 0                                                                                |
| Test e coverage  | `npm run coverage`                                             | tutti i test passano; 90% di statement, branch, funzioni e righe su `src/**`          |
| Architettura     | `test/architecture/*.fitness.test.ts` (eseguiti da `npm test`) | confini dei moduli, globali di modulo, nessun built-in di Node in `src/`, header SPDX |
| Ref dell'oracolo | `test/golden/oracle-refs.test.ts`                              | ref committati coerenti con il manifest e `ELK_COMMIT`                                |

Le modifiche a `tools/oracle/`, al manifest o alla serie di patch richiedono anche:

| Gate                    | Comando                                                                      | Soglia                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Build dell'oracolo      | `tools/oracle/build.sh`                                                      | exit 0                                                                                     |
| Esecuzione dell'oracolo | `tools/oracle/run.sh <outDir> <input.json>...`                               | exit 0, nessuna riga `ERROR`                                                               |
| Stabilità dei golden    | `tools/oracle/regen-goldens.sh`, poi `git diff --exit-code test/golden/refs` | nessun diff, a meno che la modifica non debba spostare i ref ed sia registrata nel journal |
| Shell                   | `shellcheck tools/oracle/*.sh`                                               | pulito                                                                                     |

Le modifiche a `tools/oracle/` o `tools/corpus/` richiedono anche:

| Gate                   | Comando                                                                             | Soglia                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Censimento             | `npx tsx tools/corpus/census.ts`                                                    | exit 0 (nessun drift)                                         |
| Stabilità del generato | `tools/oracle/regen-generated.sh`, poi `git diff --exit-code test/corpus/generated` | nessun diff                                                   |
| Sweep                  | `tools/oracle/sweep.sh` (oppure `--filter`/`--limit` per un campione)               | exit 0: nessun `oracle-error`                                 |
| Report di parità       | `npx tsx tools/corpus/parity-report.ts`                                             | exit 0 (report committato aggiornato); rigenera con `--write` |
