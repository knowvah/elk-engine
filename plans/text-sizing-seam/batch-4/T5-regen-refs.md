<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: regenerate the refs the patch stamps, and the parity report

**Agent:** orchestrator. **Decision:** TX8. **Writes:** the `patches` field of the nine `test/golden/refs/*/_meta.json`
(`elk`, `elk-algorithms`, `elk-force-disco`, `elk-layered`, `elk-packing`, `elk-parse`, `elk-trees`, `elkj-parse`,
`elkt-parse`), only through the scripts; `docs/parity-report.md` only through `parity-report.ts --write`.

## Read-set

- `tools/oracle/regen-goldens.sh:1-60,160-175`, `regen-elkt-refs.sh`, `regen-elkj-refs.sh:55-70`, `regen-parse-refs.sh`,
  `regen-generated.sh` (usage lines)
- `docs/architecture/parity-dashboard.md` (the runbook: `sweep.sh`, the sharded TS sweep, `parity-report.ts` flags)
- `docs/conformance.md` § 4 steps 6-7, § 6 (the gates for patch-series changes)

## Steps

1. Check `uptime`. Then run, in order: `regen-goldens.sh --set <s>` for `default`, `algorithms`, `layered`, `trees`,
   `force-disco` and `packing`; then `regen-elkt-refs.sh`, `regen-elkj-refs.sh`, `regen-parse-refs.sh` and
   `regen-generated.sh`.
2. Run `git diff --stat test/golden/refs test/corpus/generated`. The only allowed change is `patches` in the nine
   `_meta.json` files, which gain `0003-alg.test-pluggable-label-text-measurer.patch`. Check this with
   `git diff -U0 | grep '^[-+] '`: every changed line must lie within a `patches` array. Anything else is stop 3: restore
   that file from git, diagnose it, and do not commit it.
3. Run a fresh full oracle sweep (`tools/oracle/sweep.sh`, detached, `nice -n 10`, with `-XX:hashCode=2` as the runbook
   requires). Then run the sharded TS sweep with `--out`, and `npx tsx tools/corpus/parity-report.ts --ts-summary <out>
   --write`. In `docs/parity-report.md`, only the "Oracle seam patches" line may change. A changed count or verdict is a
   stop-6 diagnosis: the patch cannot reach a layout, so a change means nondeterminism or a stale cache, and it is
   journaled with its cause.
4. Run `shellcheck tools/oracle/*.sh tools/vectors/label-sizing-vectors.sh`, `npx tsx tools/corpus/census.ts` (exit 0) and
   `test/golden/oracle-refs.test.ts` and `test/golden/algorithm-refs.test.ts` (green).
5. Journal one `regen` row per script: the patch id `0003`, the files it changed, and the reference platform (#52).

## Acceptance criteria

- Given the rebuilt oracle, when every regen script runs, then the only ref diff is the nine `_meta.json` `patches` arrays.
- Given a fresh oracle sweep and TS sweep, when the report is regenerated, then only its patch line differs, and
  `parity-report.ts` without `--write` exits 0.
- Given the census tool, when it runs, then it exits 0.

**Observability:** N/A. **Rollback:** Reversible (revert the ten files; the next regen restores them).
