<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: record the north/south and nested rows in the compound recorder

## Steps

1. For each outcome-1 arm of T2, and each T3/T4 input that needs a nested graph (D1), add a `SITE_n` constant (the
   inline ELK JSON) and one `{"<Class>/<name>", "run", SITE_n}` entry at the end of `SITE_ROWS` in
   `tools/vectors/LayeredCompoundVectors.java` (`:2886-2906`). Edit nothing else in the recorder (stop 1).
2. Regenerate by script: `tools/vectors/layered-compound-vectors.sh <scratch>`, detached under `nice -n 10`, after an
   `uptime` check. Copy the output over the ref.
3. Run the D5 id-keyed diff, as in T5, with the new ids under `sites/`. Journal rows, bytes and the oracle stamp.
4. Append one entry per new row to `test/helpers/layered-compound-site-arms.json`, naming the arms it takes (D6, in
   the form `{file, line, arm}`).
5. `npx vitest run src/alg/layered/LayeredCompoundSites.test.ts src/alg/layered/LayeredCompoundVectors.test.ts`: every
   row passes, and the arm-table structural test passes. Then run
   `node tools/vectors/compound-site-arms.mjs <new row ids>`: exit 0. A failing replay triggers
   [stop 2](../stop-conditions.md).

## Acceptance criteria

- Given the regenerated ref, when the D5 diff runs, then only appended `sites` rows and `rowCounts.sites` differ.
- Given `compound-site-arms.mjs` on the new rows, then every named arm is taken.
- Given a second cold recorder run, then `cmp` with the committed ref exits 0.

## Observability

N/A.

## Rollback

Reversible: drop the appended rows and re-record.
