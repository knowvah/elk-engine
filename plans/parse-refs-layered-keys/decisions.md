<!-- SPDX-License-Identifier: EPL-2.0 -->

# parse-refs-layered-keys: decisions

| ID | Decision |
| -- | -------- |
| [D1](#d1-the-round-trip-test-registers-layered-next-to-coreoptions) | The round trip test registers `LayeredMetaDataProvider` next to CoreOptions |
| [D2](#d2-script-test-and-refs-change-in-one-task) | The script, the test and the refs change in one task (one commit) |
| [D3](#d3-the-allowed-diff-and-how-it-is-proven) | The allowed diff, proven by a canonical comparison script |
| [D4](#d4-docs-scope) | Docs scope: elk-json.md §5-§7 and one stale conformance bullet; the corpus hand-off is reported and filed |
| [D5](#d5-no-production-src-change) | No production `src/` change |

## D1: the round trip test registers layered next to CoreOptions

- **Context.** Without layered's options, the port's importer drops `layering.layerId` and
  `crossingMinimization.positionId` as unknown, so its export cannot match the oracle's. The oracle harness registers
  12 providers (`tools/oracle/harness/ElkOracle.java:217-230`). The planning probe showed that CoreOptions plus
  `LayeredMetaDataProvider` gives byte-identical output on all four inputs.
- **Decision.** In `beforeEach`, after `LayoutMetaDataService.unload()` and `getInstance()`, call
  `registerLayoutMetaDataProviders(new LayeredMetaDataProvider())`. The `unload` keeps each test on a fresh registry,
  so #120 (re-registration duplicates) does not apply. Other helpers use the same pattern (`test/helpers/layered-framework-replay.ts:166-171`).
- **Rejected.** (a) All 12 oracle providers: no input names another algorithm, and the probe proved them unneeded
  (YAGNI). (b) CoreOptions only: the port drops the two keys, so the ruling cannot be met.
- **Push-forward.** If byte identity fails with layered alone and diagnosis shows the cause is the registry (for
  example a short-key ambiguity that another provider creates on the JVM), register the oracle's full set and journal
  the mechanism. Any other cause is stop 3.

## D2: script, test and refs change in one task

- **Context.** The test reads the refs and `_meta.json` and repeats the script's transform, so the three are one
  consistent unit.
- **Decision.** T1 edits the test first (red: hashes and refs mismatch), then the script, then regenerates (green).
  One commit.
- **Rejected.** Separate commits per file: any intermediate commit would be red.

## D3: the allowed diff and how it is proven

- **Context.** The ruling allows only (a) the two keys appearing where the input carries them, and (b) the
  EMap reorder of existing keys within one `layoutOptions` object, values unchanged. The mechanism of (b) was diagnosed
  in planning: the exported `layoutOptions` order is `BasicEMap` bucket order (`src/emf/ecore/util/EcoreEMap.ts:193-234`:
  capacity `2*size+1`, growth `2*cap+4`, bucket `(hash & 0x7FFFFFFF) % capacity`). Two more entries change the
  capacity, which moves existing keys to other buckets. `_meta.json` changes `transform` and `strippedSha256` as a
  consequence of the ruling.
- **Decision.** `$TMPDIR/parse-refs-layered-keys/d3.mjs`, run on each of the four refs against `git show <base>:<ref>`:
  1. Parse both. Walk them in parallel. Outside `layoutOptions` members, the values must be deeply equal, including
     array order and object key order.
  2. In each `layoutOptions` object, new keys = old keys plus zero or more keys ending in `layering.layerId` or
     `crossingMinimization.positionId`. Each common key has an equal value. Each added key and its value equal the key
     and value in the raw golden (`test/golden/refs/elk/<id>.json`) on the element with the same `id`.
  3. Count and print, per file: the added keys, the `layoutOptions` objects whose common keys changed relative order,
     and `git diff --numstat`.
  4. `_meta.json`: only `transform` and `strippedSha256` differ. `inputSha256`, `elkCommit`, `patches`, `exportSeed`,
     `gsonVersion`, `jdk` and `generatedBy` are equal.
  Journal the output. A reorder count that differs from the planning probe's (6/2/8/2 hunks) is journaled with the
  numbers. It is a stop only when a difference falls outside kinds (a) and (b).
- **Rejected.** Reviewing `git diff` by eye: 18 hunks across 4 large files, and it cannot prove that values are
  unchanged.

## D4: docs scope

- **Decision.** `docs/architecture/elk-json.md`: in §5 the J7 bullet says the keys were stripped until #63 and that
  only `resolvedAlgorithm` stays stripped. §6 gains one sentence: adding entries to an element's properties can reorder
  its exported `layoutOptions` (EMap capacity), as the #63 regeneration showed. In §7 the `STRIP_KEYS` note says the
  hand-off is done (#63). `docs/conformance.md:2576-2577` says "closed by mission 7h", but 7h did not do it; correct it
  to name #63. The test and script header comments are T1's.
- **Corpus hand-off.** `docs/conformance.md:724-730` stays as it is, as the ruling says. T3 checks that
  `tools/corpus/ts-layout-pipeline.ts:75` registers layered for `ts-layout-compare.ts`, reports this on #63, and files
  one `follow-up` issue (after `gh issue list --search` for a duplicate). The issue says that the doc text is stale on
  the code side and that whether the 497 `layoutOptions`-only mismatches close needs a sweep rerun (related: #139).
- **Rejected.** Editing `:724-730` now: the ruling excludes it, and the counts there need a sweep to restate.

## D5: no production src change

The probe shows that the port already matches. If T1 finds a port difference, diagnose it (diagnosis artifact). A fix
in `src/` is a halt (stop 3), because the plan rests on the probe and a `src/` change widens the mission beyond the
ruling.

## Auto-confirmed (unattended)

Planned unattended on 2026-11-23 from issue #63 (`queue:ready`; maintainer rulings 2026-11-21 and 2026-11-23).

- **D1:** recommendation taken (layered only). Rejected: all 12 providers, CoreOptions only. Evidence: the planning
  probe in the #63 comment of 2026-11-23 (port byte-identical with CoreOptions + layered on all 4 inputs);
  `ElkOracle.java:217-230`.
- **D2:** one task. Rejected: per-file commits (red intermediates).
- **D3:** script-proven diff. Rejected: review by eye. Evidence: the ruling text; `EcoreEMap.ts:193-234`.
- **D4:** elk-json.md §5-§7 plus `conformance.md:2576-2577`. The corpus hand-off is reported and filed as a
  `follow-up`. Rejected: editing `conformance.md:724-730` (excluded by the ruling). Evidence: the ruling's last bullet,
  and `ts-layout-pipeline.ts:75`.
- **D5:** no `src/` change. Evidence: the probe.
- **Rollback:** Reversible (revert the one commit). Observability: N/A (test tooling and goldens only).
