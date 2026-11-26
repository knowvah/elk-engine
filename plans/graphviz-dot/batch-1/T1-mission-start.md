<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: mission start, oracle jar, Xtext client fitness

**Owner:** orchestrator. **Budget:** 20 min. **Commit:** `chore(graphviz-dot): record the dot jar and allow its xtext imports`.

## Context

`tools/oracle/build.sh:22-24` lists the bundles whose jars `oracle-build.json` records. `alg.graphviz.dot` is not among them,
but its jar was built by the same reactor run (D8). `test/architecture/module-boundaries.fitness.test.ts:47` lets only three
bundles import `src/xtext` (D9).

## Steps

1. Do the README's mission-start steps 1-5. Journal `start`.
2. Check `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.graphviz.dot
   plugins/org.eclipse.elk.core plugins/org.eclipse.elk.graph` and journal the result (empty at planning).
3. Compare the mtime of `~/git/knowvah/elk-oracle/plugins/org.eclipse.elk.alg.graphviz.dot/target/*.jar` with the recorded
   jars. Same build: add `alg.graphviz.dot` to `BUNDLES` and run `tools/oracle/build.sh --record-only`. Otherwise run a full
   `tools/oracle/build.sh` (stop 9). Journal the new `oracle-build.json` (commit, patches, the new `jars` entry). The other
   `jars` entries must be unchanged.
4. Add `'src/alg/graphviz/dot'` to `XTEXT_CLIENT_BUNDLES`, and extend its comment with the manifest line (`Require-Bundle:
   org.eclipse.xtext ...`, `plugins/org.eclipse.elk.alg.graphviz.dot/META-INF/MANIFEST.MF`). Add a test in the `graphviz bundles
   (AD-17)` block: an import of `src/xtext` from `src/alg/graphviz/dot/X.ts` passes, and the same import from
   `src/alg/graphviz/layouter/X.ts` fails. Write the test first and watch it fail.
5. `npx vitest run test/architecture`, `npm run typecheck`, `npx prettier --check` on the changed files. Commit.

## Acceptance criteria

- Given the updated `BUNDLES`, when `build.sh --record-only` runs, then `oracle-build.json` names `8bca22f4…`, patches
  0001-0004, and a `org.eclipse.elk.alg.graphviz.dot` jar, and every earlier `jars` entry is unchanged.
- Given a file in `src/alg/graphviz/dot` importing `src/xtext`, when the module-boundary fitness runs, then it reports no
  violation. The same import from `src/alg/graphviz/layouter` is a violation.
- Given the full `test/architecture` suite, when it runs, then every landed assertion passes unchanged.

**Observability:** N/A. **Rollback:** reversible (revert the two edits; `--record-only` again).
