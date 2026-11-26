<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: deferred-bundles-acceptance (issue #88, 2026-11)

## Observation: bundle scope is stated in more files than CLAUDE.md, the inventory and the port-map

- **Context**: recording AD-17 (libavoid out of scope, the two Graphviz bundles in scope) "everywhere the scope is stated".
- **Finding**: `grep -rni 'libavoid\|graphviz'` outside `plans/` also hits `docs/architecture/elk-upgrade.md` § 3 (the
  triage table that classifies an upstream path as in-scope, deferred or out of scope), `docs/architecture/melk-codegen.md`
  (why three `.melk` files are not copied) and `docs/architecture/port-map.md` § "Packages spanning bundles" (a count of in-scope
  `tsDir`s, which read 13 while the table held 16). None is checked by a test. The inventory's **In-scope total** row
  (bundle count and LOC sum) and its "Classification counts" line are hand-maintained too.
- **Impact**: a mission that changes a bundle's scope class (the three `.ide` bundles are the remaining "Deferred" rows)
  greps for the bundle name over `docs/` and `tools/` and re-sums the inventory; the brief's file table is not the whole
  list.
- **Confidence**: High

## Observation: what #95 inherits from the acceptance

- **Context**: adopting `alg.graphviz.dot` and `alg.graphviz.layouter` in `IN_SCOPE_SUFFIXES` before any port.
- **Finding**: `test/architecture/bundle-deps.json` now maps `src/alg/graphviz/dot` (requires `src/core`, `src/graph`) and
  `src/alg/graphviz/layouter` (plus `src/alg/graphviz/dot`); `src/alg/graphviz/` itself is owned by no bundle, so a file
  directly in it fails `has no unmapped directories`. `Graphviz.melk` is not vendored: `tools/melk/sync-sources.sh:14-27`
  is an explicit list of 13 files, and `docs/architecture/melk-codegen.md` says it joins with the port. No reader of
  `IN_SCOPE_SUFFIXES` exists outside `tools/bundle-deps.ts` and `test/architecture/`, so adopting a bundle there does not
  touch the oracle build or any recorder.
- **Impact**: #95 step 3 adds `Graphviz.melk` to `sync-sources.sh` and its manifest; the port may import only the listed
  directories and the shim directories, and what the Java takes from `core.service` (optional requirement) is replaced.
- **Confidence**: High
