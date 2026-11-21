<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK upgrade runbook

How to move the ELK pin (AD-2, `tools/oracle/ELK_COMMIT`) to a newer upstream commit, and how to rehearse the move
without changing a committed file. The steps are commands, in order; there is no driver script, because triage and
rulings happen between them. `test/docs/elk-upgrade-runbook.test.ts` fails when a recorder, regen or sweep script under
`tools/` is not named here, or when this page names a `tools/` path that does not exist.

Decisions: `plans/elk-upgrade-runbook/decisions.md` (UP1-UP9). Related runbooks: the oracle build
([`tools/oracle/README.md`](../../tools/oracle/README.md)), the corpus sweep and parity report
([parity-dashboard.md § 7](parity-dashboard.md#parity-dashboard-runbook)), label sizing
([text-sizing-seam.md § 4](text-sizing-seam.md#text-sizing-runbook)), metadata
([melk-codegen.md § 6](melk-codegen.md#regenerating)) and the oracle failure table
([conformance.md § 5](../conformance.md)).

**Last move.** 2026-11-18, pin `e7eaea57` → `8bca22f4` (upstream `master`, issue #104): 6 changed in-scope files (4 Java,
2 `.melk`) from six upstream PRs, and five upstream JUnit classes, ported. Five refs changed content, each traced to a PR:
`metadata` and `layered-framework` (#1234, #1242), `layered-compound` (a stack frame line, #1241), `spore-layout` (#1242, #1244)
and `rectpacking` (#1237, #1239); every other re-recorded file is stamp-only, and no golden output changed. Two recorders
followed the Java (section 11). The sweeps equal the old oracle's apart from the spore cases, which are all deterministic now
(sporeCompaction 906 `ok`; sporeOverlap 879 `ok`, 27 `throws`; the port agrees on all 1,812), two layered cases that throw the
new `UnsupportedConfigurationException` (#1241) and five stack frame lines of the `compound` sweep; the 92 ported JUnit classes
of the old run are identical (100 classes, 51,299 runs, 0 failures with the classes added since). One hand-written unit test
that eclipse-elk/elk#1244 contradicts was replaced under the ruling of #105. Journal:
`plans/elk-pin-move-8bca22f4/decision-journal.md`.
The move before it (2026-11-16, `8aaa3c14` → `e7eaea57`, issue #99) ported 13 Java files and changed five refs; its journal is
the `#99` rows of `plans/elk-upgrade-runbook/decision-journal.md`.

## 1. When and who {#elk-upgrade-who}

- **A real move** changes `tools/oracle/ELK_COMMIT`, regenerates every stamped ref (section 11 lists them) and may port
  Java changes into `src/`. Regenerating a ref is an AD-13 action, so a real move is the maintainer's decision: it
  starts from a `needs-ruling` issue that carries a rehearsal's evidence. Fetching upstream into `$ELK_SOURCE_DIR` and
  rebasing or dropping an oracle patch (AD-3) are the maintainer's steps too.
- **A rehearsal** ([section 14](#elk-upgrade-rehearsal)) runs sections 3 to 12 in a scratch clone with a scratch oracle
  and a scratch Maven repository. It writes nothing outside `$TMPDIR` except one worktree registration in
  `$ELK_SOURCE_DIR`, which it removes. Anyone can run one.

Both modes use the same commands. Where a step differs, the rehearsal variant is in section 14.

## 2. Preconditions {#elk-upgrade-preconditions}

| Check              | Command                                                | Bar                                                                                                                |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Load               | `uptime`                                               | 1-minute load at most 12 before any JVM run; run JVM jobs under `nice -n 10`, at most two at a time                |
| Reference platform | `uname -sm`; `java -version`                           | `Darwin arm64` and JDK `21.0.1` (issue #52). Refs are never re-recorded on another OS, CPU or JDK                  |
| Maven              | `"$ELK_MVN" -v`                                        | the series `MAVEN_SERIES` of `tools/oracle/build.sh` (3.9.x); a local copy lives in `.tools/apache-maven-3.9.11/`  |
| ELK source         | `git -C "$ELK_SOURCE_DIR" cat-file -e "$NEW^{commit}"` | the target commit is present (the maintainer fetches; scripts never do)                                            |
| Models             | `git -C "$ELK_MODELS_DIR" rev-parse HEAD`              | equals `commit` in `test/corpus/manifest.json`                                                                     |
| Oracle stamp       | `cat "$ELK_ORACLE_DIR/oracle-build.json"`              | names the current pin and every file of `tools/oracle/patches/` before the move (the "before" side of a diagnosis) |
| Disk               | `df -h "$TMPDIR"`; `du -sh ~/.m2/repository`           | an oracle worktree is about 2 GB, the Maven repository about 0.8 GB, the vector cache grows to several GB          |
| Clean tree         | `git status --short`                                   | empty: every later `git diff` is the move's diff                                                                   |

Set the variables every later command uses (run from the repository root):

```sh
export ELK_SOURCE_DIR="${ELK_SOURCE_DIR:-$PWD/../elk}"
export ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$PWD/../elk-oracle}"
export ELK_MODELS_DIR="${ELK_MODELS_DIR:-$PWD/../../eclipse-elk/elk-models}"
export ELK_MVN="$PWD/.tools/apache-maven-3.9.11/bin/mvn"
OLD="$(tr -d '[:space:]' <tools/oracle/ELK_COMMIT)"
NEW="$(git -C "$ELK_SOURCE_DIR" rev-parse origin/master)"   # or any full 40-character sha past $OLD
MODELS="$(git -C "$ELK_MODELS_DIR" rev-parse HEAD)"
REFS=test/golden/refs/java
B="${TMPDIR%/}/elk-upgrade-before"                          # the "before" side, section 5 step 1
```

A long command runs detached, with its exit code as the last line of its log, and is polled:

```sh
nohup nice -n 10 bash -c 'tools/oracle/elkj-sweep.sh --jobs 6; echo "exit $?"' >"$TMPDIR/elkj-sweep.log" 2>&1 &
```

A watcher for a long JVM job tests the JVM's accumulated CPU time (`ps -o time= -p <pid>`), not its output: one row of
`elkj-vectors.sh` runs for hours without printing.

## 3. Choose the target and triage the net diff {#elk-upgrade-triage-java}

```sh
git -C "$ELK_SOURCE_DIR" log --oneline "$OLD..$NEW"
git -C "$ELK_SOURCE_DIR" diff --stat "$OLD" "$NEW" -- plugins/ test/ build/
git -C "$ELK_SOURCE_DIR" diff --stat "$OLD" "$NEW" -- . ':!plugins' ':!test' ':!build'
```

Triage the **net** diff, not the commit list: a change and its revert cancel. Give every changed path one class:

| Class           | Paths                                                                                           | What it means for the move                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| in-scope bundle | `plugins/org.eclipse.elk.<bundle>/` for a bundle of CLAUDE.md's "In scope" list                 | a Java diff to port (section 11), unless it is prose only. `.melk` files: section 6. `META-INF/MANIFEST.MF`: rerun `npx tsx tools/bundle-deps.ts --write` and read the diff               |
| deferred bundle | `alg.libavoid`, `alg.graphviz.dot`, `alg.graphviz.layouter`, the three `.ide` bundles           | a revisit trigger of [deferred-bundles-adr.md](deferred-bundles-adr.md) when the change touches one of the three algorithm bundles or gives one an in-scope caller or test                |
| out of scope    | `core.service`, `core.ui`, `core.meta*`, `conn.gmf`, the `.ui` bundles, CI, docs, release notes | nothing to port; note it                                                                                                                                                                  |
| build           | `build/`, `pom.xml`, the target platform                                                        | a Tycho or Maven change: compare with `MAVEN_SERIES` and the comment above it in `tools/oracle/build.sh`. A target-platform change can move Guava, Gson, EMF or Xtext (section 7.3)       |
| test bundle     | `test/org.eclipse.elk.*`                                                                        | a ported JUnit class changed: update its TS port from the Java (expected values come from the Java, AD-13), and rerun it on the oracle (section 10)                                       |
| prose           | a description, label or message string nothing branches on                                      | the carve-out of CLAUDE.md: when upstream fixes a typo the port already corrects, the "upstream typos" entry of `docs/conformance.md` and the comment at the port site close (section 13) |

List the changed `.java` files per in-scope bundle; this list drives section 11:

```sh
git -C "$ELK_SOURCE_DIR" diff --name-status "$OLD" "$NEW" -- plugins/ test/ | sort -k2
```

## 4. Patch series {#elk-upgrade-patches}

The oracle is the pinned commit plus `tools/oracle/patches/*.patch`, applied by `tools/oracle/build.sh` with
`git am --3way` in lexical order. Before building, find out whether the series still applies and whether upstream merged
a patch:

```sh
git -C "$ELK_SOURCE_DIR" log --oneline "$OLD..$NEW" -- $(sed -n 's|^+++ b/||p' tools/oracle/patches/*.patch | sort -u)
for p in tools/oracle/patches/*.patch; do
  git -C "$ELK_SOURCE_DIR" apply --check "$PWD/$p" && echo "applies: $(basename "$p")"
done
```

The first command lists the upstream commits of `$OLD..$NEW` that touch a file a patch touches; no output means no patch
can conflict or have been merged. The loop is a dry run against the working tree of `$ELK_SOURCE_DIR` and writes
nothing; it answers for that checkout's `HEAD`, so when `HEAD` is not `$NEW`, let `build.sh` answer instead (section 5
stops at the first patch that fails and leaves the new worktree in place).

- **Applies cleanly**: nothing to do.
- **Merged upstream** (the patch's change is in `$OLD..$NEW`): the patch is dropped. `git am --3way` reports it as
  already applied or as an empty patch.
- **Conflicts**: the patch is rebased in the oracle worktree and re-exported with `git format-patch`
  ([`tools/oracle/README.md`](../../tools/oracle/README.md) "Add a seam patch").

Dropping, rebasing or renumbering a patch is the maintainer's decision (AD-3). Journal the patch id and the reason; the
`patches` array of every `_meta.json` and the vector cache salt change with the series.

## 5. Bump and rebuild {#elk-upgrade-bump}

1. **Save the "before" side.** Sections 9 and 10 compare the new oracle's sweep results and JUnit counts with the old
   oracle's, and step 4 deletes the old oracle with its sweep outputs. Copy them first (run this in the repository that
   holds the old pin; in a rehearsal that is the checkout the clone was made from):

   ```sh
   mkdir -p "$B"
   cp "$ELK_ORACLE_DIR/sweep/$OLD-$MODELS/results.jsonl" "$B/corpus.jsonl"
   cp "$ELK_ORACLE_DIR/sweep/elkt-$OLD-$MODELS/results.jsonl" "$B/elkt.jsonl"
   cp "$ELK_ORACLE_DIR/sweep/elkj-$OLD-$MODELS/results.jsonl" "$B/elkj.jsonl"
   cp "$ELK_ORACLE_DIR/sweep/label-sizing/label-sizing-corpus.json" "$B/label-sizing-corpus.json"
   for s in json phase order placement routing pipeline labels loops compound; do
     cp "test/corpus/.$s-sweep/results.jsonl" "$B/$s.jsonl"
   done
   ```

   A file that is missing was never produced in this checkout, or was produced by an older oracle build: run its sweep
   of section 9 on the old oracle first (each is skipped when its output is fresh). Then record the JUnit counts of the
   old oracle with the commands of section 10, writing `"$B/java-tests.txt"`.

2. **The pin file.**

   ```sh
   printf '%s\n' "$NEW" >tools/oracle/ELK_COMMIT
   ```

3. **The recorders: nothing to edit.** A recorder that stamps its ref holds no copy of the sha. Its script reads
   `tools/oracle/ELK_COMMIT`, checks that the oracle was built from it, and passes it to the recorder as the system
   property `elk.commit`; the stamp in a vector ref is that property (issue #96). A recorder started without it refuses
   before it records a row. `test/architecture/elk-pin.fitness.test.ts` fails when the pin, or any quoted sha, is
   written into a recorder again. Check that the old pin is left nowhere under `tools/` but the `.melk` stamp, which
   section 6 rewrites:

   ```sh
   git grep -c "$OLD" -- tools
   ```

   It prints `tools/melk/sources/manifest.json:1` only. No recorder source changes with the pin, so the step leaves the
   vector cache alone; the build of step 5 is what turns it cold (last hazard below).

4. **Remove the old oracle worktree** (a real move only; a rehearsal builds a second one, section 14). The vector cache,
   the sweep outputs and the census cache under it go with it:

   ```sh
   git -C "$ELK_SOURCE_DIR" worktree remove --force "$ELK_ORACLE_DIR"
   ```

5. **Build.** About 3 minutes when the Maven repository already holds every plugin (the rehearsal's two Maven runs took
   25 s and under 3 min of work); the log is `.oracle-build.log` at the repository root.

   ```sh
   nice -n 10 tools/oracle/build.sh
   cat "$ELK_ORACLE_DIR/oracle-build.json"
   ```

   Exit codes: `0` ok; `1` a missing tool, a wrong Maven series, or the commit is not in `$ELK_SOURCE_DIR`; `2` an
   existing worktree is stale or dirty; `3` an in-scope bundle jar was not built. `oracle-build.json` must name `$NEW`,
   every file of `tools/oracle/patches/` and JDK `21.0.1`.

Hazards:

- **`build.sh` installs into the Maven local repository** (`mvn install`, twice). The `0.13.0-SNAPSHOT` jars in
  `~/.m2/repository` are then the new commit's. Anything else that resolves them (an ELK fix worktree's test run) sees
  the new jars. A rehearsal redirects the repository (section 14).
- **Stale worktree (issue #85).** `build.sh` exits `2` on an existing worktree that holds an untracked directory other
  than build output and the cache roots `census/`, `sweep/` and `vector-cache/`. A rebuild in place keeps those three
  (the vector cache still runs cold after it, see the last hazard below); run output in any other directory at the
  worktree root has to move under `sweep/` first. A move removes the worktree first (step 4), so it does not meet this.
- **Maven series.** When the net diff bumps Tycho, the build is the test of whether `MAVEN_SERIES` still fits. A failure
  to start is diagnosed from `.oracle-build.log` (conformance.md § 5, first row); `build.sh` is never edited to force a
  build without a stated mechanism. Tycho 4.0.13 starts and builds on Maven 3.9.11.
- **A Tycho bump downloads plugins, and a `503` is slow.** The first build at a new Tycho version fetches the plugins
  the local repository lacks. ELK's `build/pom.xml` lists the plugin repository `dash-licenses-releases` on
  `repo.eclipse.org` before Maven Central; when it answers `503` with `retry-after: 60`, Maven waits about 3 minutes per
  file (181 s measured) before it asks Central. The rehearsal's build took 15 minutes for four such files. A Maven JVM
  that uses no CPU for minutes is waiting there: look for `*.lastUpdated` files newer than the build's start under
  `org/eclipse/tycho/` in the local repository. It is not a failure; let it finish.
- **Every cached recorder is cold after a build.** The cache salt of `tools/vectors/vector-cache.sh` includes
  `oracle-build.json`, whose `commit` and `builtAt` change.

## 6. Metadata (`.melk`) diff {#elk-upgrade-melk}

The `.melk` sources are vendored under `tools/melk/sources/` with a manifest that stamps the commit; the generated
option classes under `src/` come from them.

```sh
git -C "$ELK_SOURCE_DIR" diff --stat "$OLD" "$NEW" -- '*.melk'
tools/melk/sync-sources.sh                       # needs $NEW present in $ELK_SOURCE_DIR, at any HEAD
git diff --stat tools/melk/sources
tools/vectors/metadata-vectors.sh "$REFS"
git diff --stat "$REFS/metadata.json"
npm run melk:generate                            # Core and Labels only (the default bundles)
npm run melk:generate -- Layered SPOrE           # every other bundle whose .melk copy changed, by its file name
git diff --stat src/
npx vitest run test/melk
```

| Result                                                                     | Meaning                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| only `manifest.json` (`elkCommit`) and the stamp of `metadata.json` change | no metadata change; `melk:generate` leaves `src/` untouched                                                                                                                                                                                                                                                                                                                              |
| a `.melk` copy or `metadata.json` rows change                              | an option, default or algorithm changed upstream: the regenerated `src/` files are the port of that change; review them against the Java and journal them (section 11). `npm run melk:generate` without arguments writes only `Core` and `Labels`: name the changed bundles (`npm run melk:generate -- <Bundle>...`, the `.melk` file names), or the freshness tests of `test/melk` fail |
| `sync-sources.sh` dies with `ELK checkout … does not contain …`            | `$NEW` is not in `$ELK_SOURCE_DIR`'s object store. The script reads the blobs by commit id, so `HEAD` may be anywhere, but the commit has to be there: fetch it there (maintainer), or point `ELK_SOURCE_DIR` at a checkout that has it                                                                                                                                                  |
| `test/melk/sources.test.ts` fails on the pinned commit                     | `sync-sources.sh` has not run since the bump                                                                                                                                                                                                                                                                                                                                             |

`test/architecture/bundle-deps.json` stamps the commit as well: `npx tsx tools/bundle-deps.ts --write` rewrites it from
the `Require-Bundle` headers it reads at `tools/oracle/ELK_COMMIT` from `$ELK_SOURCE_DIR`'s object store, whatever is
checked out there, and stamps that commit. A diff beyond `elkCommit` is a changed bundle dependency.

## 7. JVM vectors {#elk-upgrade-vectors}

Every recorder runs cold after the rebuild (section 5). Run them detached under `nice -n 10`, at most two at a time.
Each script takes the output directory as its only argument unless the table says otherwise, checks that the oracle was
built from `tools/oracle/ELK_COMMIT`, and rewrites its refs in place; a recorder with a self-check exits non-zero and
leaves the old ref. After each: `git diff --stat test/golden/refs/java`.

One recorder dominates the cost: `tools/vectors/elkj-vectors.sh` runs for hours (its round-trip program serializes a 712
KB model through Xtext), every other one for seconds to a minute. Start `elkj` first, in its own lane, with the heap and
collector its earlier measurements used, and run the rest beside it one at a time:

```sh
JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xmn3g -Xmx16g" nohup nice -n 10 bash -c \
  'tools/vectors/elkj-vectors.sh test/golden/refs/java; echo "exit $?"' >"$TMPDIR/elkj-vectors.log" 2>&1 &
```

### 7.1 Recorders that run ELK {#elk-upgrade-vectors-elk}

"Cold" is the wall time measured in the last move (`8bca22f4`, issue #104) on the reference platform under `nice -n 10`,
one recorder at a time beside the `elkj` lane, each started once the 1-minute load was below 12.

| Script                                                                                                  | Refs written under `test/golden/refs/java/`                                             | Needs `$ELK_MODELS_DIR` | Cold       |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- | ---------- |
| `tools/vectors/metadata-vectors.sh "$REFS"`                                                             | `metadata.json`                                                                         |                         | 1 s        |
| `tools/vectors/graph-vectors.sh "$REFS"`                                                                | `graph.json`                                                                            |                         | 1 s        |
| `tools/vectors/graph-json-vectors.sh "$REFS"`                                                           | `graph-json.json`                                                                       |                         | 1 s        |
| `tools/vectors/transfer-vectors.sh "$REFS"`                                                             | `graph-json-transfer.json`                                                              |                         | 1 s        |
| `tools/vectors/elkt-vectors.sh "$REFS"`                                                                 | `graph-text-lexer.json`, `-parse`, `-validate`, `-write`                                |                         | 8 s        |
| `tools/vectors/elkj-vectors.sh "$REFS"`                                                                 | `graph-json-text-lexer.json`, `-parse`, `-validate`, `-write`, `-inverse`, `-roundtrip` |                         | 4 h 49 min |
| `tools/vectors/elkr-vectors.sh "$REFS"`                                                                 | `grandom-lexer.json`, `-parse`, `-validate`, `-generate`                                |                         | 5 s        |
| `tools/vectors/comment-vectors.sh "$REFS"`                                                              | `comments.json`                                                                         |                         | 1 s        |
| `tools/vectors/alg-common-vectors.sh "$REFS"`                                                           | `alg-common.json`                                                                       |                         | 2 s        |
| `tools/vectors/node-micro-layout-vectors.sh "$REFS"`                                                    | `node-micro-layout.json`                                                                | yes                     | 3 s        |
| `tools/vectors/nodespacing-site-vectors.sh "$REFS"`                                                     | `nodespacing-sites.json`                                                                |                         | 2 s        |
| `tools/vectors/layered-framework-vectors.sh "$REFS"`                                                    | `layered-framework.json`                                                                |                         | 4 s        |
| `tools/vectors/layered-site-vectors.sh "$REFS"`                                                         | `layered-sites.json`                                                                    |                         | 4 s        |
| `tools/vectors/layered-phase-vectors.sh "$REFS"`                                                        | `layered-phases.json`                                                                   |                         | 6 s        |
| `tools/vectors/layered-order-vectors.sh "$REFS"`                                                        | `layered-order.json`                                                                    |                         | 11 s       |
| `tools/vectors/layered-placement-vectors.sh "$REFS"`                                                    | `layered-placement.json`                                                                |                         | 11 s       |
| `tools/vectors/layered-routing-vectors.sh "$REFS"`                                                      | `layered-routing.json`, `layered-routing-steps.json`                                    |                         | 16 s       |
| `tools/vectors/layered-pipeline-vectors.sh "$REFS"`                                                     | `layered-pipeline.json`                                                                 |                         | 17 s       |
| `tools/vectors/layered-labels-vectors.sh "$REFS"`                                                       | `layered-labels.json`                                                                   |                         | 53 s       |
| `tools/vectors/layered-loops-vectors.sh "$REFS"`                                                        | `layered-loops.json`                                                                    |                         | 22 s       |
| `tools/vectors/layered-compound-vectors.sh "$REFS"`                                                     | `layered-compound.json`                                                                 | yes                     | 11 s       |
| `tools/vectors/mrtree-vectors.sh "$REFS"`                                                               | `mrtree.json`, `mrtree-extra.json`                                                      |                         | 4 s        |
| `tools/vectors/mrtree-unit-vectors.sh "$REFS"`                                                          | `mrtree-units.json`                                                                     |                         | 2 s        |
| `tools/vectors/radial-vectors.sh "$REFS"`                                                               | `radial.json`                                                                           |                         | 3 s        |
| `tools/vectors/vertiflex-vectors.sh "$REFS"`                                                            | `vertiflex.json`                                                                        |                         | 6 s        |
| `tools/vectors/force-vectors.sh "$REFS"`                                                                | `force.json`, `stress.json`                                                             |                         | 48 s       |
| `tools/vectors/disco-vectors.sh "$REFS"`                                                                | `disco.json`                                                                            |                         | 7 s        |
| `tools/vectors/rectpacking-vectors.sh "$REFS"`                                                          | `rectpacking.json`                                                                      | yes                     | 5 s        |
| `tools/vectors/spore-layout-vectors.sh "$REFS"`                                                         | `spore-layout.json`                                                                     |                         | 68 s       |
| `tools/vectors/topdownpacking-vectors.sh "$REFS"`                                                       | `topdownpacking.json`                                                                   |                         | 4 s        |
| `tools/vectors/label-sizing-vectors.sh "$REFS"`                                                         | `label-sizing.json` (fixed measurer, patch 0003; reference platform only)               |                         | 3 s        |
| `tools/vectors/label-sizing-vectors.sh --remeasure-awt "$TMPDIR/awt"`                                   | none: writes `$TMPDIR/awt/awt-remeasure.json` (section 7.2)                             |                         | 2 s        |
| `tools/vectors/label-sizing-vectors.sh --corpus "$ELK_MODELS_DIR" "$ELK_ORACLE_DIR/sweep/label-sizing"` | none: `label-sizing-corpus.json`, a sweep input (section 9)                             | yes                     | 4 s        |

The evidence modes (`radial-vectors.sh --unpinned`, the `*_UNPINNED=1` variables of the packing, tree and force
recorders, the `--sweep` and `--dump` modes of the layered recorders) are diagnosis aids, never a ref.
`ELK_VECTORS_CACHE=off` runs a script cold and touches no cache.

### 7.2 Text measurement: the TX1 re-proof and the AWT remeasure {#elk-upgrade-vectors-text}

Row 10 patched only the test bundle `org.eclipse.elk.alg.test`, on the proof that no plugin measures text (TX1,
[text-sizing-seam.md](text-sizing-seam.md)). A pin move re-proves it at the new commit:

```sh
git -C "$ELK_SOURCE_DIR" grep -lE 'java\.awt\.Font|FontMetrics|FontRenderContext|getStringBounds|stringWidth' "$NEW" -- plugins/ test/
```

At the pin this prints one file,
`test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TestConfiguration.java`
(`computeLabelSize`, the method patch 0003 changes). A hit under `plugins/` of an in-scope bundle means a layout result
can depend on font metrics: stop and file a `needs-ruling` issue.

Then re-measure every snapshot text with AWT on the reference platform and compare it with the committed snapshot:

```sh
tools/vectors/label-sizing-vectors.sh --remeasure-awt "$TMPDIR/awt"
cmp "$TMPDIR/awt/awt-remeasure.json" test/golden/refs/java/layered-label-metrics.json
```

`cmp` is silent when the JDK's font metrics still give the committed sizes.
`tools/vectors/layered-label-metrics-vectors.sh "$REFS"` rewrites `layered-label-metrics.json` from
`tools/vectors/layered-label-metrics-texts.txt`; it is JDK only, so a pin move does not change it, and it is rerun only
to show that (`git diff --exit-code "$REFS/layered-label-metrics.json"`).

### 7.3 Recorders that do not run ELK {#elk-upgrade-vectors-jdk}

These depend on the JDK, or on a third-party bundle whose version ELK's target platform chooses. Rerun them on a pin
move to show the refs do not change; a diff means the JDK or the bundle version moved, not ELK.

| Command                                                  | Refs written under `test/golden/refs/java/`                                                                     | Depends on                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `tools/vectors/java-vectors.sh "$REFS"`                  | `random.json`, `lang.json`, `numeric.json`, `hash.json`, `text.json`, `random-setseed.json`, `collections.json` | JDK 21                             |
| `tools/vectors/core-jdk-vectors.sh "$REFS"`              | `awt.json`, `regex.json`, `character.json`, `regex-boundary.json`, `stream-sum.json`                            | JDK 21                             |
| `tools/vectors/guava-vectors.sh "$REFS"`                 | `guava.json`                                                                                                    | Guava 33.3.0-jre from the p2 cache |
| `tools/vectors/gson-vectors.sh "$REFS"`                  | `gson.json`                                                                                                     | Gson 2.11.0 from the p2 cache      |
| `tools/vectors/layered-label-metrics-vectors.sh "$REFS"` | `layered-label-metrics.json`                                                                                    | JDK 21 AWT, macOS arm64            |

`tools/vectors/core-jdk-vectors.sh` and `tools/vectors/guava-vectors.sh` run the commands the headers of
`CoreJdkVectors.java` and `GuavaVectors.java` name, with no extra JVM flag (the refs were recorded that way; neither
program stamps a commit). The Guava script finds the `com.google.guava` and `com.google.guava.failureaccess` jars in
the p2 cache and refuses unless their `Bundle-Version` is `33.3.0.jre` and `1.0.2`, the versions the ref was recorded
with; the recorder's header names the same Guava version. When the p2 cache holds another one after the build, the
target platform moved it: the script's two version constants follow, and the shims under `src/guava/` are re-proved
against the new version.

## 8. Goldens and other oracle-recorded files {#elk-upgrade-goldens}

All of these need `$ELK_MODELS_DIR` at the manifest commit. Each stages its output and swaps it in, so a failed run
leaves the old refs. After each: `git diff --stat test/golden/refs test/corpus`.

| Command                                           | Writes                                                                           | Stamp                                    | Cold  |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- | ----- |
| `tools/oracle/regen-goldens.sh`                   | `test/golden/refs/elk/` (set `default`)                                          | `_meta.json` `elkCommit`, `patches`      | 2 s   |
| `tools/oracle/regen-goldens.sh --set algorithms`  | `test/golden/refs/elk-algorithms/`                                               | `_meta.json`                             | 2 s   |
| `tools/oracle/regen-goldens.sh --set layered`     | `test/golden/refs/elk-layered/`                                                  | `_meta.json`                             | 1 s   |
| `tools/oracle/regen-goldens.sh --set trees`       | `test/golden/refs/elk-trees/`                                                    | `_meta.json`                             | 2 s   |
| `tools/oracle/regen-goldens.sh --set force-disco` | `test/golden/refs/elk-force-disco/`                                              | `_meta.json`                             | 1 s   |
| `tools/oracle/regen-goldens.sh --set packing`     | `test/golden/refs/elk-packing/`                                                  | `_meta.json`                             | 2 s   |
| `tools/oracle/regen-goldens.sh --set examples`    | `test/golden/refs/elk-examples/`                                                 | `_meta.json`                             | 1 s   |
| `tools/oracle/regen-parse-refs.sh`                | `test/golden/refs/elk-parse/` (run after the `default` set: it reads `refs/elk`) | `_meta.json`                             | 1 s   |
| `tools/oracle/regen-elkt-refs.sh`                 | `test/golden/refs/elkt-parse/`, `test/corpus/elkt-curated/`                      | `_meta.json`                             | 4 s   |
| `tools/oracle/regen-elkj-refs.sh`                 | `test/golden/refs/elkj-parse/`, `test/corpus/elkj-curated/`                      | `_meta.json`                             | 6 min |
| `tools/oracle/regen-generated.sh`                 | `test/corpus/generated/*.json` (grandom output of the `.elkr` configs)           | none: byte-stable unless grandom changed | 2 s   |
| `npx tsx tools/corpus/census.ts --write`          | `test/corpus/census.json`                                                        | `elkCommit`                              | 3 s   |

`npx tsx tools/corpus/census.ts` without `--write` exits `1` after a bump until the census is rewritten; a diff beyond
`elkCommit` is a model the new oracle parses differently.

## 9. Sweeps {#elk-upgrade-sweeps}

Sweep outputs are local (AD-5): nothing here is committed except the parity report. Every sweep is skipped when its
output is fresh for the same oracle build, sources and models commit, so a rebuilt oracle reruns all of them; `--force`
reruns one anyway.

**Corpus sweep, TS sweep and parity report.** Follow
[parity-dashboard.md § 7](parity-dashboard.md#parity-dashboard-runbook) steps 1 to 8: `tools/oracle/sweep.sh` under
`JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"` (about 2.5 minutes, 8 JVM shards: the load passes
12 while it runs), then `npx tsx tools/corpus/ts-layout-compare.ts --out "$TMPDIR/ts-final.json"` (about a minute; exit
`1` means findings, and the pinned oracle has two), then
`npx tsx tools/corpus/parity-report.ts --write --ts-summary "$TMPDIR/ts-final.json"`. Compare the oracle verdicts case
by case with the "before" side:

```sh
node -e '
const fs = require("fs");
const read = (f) => new Map(fs.readFileSync(f, "utf8").trim().split("\n").map((l) => { const r = JSON.parse(l); return [r.caseId, r.verdict]; }));
const before = read(process.argv[1]), after = read(process.argv[2]);
for (const [id, v] of before) if (after.get(id) !== v) console.log(`${id}: ${v} -> ${after.get(id)}`);
console.log(`cases ${before.size} -> ${after.size}`);
' "$B/corpus.jsonl" "$ELK_ORACLE_DIR/sweep/$NEW-$MODELS/results.jsonl"
git diff docs/parity-report.md
```

Until the `8bca22f4` pin a handful of `retarget/sporeOverlap/…` cases changed verdict among `ok`, `nondeterministic` and
`throws` on every sweep, on any oracle: the algorithm jittered coincident vertices with an unseeded `Math.random()` (issues
#79, #86). Since [eclipse-elk/elk#1242](https://github.com/eclipse-elk/elk/pull/1242) the jitter is seeded (`randomSeed`,
default 1) and every spore case has one verdict; two sweeps of the same oracle agree on all of them. A spore verdict that
changes between two sweeps is now a finding like any other (run the case several times with `tools/oracle/run.sh --cases`
and count the distinct outputs before anything else). The report's timing columns change on every sweep. A changed verdict
of any algorithm, or a changed count in any row of the report, is a content finding (section 11).

**Phase and language sweeps.** Each writes a local directory that one test replays through the port; the test is skipped
without it. Run the sweep, then the test.

| Sweep                             | Output directory                                         | Override variable        | Consumer test                            | Wall  |
| --------------------------------- | -------------------------------------------------------- | ------------------------ | ---------------------------------------- | ----- |
| `tools/oracle/json-sweep.sh`      | `test/corpus/.json-sweep/`                               | none                     | `test/corpus/json-sweep.test.ts`         | 10 s  |
| `tools/oracle/elkt-sweep.sh`      | `$ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/` | `ELKT_SWEEP_DIR`         | `test/corpus/elkt-sweep.test.ts`         | 7 min |
| `tools/oracle/elkj-sweep.sh`      | `$ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/` | `ELKJ_SWEEP_DIR`         | `test/corpus/elkj-sweep.test.ts`         | 5.8 h |
| `tools/oracle/phase-sweep.sh`     | `test/corpus/.phase-sweep/`                              | `PHASE_SWEEP_DIR`        | `test/corpus/phase-sweep.test.ts`        | 8 min |
| `tools/oracle/order-sweep.sh`     | `test/corpus/.order-sweep/`                              | `ORDER_SWEEP_DIR`        | `test/corpus/order-sweep.test.ts`        | 38 s  |
| `tools/oracle/placement-sweep.sh` | `test/corpus/.placement-sweep/`                          | `PLACEMENT_SWEEP_DIR`    | `test/corpus/placement-sweep.test.ts`    | 39 s  |
| `tools/oracle/routing-sweep.sh`   | `test/corpus/.routing-sweep/`                            | `ROUTING_SWEEP_DIR`      | `test/corpus/routing-sweep.test.ts`      | 66 s  |
| `tools/oracle/pipeline-sweep.sh`  | `test/corpus/.pipeline-sweep/`                           | `PIPELINE_SWEEP_DIR`     | `test/corpus/pipeline-sweep.test.ts`     | 54 s  |
| `tools/oracle/labels-sweep.sh`    | `test/corpus/.labels-sweep/`                             | `LABELS_SWEEP_DIR`       | `test/corpus/labels-sweep.test.ts`       | 10 s  |
| `tools/oracle/loops-sweep.sh`     | `test/corpus/.loops-sweep/`                              | `LOOPS_SWEEP_DIR`        | `test/corpus/loops-sweep.test.ts`        | 60 s  |
| `tools/oracle/compound-sweep.sh`  | `test/corpus/.compound-sweep/`                           | `COMPOUND_SWEEP_DIR`     | `test/corpus/compound-sweep.test.ts`     | 15 s  |
| the `--corpus` row of section 7.1 | `$ELK_ORACLE_DIR/sweep/label-sizing/`                    | `LABEL_SIZING_SWEEP_DIR` | `test/corpus/label-sizing-sweep.test.ts` | 4 s   |

`tools/oracle/elkj-sweep.sh` runs for hours (its serializer kind; with `--jobs 6` it took 5 h 30 min of running time in
the `e7eaea57` move, 5 h 31 min in the rehearsal before it, 5 h 47 min in the `8bca22f4` move while another session loaded
the machine); start it detached as section 2 shows and let it resume if
interrupted. Run it alone: its six JVMs beside another long job pass the load bar on a shared machine, and it may only
be paused while no `parse` chunk runs (those cases have a wall-clock timeout). The others take between 3 seconds and 8
minutes each. The stamped sweep directories of `elkt` and `elkj` carry the commit in their name, so the tests find the
new ones without an override once `tools/oracle/ELK_COMMIT` is bumped. The gates set every `*_SWEEP_DIR` to
`/nonexistent` so the full suite does not replay a sweep; after a move, run the consumer tests once without that
setting. `--silent=false` makes vitest print each test's indicator line (`elkt sweep: parse-equal=898/898 …`), which a
non-interactive run otherwise hides for passing tests:

```sh
npx vitest run --silent=false test/corpus/json-sweep.test.ts test/corpus/elkt-sweep.test.ts test/corpus/elkj-sweep.test.ts \
  test/corpus/phase-sweep.test.ts test/corpus/order-sweep.test.ts test/corpus/placement-sweep.test.ts \
  test/corpus/routing-sweep.test.ts test/corpus/pipeline-sweep.test.ts test/corpus/labels-sweep.test.ts \
  test/corpus/loops-sweep.test.ts test/corpus/compound-sweep.test.ts test/corpus/label-sizing-sweep.test.ts
```

Then compare each sweep's results with the "before" side. The result files hold a hash or a status per case and no
timing (the `json` sweep's `ms` field excepted), so an unchanged oracle gives byte-equal files:

```sh
for s in phase order placement routing pipeline labels loops compound; do
  cmp -s "$B/$s.jsonl" "test/corpus/.$s-sweep/results.jsonl" && echo "same: $s" || echo "DIFF: $s"
done
diff <(sed -E 's/,"ms":[0-9]+//' "$B/json.jsonl") <(sed -E 's/,"ms":[0-9]+//' test/corpus/.json-sweep/results.jsonl) >/dev/null &&
  echo "same: json" || echo "DIFF: json"
cmp -s "$B/elkt.jsonl" "$ELK_ORACLE_DIR/sweep/elkt-$NEW-$MODELS/results.jsonl" && echo "same: elkt" || echo "DIFF: elkt"
cmp -s "$B/elkj.jsonl" "$ELK_ORACLE_DIR/sweep/elkj-$NEW-$MODELS/results.jsonl" && echo "same: elkj" || echo "DIFF: elkj"
cmp -s "$B/label-sizing-corpus.json" "$ELK_ORACLE_DIR/sweep/label-sizing/label-sizing-corpus.json" &&
  echo "same: label-sizing" || echo "DIFF: label-sizing"
```

A `DIFF` line is a content finding: `diff` the two files for the case ids, then use the sweep's `--dump` mode (its
script header) on both oracles.

## 10. Ported Java suites {#elk-upgrade-suites}

`tools/oracle/java-tests.sh <fully.qualified.TestClass>...` runs JUnit 4 classes on the oracle, one JVM per class, and
prints `<class> runs=<n> failures=<n>`. The suites that read models need `MODELS_REPO`. The ported classes are the ones
a TS test cites by path, as `.java` or as `.xtend` (the `graph.json.test` suites). The script carries every test bundle
so cited, and `test/architecture/java-tests-bundles.fitness.test.ts` fails when a port cites one it does not carry, so
one call runs them all:

```sh
git grep -hoE 'org\.eclipse\.elk\.[a-z.]+test[a-z.]*/src/[A-Za-z0-9_/]+Test\.(java|xtend)' -- src test | sort -u |
  sed -E 's#^[^/]+/src/##; s#\.(java|xtend)$##; s#/#.#g' >"$TMPDIR/ported-classes.txt"
MODELS_REPO="$ELK_MODELS_DIR" nice -n 10 tools/oracle/java-tests.sh $(cat "$TMPDIR/ported-classes.txt") | tee "$TMPDIR/java-tests.txt"
```

About 7 minutes for the 143 classes of twelve test bundles (51,577 runs at the `8bca22f4` pin, 51,299 of them in the
100 `alg.layered.test` classes). `diff "$B/java-tests.txt" <(grep runs= "$TMPDIR/java-tests.txt")` compares it with
the old oracle's run of section 5 step 1: a class whose `runs` or `failures` changed is a content finding (section 11).
An old-oracle file recorded before issue #97, with the two-bundle commands this section had then, holds only the
layered rows, so the 43 rows of the eleven other bundles show as additions the first time.

Then the TS ports of the same suites over the whole corpus rather than the vendored subset:

```sh
PIPELINE_SUITES_FULL=1 ELK_MODELS_DIR="$ELK_MODELS_DIR" npx vitest run src/alg/layered
```

The per-suite counts the last missions recorded are in `docs/conformance.md` (search for `PIPELINE_SUITES_FULL`).

## 11. Triage the diff {#elk-upgrade-triage-refs}

After sections 6 to 8 every stamped file has changed, because the stamp changed: 57 files at the last rehearsal (44
vector refs, 10 golden `_meta.json`, the census, the `.melk` manifest and `bundle-deps.json`), one line each. The diff
under `tools/` is the bump itself (section 5). Separate the stamp from the content:

```sh
git diff --stat -- test/golden/refs test/corpus tools/melk/sources test/architecture/bundle-deps.json src docs/parity-report.md
N="$TMPDIR/normalized" && rm -rf "$N" && mkdir -p "$N"
git diff --name-only -- test/golden/refs test/corpus tools/melk/sources test/architecture/bundle-deps.json >"$TMPDIR/changed.txt"
while IFS= read -r f; do
  mkdir -p "$N/$(dirname "$f")"
  sed "s/$NEW/$OLD/g" "$f" >"$N/$f"
  git show "HEAD:$f" | cmp -s - "$N/$f" || echo "content: $f"
done <"$TMPDIR/changed.txt"
```

Every changed file gets one class:

| Class      | Test                                                                  | Next step                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stamp-only | not printed by the loop: identical once `$NEW` is rewritten to `$OLD` | none; the file is committed with the move. A patch-series change also rewrites the `patches` array of each `_meta.json`: normalize that the same way before calling a file content                               |
| content    | printed by the loop, or a sweep verdict or JUnit count changed        | diagnosis mode against both oracles: which Java change (section 3's list), origin `file:line`, causal chain, what was ruled out. Then port the Java diff (below)                                                 |
| tool-side  | a recorder, regen or sweep script failed or behaved differently       | diagnose the script against the new build (classpath, a renamed class, a new bundle in `Require-Bundle`); fix the tool in its own commit with the mechanism stated. Never regenerate a ref to hide a tool defect |

Two tool-side cases come with a Java diff and are checked before the re-record is read:

- **A recorder that copies Java code must follow it.** The `sort` group of `tools/vectors/RectPackingVectors.java` runs
  `Collections.sort` with a verbatim copy of the comparator of `InteractiveNodeReorderer`, not the plugin class. When upstream
  changed the comparator (eclipse-elk/elk#1237), re-recording alone would have left every `sort` row as it was. For each changed
  `.java` file of section 3, `git grep -n '<Name>.java' -- tools/vectors` shows the recorders that cite it; a "verbatim from"
  comment marks a copy to update.
- **A planned row can change its group.** A recorder with a self-check refuses to write when a row it plans as `throws` runs, or
  the reverse (`row … is planned throws but ran`). When the Java diff explains it, the row is re-planned in its new group, appended
  last so that earlier rows and seeds do not move, and the row-count constants of the TS replay follow (the `noBestCandidate` row
  of #99, the `scanlineHitboxes` row of #104).

Tests that compare a stamp with `tools/oracle/ELK_COMMIT` fail between the bump and the re-record and pass after it:
`test/melk/sources.test.ts`, `test/melk/sync-sources.test.ts` (its live `--check` case),
`test/architecture/module-boundaries.fitness.test.ts` (its `pinned commit` case, until `bundle-deps.ts --write`),
`test/corpus/census.test.ts`, `test/corpus/elkt-sweep.test.ts`, `test/corpus/elkj-sweep.test.ts`,
`test/golden/oracle-refs.test.ts`, `test/golden/algorithm-refs.test.ts`, the golden tests of the layered, tree,
force-disco and packing sets, `test/docs/examples.test.ts`, and the parity-report tests. A failure of any other kind
after the re-record is content.

**Port Java diffs** (a real move only; a rehearsal stops at the list). For each changed `.java` file of an in-scope
bundle from section 3: read the Java diff, port it into the matching file under `src/` by the rules of CLAUDE.md ("The
Java Is Sacred", the translation rules), port any changed JUnit test with it, and let the re-recorded vectors and
goldens be the expected values: they were recorded before the port changed (AD-13). The TS suite is red on exactly the
content rows until the port is done; a row that stays red afterwards is a port defect, diagnosed against the new oracle.
A new `Math.*` call is listed in `test/architecture/math-call-sites.json` (section 12).

## 12. Repo-wide checks {#elk-upgrade-checks}

| Check                 | Command                                                                                                           | Bar                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Math.*` call sites   | `npx vitest run test/architecture/math-call-sites.fitness.test.ts`                                                | passes; a new call site in ported code fails until it is listed (the audit input of issue #74)                                       |
| Bundle dependencies   | `npx vitest run test/architecture`                                                                                | passes with the rewritten `bundle-deps.json`                                                                                         |
| Docs site and typedoc | `npm run docs:build 2>&1 \| tee "$TMPDIR/docs-build.log"`; `grep -a 'Found .* warnings' "$TMPDIR/docs-build.log"` | exit 0; typedoc prints `Found 0 errors and 200 warnings` (row 12's count): a higher count is a new undocumented or unresolved symbol |
| Links                 | `npm run docs:linkcheck`                                                                                          | exit 0                                                                                                                               |
| Examples              | `npx vitest run test/docs/examples.test.ts` after `tools/oracle/regen-goldens.sh --set examples`                  | the three documentation examples equal the new refs at 1e-6                                                                          |
| Package               | `npm run pack:smoke`; `npm run pack:smoke -- --entry test/public-api/candidate-index.ts`                          | both exit 0                                                                                                                          |
| Queue gates           | `npm run format:check && npm run typecheck && npm run complexity && npm run coverage`                             | exit 0, coverage at 90/90/90/90; set every `*_SWEEP_DIR` to `/nonexistent` for the coverage run as the mission briefs do             |
| Leftovers             | `ps -axo pid,etime,command \| grep -E 'ts-layout-worker\|[j]ava .*elk' \| grep -v grep`                           | prints nothing                                                                                                                       |

## 13. Close-out of a real move {#elk-upgrade-closeout}

1. Journal every regenerated ref with its cause (the commit bump, and the patch id when the series changed), the content
   list of section 11 with each item's mechanism, and the measured wall times.
2. Update the prose that names the pin. `git grep -l "$OLD"` lists the sites: `CLAUDE.md` (the Mission paragraph),
   `NOTICE.md`, `docs/conformance.md`, `docs/architecture/overview.md` and the other pages under `docs/`, and the
   translated pages under `docs-site/`. The AD-2 row of `plans/elk-engine-skeleton/decisions.md` is locked: the new sha
   is recorded by a ruling that amends it, not by an edit. Files under `plans/` are archaeology and keep the old sha.
3. Close what the move closes: an "upstream typos" entry of `docs/conformance.md` whose fix is in `$OLD..$NEW`, together
   with the comment at its port site (a move to `b715fb10` or later closes the `GraphFeature.COMPOUND` entry: the
   comment in `src/graph/properties/GraphFeature.ts` goes, and the ported test's string then equals upstream); a known
   divergence or an oracle patch that upstream merged.
4. Regenerate the parity report from the new sweep (section 9) and commit it with the move.
5. Replace the "Last move" line at the top of this page and the "Cold" columns with the move's own numbers.

## 14. Rehearsal mode {#elk-upgrade-rehearsal}

A rehearsal runs sections 3 to 12 against `$NEW` and leaves the repository, the shared oracle, `~/.m2` and
`$ELK_SOURCE_DIR` as they were. Its evidence is the journal: counts, diff lists and wall times are written down before
the scratch directory is deleted.

1. **Pre-state.** Record what cleanup must restore:

   ```sh
   git -C "$ELK_SOURCE_DIR" worktree list
   git -C "$ELK_SOURCE_DIR" status --short | head
   cat "$ELK_ORACLE_DIR/oracle-build.json"
   ```

2. **Clone.** A plain clone, not a `git worktree` (that would write the main checkout's `.git`):

   ```sh
   QUEUE="$PWD"
   R="${TMPDIR%/}/elk-upgrade-rehearsal" && mkdir -p "$R"   # $TMPDIR ends in "/" on macOS
   git clone --no-hardlinks "$QUEUE" "$R/repo"
   (cd "$R/repo" && npm ci)
   ```

3. **Scratch Maven repository.** An APFS clone of the local repository costs no space until a file changes; the marker
   proves afterwards that `~/.m2` was not written:

   ```sh
   cp -cR ~/.m2/repository "$R/m2"
   touch "$R/m2-marker"
   ```

4. **Environment.** The clone's relative defaults point nowhere, so every variable is explicit. `MAVEN_ARGS` reaches
   both Maven runs of `build.sh` (the Maven 3.9 launcher reads it); `P2_BUNDLES` and `M2_REPO` point the recorders,
   `run.sh` and `java-tests.sh` at the scratch repository:

   ```sh
   cat >"$R/env.sh" <<EOF
   export ELK_SOURCE_DIR="$ELK_SOURCE_DIR"
   export ELK_ORACLE_DIR="$R/oracle"
   export ELK_MODELS_DIR="$ELK_MODELS_DIR"
   export ELK_MVN="$QUEUE/.tools/apache-maven-3.9.11/bin/mvn"
   export MAVEN_ARGS="-Dmaven.repo.local=$R/m2"
   export P2_BUNDLES="$R/m2/p2/osgi/bundle"
   export M2_REPO="$R/m2"
   EOF
   ```

5. **Run sections 3 to 12 in the clone**, with `cd "$R/repo" && . "$R/env.sh"` first. Section 5 step 1 runs in the
   original checkout before the clone is made, and step 4 is skipped: the shared oracle stays, and `build.sh` adds a
   second worktree at `$R/oracle`. Nothing is committed in the clone; `git diff` there is the diff list.

   Some differences between the clone's suite and the original checkout's are expected: a sweep consumer test runs
   wherever its sweep output exists. The bundle-deps regeneration test is not one of them: it reads the manifests by
   commit id, so it runs in the clone and in the original once the ELK checkout each uses holds its pin (issue #89).

6. **Checks after the build.**

   ```sh
   find ~/.m2 -newer "$R/m2-marker" | head                     # prints nothing
   cat "$QUEUE/../elk-oracle/oracle-build.json"                # unchanged from step 1
   (cd "$R/repo" && tools/oracle/run.sh --list-algorithms) >"$R/algorithms-new.json"
   (cd "$QUEUE" && env -u ELK_ORACLE_DIR -u P2_BUNDLES tools/oracle/run.sh --list-algorithms) >"$R/algorithms-old.json"
   cmp "$R/algorithms-old.json" "$R/algorithms-new.json"
   ```

7. **Cleanup**, once the evidence is journaled and no rehearsal process runs:

   ```sh
   git -C "$ELK_SOURCE_DIR" worktree remove --force "$R/oracle"
   rm -rf "$R"
   git -C "$ELK_SOURCE_DIR" worktree list                      # equals step 1
   git -C "$ELK_SOURCE_DIR" status --short | head              # equals step 1
   ```

   `git worktree prune` is not part of the cleanup: it would also drop registrations other sessions left, and the
   post-state would no longer equal the pre-state.

A rehearsal never copies a ref from the clone back into the repository. Its result is a verdict, "clean sweep" (no
content row, no tool-side row) or a triaged diff list, plus the measured costs, filed with the `needs-ruling` issue that
proposes the real move.
