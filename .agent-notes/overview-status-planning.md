<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: overview-status (issue #93, 2026-11-20)

## Observation: baseline at 9c31c988 is green

- **Context**: Phase 8 pre-flight for this brief.
- **Finding**: `format:check` and `typecheck` exit 0. The full vitest suite with the nine sweep directories off
  (`npm run coverage`, `nice -n 10`): 1,176 files passed, 10 skipped; 49,324 tests passed, 93 skipped, 0 failed;
  98.81 / 96.99 / 98.56 / 98.86; about 202 s. `complexity`, `docs:build` and `codeql` were not rerun at planning.
- **Impact**: The executor may take this baseline at start. T3 runs the full gates on the edited tree.
- **Confidence**: High

## Observation: pin moves leave translated pages stale by hash alone

- **Context**: `npm run docs:i18n-status` while scoping the translation work.
- **Finding**: In all 23 locales, `conformance.md`, `guide/architecture.md` and `guide/overview.md` are stale. For
  `guide/overview.md` the cause is the pin moves `3da09a9c` and `a23e0219`: each edited the sha line in the English
  page and in all 23 copies, but left `sourceHash` at the value of `58c333e3` (`bb2ac033…`; the English page now
  hashes to `e0f61061…`). The copies' content is current. `docs/conformance.md` and
  `docs/architecture/overview.md` were edited by the same pin move.
- **Impact**: Refreshing `sourceHash` after the T2 edits clears `guide/overview.md`. The other two pages need their
  own issue (T3 step 2), and the pin-move runbook could refresh hashes when it edits locale copies.
- **Confidence**: High

## Observation: nothing in test/ pins the overview or home-page prose

- **Context**: AD-13 check for D6.
- **Finding**: `grep -rn "Pre-alpha\|No layout algorithm"` matches only `README.md`, `docs-site/index.md`,
  `docs-site/guide/overview.md` and their 46 locale copies. Tests reference `guide/overview` only as a path (nav
  rows, i18n-status fixtures, lint fixtures).
- **Impact**: The prose can change without a ruling. A failure on it would be stop 4.
- **Confidence**: High
