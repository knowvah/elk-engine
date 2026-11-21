<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: patch 0004 and the patched oracle

## Context

Issue #111 asks for oracle patch `0004` by name: upstream PR eclipse-elk/elk#1247 at head `1bf1da95`, parent `8bca22f4`
(the pin). Decisions [D1](../decisions.md#d1), [D2](../decisions.md#d2), [D3](../decisions.md#d3).

## Steps

1. Stop-1 check (`gh pr view 1247 -R eclipse-elk/elk --json state,headRefOid,mergedAt`), journal.
2. D1: scratch clone, fetch the PR ref, verify sha and parent, `git format-patch -1 --start-number 4 -o
   tools/oracle/patches 1bf1da95`. Compare hunks with `gh pr diff 1247 -R eclipse-elk/elk`. Journal name and sha256.
3. D2: record per-class sha256 of every jar in `oracle-build.json` to `$TMPDIR/spore-scanline-0004/classes-before.txt`;
   also record the spore test bundle's compiled classes (the directory `java-tests.sh` puts on the classpath for
   `org.eclipse.elk.alg.spore.test`).
4. `git am --3way` with `build.sh`'s identity into `~/git/knowvah/elk-oracle`; `uptime`; detached
   `nice -n 10 tools/oracle/build.sh` (set `ELK_MVN` if `mvn` is not on `PATH`, as earlier missions did:
   `.tools/apache-maven-3.9.11/bin/mvn`); poll to `exit 0`.
5. Check `oracle-build.json`: commit `8bca22f4…`, patches 0001-0004, JDK 21.0.1. Journal (`regen` row: patch id 0004).
6. Class diff after vs before (stop 4). Journal the changed class list.
7. `tools/oracle/java-tests.sh org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest` → `runs=4 failures=0`
   (stop 2). Write `java-baseline.md` with the command, output line, oracle stamp and date.

## Write-set

`tools/oracle/patches/0004-*.patch` (new), `plans/spore-scanline-0004/java-baseline.md` (new), the journal. Outside the
repo: `~/git/knowvah/elk-oracle` through `git am` and `build.sh` only; `$TMPDIR`.

## Read-set

`tools/oracle/build.sh:55-120` (series check), `docs/conformance.md:349-377` (§ 4), `tools/oracle/java-tests.sh:1-45`,
`plans/text-sizing-seam/decision-journal.md` rows T1 note / T1 regen (precedent).

## Acceptance criteria

- Given the PR at `1bf1da95`, when T1 ends, then `tools/oracle/patches/` holds exactly 0001-0004 and the 0004 hunks equal
  the PR diff.
- Given the rebuilt oracle, when `oracle-build.json` is read, then it names `8bca22f4…` and patches 0001-0004.
- Given the class hashes before and after, when diffed, then only `ScanlineOverlapCheck*` (alg.common) and spore test
  bundle classes differ.
- Given the patched oracle, when `java-tests.sh` runs `ScanlineOverlapRemovalTest`, then it prints `runs=4 failures=0`.

## Observability

N/A — no new observable operations (library port; evidence goes to the journal).

## Rollback

Reversible: delete the patch file and rebuild with `build.sh` (it refuses a worktree whose subjects differ; remove the
worktree first, conformance § 4 step 4).
