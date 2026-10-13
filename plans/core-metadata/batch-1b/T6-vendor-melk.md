<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Vendor the 13 `.melk` files

**Agent:** tooling-engineer · **Commit:** `chore(T6): vendor the pinned melk sources with a sha manifest`

## Context
CI has no `$ELK_SOURCE_DIR`, but the generator (T9–T13) and its freshness test need the `.melk`
inputs (C9). Copies are pinned to `tools/oracle/ELK_COMMIT` (AD-2) and verifiable.

## Task
1. Copy these 13 files from `$ELK_SOURCE_DIR` at the pinned commit to `tools/melk/sources/<Name>.melk`
   (byte-identical; they already carry EPL-2.0 headers):
   `plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/Core.melk`,
   `…/core/labels/Labels.melk`, `org.eclipse.elk.alg.common/…/compaction/Polyomino.melk`,
   `alg.disco/…/Disco.melk`, `alg.force/…/Force.melk`, `alg.force/…/stress/Stress.melk`,
   `alg.layered/…/Layered.melk`, `alg.mrtree/…/Tree.melk`, `alg.radial/…/Radial.melk`,
   `alg.rectpacking/…/RectPacking.melk`, `alg.spore/…/SPOrE.melk`,
   `alg.topdownpacking/…/Topdownpacking.melk`, `alg.vertiflex/…/VertiFlex.melk`
   (exact paths: `find $ELK_SOURCE_DIR/plugins -name '*.melk'`, excluding libavoid, graphviz, gmf).
2. `manifest.json`: `{ "elkCommit": "<sha>", "files": [{ "name", "upstreamPath", "blobSha" }] }`,
   `blobSha` from `git -C $ELK_SOURCE_DIR rev-parse <commit>:<path>`.
3. `sync-sources.sh [--check]`: re-copies from `$ELK_SOURCE_DIR` (default `../elk`) and rewrites the
   manifest; `--check` exits non-zero on any difference. Honour `ELK_SOURCE_DIR` (AD-15); refuse if
   the source checkout is not at `ELK_COMMIT`. SPDX `#` header; `shellcheck` clean.
4. `test/melk/sources.test.ts`: for each manifest entry, the git blob sha of the committed copy
   (`sha1("blob " + byteLength + "\0" + bytes)`, `node:crypto` is fine in `test/`) equals `blobSha`;
   the 13 names are exactly the listed set.

## Write-set
`tools/melk/sources/*.melk` (13), `tools/melk/sources/manifest.json`, `tools/melk/sync-sources.sh`,
`test/melk/sources.test.ts`.

## Read-set
- `tools/oracle/ELK_COMMIT`, `tools/vectors/graph-vectors.sh:1-40` (script conventions)
- `test/architecture/` SPDX fitness test (confirm `.melk` is not in its file globs; if it is, stop)

## Interface contract (consumed by T9, T11, T13)
`tools/melk/sources/manifest.json` as above; consumers read `files[].name` and the `.melk` text.

## Acceptance criteria
- Given the committed copies, when `sources.test.ts` runs, then all 13 blob shas match the manifest.
- Given `sync-sources.sh --check` against `$ELK_SOURCE_DIR` at the pinned commit, then exit 0 and no
  file changes.
- Given a checkout at another commit, then the script refuses with a message naming both shas.

## Quality bar
README gates; `shellcheck` clean; `bash -n` clean.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No edits to the copied files (prettier must not touch them: confirm `.melk` is not formatted).
