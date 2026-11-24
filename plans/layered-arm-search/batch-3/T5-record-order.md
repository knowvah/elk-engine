<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: record the crossing-min rows in the order recorder

## Steps

1. For each outcome-1 or outcome-2 arm of T3/T4 whose input is a flat graph, add one entry to `SCENARIOS` in
   `tools/vectors/LayeredOrderVectors.java`. Use the existing inline-graph scenario mechanism (`:2081`, and `sc(...)`
   at `:2474` for `sites/`):
   - an outcome-1 row is a `scenarios/<Class>/<name>` id whose steps follow D3;
   - an outcome-2 row is a `sites/<Class>/<name>` id.
   Edit only the scenario tables and their inline input constants. Change no recording, encoding or step code (stop 1).
2. Regenerate by script: `tools/vectors/layered-order-vectors.sh <scratch>`, detached under `nice -n 10`, after an
   `uptime` check. Copy the output over the ref.
3. Run the D5 id-keyed diff against the base ref. The base rows must be byte-equal and in their order, and the new ids
   must be under `scenarios/` or `sites/`. The header may differ only in `rowCounts`, and the new rows must stay within
   250 KB. Journal rows, bytes and the oracle stamp.
4. `npx vitest run src/alg/layered/LayeredOrderVectors.test.ts`: every row passes, the new ones included. A failing new
   row triggers [stop 2](../stop-conditions.md): drop it from `SCENARIOS`, re-record, and diagnose.

## Acceptance criteria

- Given the regenerated ref, when the D5 diff runs, then only appended rows and `rowCounts` differ.
- Given a second cold recorder run, when its output is compared with the committed ref, then `cmp` exits 0.
- Given the replay test, when it runs, then every new row passes at the AD-4 bar.

## Observability

N/A.

## Rollback

Reversible: drop the appended rows and re-record. The base ref is in git.
