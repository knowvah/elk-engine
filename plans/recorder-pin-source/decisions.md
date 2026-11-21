<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: recorder-pin-source (issue #96)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D6 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. The scripts pass the pin as `-Delk.commit`

The sha reaches each recorder as the JVM system property `elk.commit`, read from `tools/oracle/ELK_COMMIT` by the
shell, after the script's existing check that `oracle-build.json` names the same commit.

- **Cached scripts** (26 scripts call `vc_run`; with the 4 direct ones below, 30 scripts run the 41 stamping programs): `tools/vectors/vector-cache.sh`
  gets one helper, `vc_elk_commit` (`tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT"`), and the three `java` lines of
  the run paths (`vc_run`'s cache-off line, `vc_run_whole`, `vc_run_rows`) gain `-Delk.commit="<that>"` before
  `-cp`. Update the file's header ("Expects from the caller") to say it reads the pin from `$ROOT`. No caller changes.
- **Direct scripts**: `graph-vectors.sh`, `graph-json-vectors.sh`, `metadata-vectors.sh`, `transfer-vectors.sh`
  add `-Delk.commit="$pinned"` to their one `java` line (the local is already in scope).
- **Salt**: unchanged formula. `oracle-build.json` is already in every salt and the caller has checked that its
  `commit` equals the pin, so the property adds no information to the key.
- **Sweeps** (`tools/oracle/*-sweep.sh`): unchanged. Their `--sweep` / `--dump` modes never print the stamp (D2).
- Scripts whose programs stamp nothing (`java-vectors.sh`, `gson-vectors.sh`, `label-sizing-vectors.sh`,
  `layered-label-metrics-vectors.sh`) are not touched.

## D2. A lazy, checked accessor replaces the constant

In each of the 41 recorders, the declaration `[private ]static final String ELK_COMMIT = "…";` becomes a static
method of the same visibility, and the single use (the stamp line, one per file at planning) calls it:

```java
    /** The pinned ELK commit: the recorder script passes tools/oracle/ELK_COMMIT as -Delk.commit (issue #96). */
    static String elkCommit() {
        String commit = System.getProperty("elk.commit");
        if (commit == null || !commit.matches("[0-9a-f]{40}")) {
            throw new IllegalStateException("system property elk.commit is " + commit
                + ", not a 40-digit sha; run this recorder through its tools/vectors/*-vectors.sh script");
        }
        return commit;
    }
```

- Lazy, not a static initializer: eight recorders also run in `--sweep` / `--dump` mode from
  `tools/oracle/*-sweep.sh` without the property; an eager read would break them or force eight sweep scripts to
  change.
- **Fail before work:** in the vector path, the first call happens before the first row is recorded (where the stamp is
  written last, add one `elkCommit();` call at the start of that path). A recorder started without the property must
  exit non-zero and write no output file. Check this per file; the elkj round-trip program runs for hours.
- One mechanical transformation over all 41 files (a throwaway script under `$TMPDIR` is fine), reviewed by diff.
  Message wording and the line placement within each file are push-forward; nothing else in a recorder changes.

## D3. The two new scripts run the documented commands on unchanged sources

- `tools/vectors/core-jdk-vectors.sh <outDir>`: the JDK-major check of `java-vectors.sh` (`JDK_MAJOR=21`), then
  exactly the documented `java "$VECTORS_DIR/CoreJdkVectors.java" "$1"` (no extra JVM flags). Writes `awt.json`,
  `regex.json`, `character.json`, `regex-boundary.json`, `stream-sum.json`.
- `tools/vectors/guava-vectors.sh <outDir>`: the shape of `gson-vectors.sh`: oracle `commit` equals the pin (the p2
  cache is the oracle build's), `newest_jar com.google.guava` with `Bundle-Version` `33.3.0.jre` (the p2 directory
  name at planning; the recorder prints `33.3.0-jre`), `newest_jar com.google.guava.failureaccess` (1.0.2 at
  planning; check its `Bundle-Version` too, as a named constant), then exactly
  `java -cp "$GUAVA:$FAILUREACCESS" "$VECTORS_DIR/GuavaVectors.java" "$1"`. Honours `ELK_ORACLE_DIR`, `P2_BUNDLES`.
- Both: SPDX header, `set -euo pipefail`, a header comment in the form of `gson-vectors.sh`, `chmod +x` before
  `git add` (the runbook test checks the bit). No vector cache (as `gson-vectors.sh`, `java-vectors.sh`).
- `CoreJdkVectors.java` and `GuavaVectors.java` are **not edited**, not even their `Run:` comment: the single-file
  launcher compiles in the recording JVM, and an unpinned recorder whose output follows identity hashes changes with
  its source (`.agent-notes/recorder-identity-hash.md`). The scripts are now the documented entry; the runbook says so.

## D4. A fitness test holds the single source

New `test/architecture/elk-pin.fitness.test.ts` (vitest; the shape of the other `*.fitness.test.ts` files):

1. The 40-character pin read from `tools/oracle/ELK_COMMIT` occurs in no tracked file under `tools/` except
   `tools/oracle/ELK_COMMIT` and `tools/melk/sources/manifest.json` (written by `tools/melk/sync-sources.sh`, checked
   by `test/melk/sources.test.ts`; a stamp, like a ref, so allowed and named in the test with that reason).
2. No `tools/vectors/*.java` holds a quoted 40-hex literal (`"[0-9a-f]{40}"`): catches a reintroduced constant at an
   older sha, which (1) cannot see after a pin move. At planning the only such literals are the 41 constants.
3. Every `tools/vectors/*.java` that calls `elkCommit()` is run by a script that passes `-Delk.commit` (via
   `vc_run` or its own `java` line), matched with the runbook test's program-name rule. Push-forward: drop (3) if it
   cannot be written without parsing shell; journal why.

Written first: (1) and (2) fail on the base tree (41 offenders each), pass after T1.

## D5. Proof: cold recorders, sweeps and the negative path

- Every `tools/vectors/*-vectors.sh` row of runbook §§ 7.1 and 7.3 runs into `test/golden/refs/java` (the runbook's
  `$REFS`), cold: editing anything under `tools/vectors/` changes the cache inputs digest and each edited source
  changes its salt, so every `cache:` line must say `recorded` or `rows 0/<n>`; a `hit` means the run proved nothing
  (rerun with `ELK_VECTORS_CACHE=off`). Then `git diff --exit-code test/golden/refs/` and `git status --porcelain
  test/golden/refs/` (no new file).
- The two new scripts also write into a fresh `$TMPDIR` directory; `cmp` each file against `test/golden/refs/java/`.
- The eight sweeps whose program changed (`compound`, `labels`, `loops`, `order`, `phase`, `pipeline`, `placement`,
  `routing`) rerun after T1 (their freshness stamp hashes the program, so they run without `--force`) and their
  `results.jsonl` are byte-equal to the before-side T0 captured. Evidence that the lazy accessor left `--sweep` alone.
- Negative path on one short recorder (`MetaDataVectors.java`, classpath built as its script does): without the
  property it exits non-zero, prints the D2 message and writes no file; with `-Delk.commit=` and 40 `a`s it writes a
  ref whose stamp is that value (into `$TMPDIR`, never the repo). Shows the stamp comes from the property.
- Any ref byte that differs is an AD-13 STOP for that ref (stop 3): diagnosis first, never a re-record to green.

## D6. Issue #50 stays separate

#96 says it "can be done with" #50. Not here: #50's multi-file `javac` build changes how every recorder compiles,
which interacts with the identity-hash risk above and has its own design question; bundling it would make a ref
change impossible to attribute. #50 stays `queue:ready` as it is.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, and why | Evidence |
| -------- | ------ | ----------------- | -------- |
| D1 transport | System property from the script | (a) A program argument: argument lists differ per program (`<out> <vectorsDir> [<cacheDir>]` under `vc_run`, other lists on the four direct lines), so a new positional argument means 41 parsers and 30 call sites. (b) The program reads `tools/oracle/ELK_COMMIT` itself: `metadata-vectors.sh` passes only `<outDir>`, a single-file program cannot reliably find its own path, and it would move the pin check out of the scripts. (c) An environment variable: inherited silently from the caller's shell | `grep -n 'java ' tools/vectors/*.sh`; `vector-cache.sh:93-145` (`java` at 98, 121, 139); issue #96 option 1 names "an argument or a system property" |
| D1 where in the cache layer | `vc_elk_commit` inside `vector-cache.sh` | Each of 26 callers passing it: 26 edits for the same value; `pinned` is a `local` of `main` | every caller runs the pin check before `vc_init`/`vc_run` (e.g. `disco-vectors.sh` `main`) |
| D2 accessor | Lazy checked method | Eager `static final … = System.getProperty(…)`: a missing property prints `"null"` silently, or (with a check) breaks the eight sweep modes | `tools/oracle/*-sweep.sh` run the recorders' `--sweep`; each recorder uses `ELK_COMMIT` once, at the stamp (`git grep -n ELK_COMMIT -- tools/vectors`) |
| D3 sources | Leave both Java files unedited | Updating their `Run:` comments: a comment-only edit did not move identity hashes in `JavaVectors.java`, but neither program pins `-XX:hashCode=2` and the gain is cosmetic | `.agent-notes/recorder-identity-hash.md` |
| D4 test | New architecture fitness test | Only the runbook's `sed` check: it is manual and cannot fail CI | `rules/architecture.md` fitness functions |
| D5 sweeps | Rerun the eight and byte-compare | Skipping them: the sweep consumer tests read `results.jsonl` whatever its stamp, so a broken `--sweep` would surface only at the next pin move | `test/corpus/loops-sweep.test.ts:54-59` |
| D6 | #50 separate | Bundle: unattributable ref changes | issue #50 body |

No decision here is reserved for the maintainer: no ref, tolerance, oracle patch or pin changes by design, and the
change is reversible (`git revert`; the cache refills on the next run).
