<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: per-row arm proof for the order rows

## Steps

1. Give `tools/vectors/compound-site-arms.mjs` three optional flags (D6):
   - `--table <file>` (default `test/helpers/layered-compound-site-arms.json`);
   - `--test <file>` (default `src/alg/layered/LayeredCompoundSites.test.ts`);
   - `--title <suffix>` (default `$`, the current `-t "<id>$"`).
   Escape regex metacharacters in the id before building the `-t` pattern. Without flags, the argv passed to `vitest`
   stays as it is now. Prove that with the T6 run (same counts), and update the usage line of the header comment.
2. Write `test/helpers/layered-order-search-arms.json`: for each new order row (T5), its id mapped to the arms it takes
   (`[{file, line, arm}]`).
3. Add one test to `src/alg/layered/LayeredOrderVectors.test.ts`, modelled on `LayeredCompoundSites.test.ts:61`. It
   checks that every table id is a row of the ref, every file and line exists, and every arm uses a v8 form. It is a new
   `it`; no existing assertion changes (AD-13).
4. Run `node tools/vectors/compound-site-arms.mjs --table test/helpers/layered-order-search-arms.json --test
   src/alg/layered/LayeredOrderVectors.test.ts --title ': replays the recorded result$'`. It must exit 0. Journal its
   counts.

## Acceptance criteria

- Given no flags, when the tool runs over the existing table, then its output equals the output before the change.
- Given the order table and flags, when the tool runs, then every listed arm has a count > 0, and it exits 0.
- Given the new structural test, when `LayeredOrderVectors.test.ts` runs, then it passes, and the earlier tests'
  titles and statuses are unchanged.

## Observability

N/A.

## Rollback

Reversible.
