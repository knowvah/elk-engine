<!-- SPDX-License-Identifier: EPL-2.0 -->

# corpus-sweeps-asserts: planning observations (issue #116)

## Observation: two sweeps hide a port AssertionError on oracle-throws cases

- **Context**: planning #116. I was checking how each corpus sweep would report a firing `devAssert`.
- **Finding**: `loops-sweep.test.ts` `throwsVerdict` (`:92-103`) and `compound-sweep.test.ts` (`:88-99`) accept any
  port throw when the oracle threw. They do not compare the class. A port `AssertionError` on such a case passes, and
  it appears only in the `throw-pairs:` summary as `X(frame)->AssertionError`. The other layered sweeps compare the
  simple class name, so the same event fails there.
- **Impact**: evidence that a sweep with assertions on is "green" is incomplete for `loops` (76 throws cases) and
  `compound` (5) unless someone reads their `throw-pairs:` line.
- **Confidence**: High (source read at `fb4b906a`).

## Observation: the format sweeps run in the plain suite with assertions on

- **Context**: planning #116, scope.
- **Finding**: `json`, `elkj`, `elkt` and `dot-export` need no `*_SWEEP_DIR`. `json` reads `test/corpus/.json-sweep/`,
  and the other three default to `$ELK_ORACLE_DIR/sweep/...`. `vitest.config.ts` loads `test/setup/dev-assertions.ts`
  for every file. So a plain `npm run coverage` in a checkout with the oracle data runs them with assertions on. The
  coverage log carries no per-file lines, though, so it cannot show whether they skipped.
- **Impact**: to use one of these sweeps as assert evidence, run it on its own with `--reporter=verbose` and check
  that it did not skip.
- **Confidence**: High for the config and the defaults. Medium for "ran in the last gate": the log does not show it.
