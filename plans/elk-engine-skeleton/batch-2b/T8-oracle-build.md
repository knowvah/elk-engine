<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Oracle worktree and Tycho build

**Agent:** build-engineer · **Commit:** `build(oracle): add patched elk oracle build script`

## Context
The oracle (AD-3) is upstream ELK built **from source** so that later
missions can inject seams (e.g. text-sizing normalization) as a versioned
patch series. ELK builds with Maven + Tycho 4.0.12 / Xtext 2.36: the
`elk-meta` profile builds the `.melk` metadata compiler (`graph`,
`core.meta`), then the default `elk-update-site` profile builds
`../plugins`, `../features`, `../test`, and the p2 repository. ELK's CI
uses JDK 17 and runs (from `build/`):
`mvn --fail-at-end --no-transfer-progress clean verify` with test-path
defines. The user's ELK clone is read-only (stop #7); adding a **worktree**
is allowed.

## Task
Write `tools/oracle/build.sh` and its README, the pinned commit file, and
the empty patch directory; run the build once to prove it.

## Write-set
`tools/oracle/build.sh`, `tools/oracle/ELK_COMMIT`,
`tools/oracle/patches/.gitkeep`, `tools/oracle/README.md`.

## Read-set
- `$ELK_SOURCE_DIR/build/pom.xml:45-80` (profiles), `:280-470` (tycho/xtext/xtend plugins)
- `$ELK_SOURCE_DIR/.github/workflows/nightly.yml` (CI invocation)
- `$ELK_SOURCE_DIR/plugins/pom.xml` (module list)
- `../decisions.md#ad-3-oracle-built-from-source-with-a-patch-series`, `#ad-15-naming-and-rename-safety`

## Specification
- `ELK_COMMIT`: one line, `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`.
- `build.sh` (bash, `set -euo pipefail`, SPDX header, shellcheck-clean):
  1. Resolve repo root from the script location. `ELK_SOURCE_DIR`
     default `<root>/../elk`; `ELK_ORACLE_DIR` default `<root>/../elk-oracle`.
     Print resolved absolute paths.
  2. Preconditions with clear errors: `git`, `java`, `mvn` (≥ 3.9) on
     PATH; `ELK_SOURCE_DIR` is a git repo containing `ELK_COMMIT`.
  3. If `ELK_ORACLE_DIR` does not exist:
     `git -C "$ELK_SOURCE_DIR" worktree add --detach "$ELK_ORACLE_DIR" <sha>`,
     then `git -C "$ELK_ORACLE_DIR" am --3way <root>/tools/oracle/patches/*.patch`
     in lexical order (skip when none) with a fixed committer identity
     (`-c user.name=elk-engine-oracle -c user.email=oracle@invalid`).
  4. If it exists: verify it is a worktree whose commit chain is exactly
     `ELK_COMMIT` + the patch series (compare `git log --format=%s` of
     `<sha>..HEAD` against the patch subjects) and that `git status
     --porcelain` is clean (ignoring build outputs: `target/`, `xtend-gen/`,
     `src-gen/` per ELK's `.gitignore`). Mismatch → exit 2 with message
     "oracle worktree out of date; remove with `git -C $ELK_SOURCE_DIR
     worktree remove $ELK_ORACLE_DIR`". Never modify it in this case.
  5. Build from `$ELK_ORACLE_DIR/build`: `mvn -B --no-transfer-progress
     -P elk-meta clean install -DskipTests`, then `mvn -B
     --no-transfer-progress clean install -DskipTests -Dmaven.test.skip=true`
     (push-forward: add `-pl`/`-am` or memory flags if needed; never edit
     ELK sources). Tee output to `<root>/.oracle-build.log`.
  6. Write `$ELK_ORACLE_DIR/oracle-build.json` (contract below) listing
     the built jar for every **in-scope** bundle (decisions.md Bundle scope).
     Exit non-zero if any is missing. Print wall time.
- `README.md`: purpose, prerequisites (Maven ≥ 3.9, JDK 21; JDK 17
  fallback via `JAVA_HOME`), env vars, usage, how to add a seam patch
  (`git format-patch` from the worktree into `patches/NNNN-*.patch`,
  then remove + rebuild the worktree), how to reset.
- If the build fails on JDK 21 and a JDK 17 is available, retry with it
  once and journal; if both fail → STOP (#5).

## Interface contract (output; consumed by T11)
```ts
// $ELK_ORACLE_DIR/oracle-build.json
interface OracleBuild {
  commit: string;               // ELK_COMMIT
  patches: string[];            // applied patch file names, in order
  jdk: string;                  // `java -version` first line
  builtAt: string;              // ISO 8601
  jars: Record<string /* bundle, e.g. "org.eclipse.elk.core" */, string /* absolute path */>;
}
```

## Acceptance criteria
- Given `ELK_SOURCE_DIR` and no worktree, when `tools/oracle/build.sh`,
  then a detached worktree at `ELK_COMMIT` exists, zero patches are
  applied, Tycho completes with tests skipped, and the user's clone's HEAD
  and working tree are unchanged (`git -C $ELK_SOURCE_DIR status` and
  `rev-parse HEAD` identical before/after).
- Given a successful build, then `oracle-build.json` lists an existing jar
  for every in-scope bundle.
- Given an existing worktree whose HEAD ≠ `ELK_COMMIT` + patches, then the
  script exits 2 with the remove-command hint and does not modify it.
- Given `mvn` missing, then exit 1 with an install hint.

## Quality bar
Gates in README.md (brief). `shellcheck tools/oracle/build.sh` clean.
Functions ≤ 30 lines.

## Observability
Build wall time and exit code printed; full log in `.oracle-build.log`
(gitignored by T1).

## Rollback
Reversible — revert the commit; `git -C $ELK_SOURCE_DIR worktree remove
$ELK_ORACLE_DIR` removes the worktree.
