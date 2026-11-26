<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: last-ulp-bar (issue #74)

These are locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

| ID | Decision (one line) |
| -- | ------------------- |
| [D0](#d0-the-ruling-this-mission-executes) | Execute the 2026-11-13 ruling as written in #74; no wording that changes its meaning |
| [D1](#d1-where-the-rule-is-written) | Append `## AD-4 amendment (2026-11-13)` verbatim; one `CLAUDE.md` clause; the rule in `docs/conformance.md` § 2 |
| [D2](#d2-audit-scope-and-classes) | Audit every documented last-ulp entry; four classes; "none observed" call sites have nothing to bound |
| [D3](#d3-how-a-delta-is-measured) | Max absolute delta over every position and size, including size-valued option strings, against the oracle |
| [D4](#d4-mechanism-and-oracle-evidence-a-new-jvm-vector) | New recorder `LastUlpVectors.java` → new ref `last-ulp.json`: HotSpot `Math` vs `StrictMath` rows and the radial layout |
| [D5](#d5-the-pinning-test) | One new test file pins mechanism and bound per entry; no comparator or tolerance change |
| [D6](#d6-docs) | A last-ulp entries table in § 2; the three "#74" forward references become the result |
| [D7](#d7-entries-that-fail) | An entry above the bar or without a mechanism: `needs-ruling`, left as it is |

## D0: the ruling this mission executes

The maintainer ruling of 2026-11-13 (#68 item B, made general; issue #74 body): the bar for last-ulp math divergences is
0.01 px. The four-point rule in #74 ("The rule (as recorded)") is the text to record. No ruling is open: #74 carries no
`needs-ruling` label and no "Blocked by". If the executor finds wording in #74 that would change the rule's meaning when
copied (the issue asks to flag it), journal it and copy the issue text unchanged; the flag goes in the close-out.

## D1: where the rule is written

**Decision.**

- `plans/elk-engine-skeleton/decisions.md`: append, after the last line, `## AD-4 amendment (2026-11-13)` with the four
  numbered points of #74 as written, a one-line provenance (maintainer ruling, #68 B made general) and a link to
  `https://github.com/knowvah/elk-engine/issues/74`. No other byte of that file changes (`git diff` shows only added lines
  at the end). This is the one write to an earlier mission's `plans/` the mission makes; #74 asks for it by name.
- `CLAUDE.md`, Verification, the "Conformance bar (AD-4)" bullet (line 48): replace the sentence about last-ulp
  divergences with one that keeps 1e-6 and adds the bound: a last-ulp `Math.*` case is a known divergence only with a
  demonstrated HotSpot-vs-V8 mechanism and an effect at or below 0.01 px on every position and size, pinned per case
  (AD-4 amendment). The file must stay under its current length plus three lines.
- `docs/conformance.md` § 2, the "ulp-level `Math.*` differences" bullet (`:201-207`): add the rule (all four points) and
  a link to the AD-4 amendment; keep the existing `nextGaussian` text.

**Rejected.** Rewriting AD-4 in place (the issue forbids it; AD-1…AD-16 are locked). A new ADR file (the issue names the
amendment form).

## D2: audit scope and classes

**Decision.** In scope is every place the repo records a last-ulp or `Math.*`-platform divergence. T1 finds them with
`grep -rn -i -E 'last-ulp|last ulp|ulp-level|one ulp|StrictMath' docs/ CLAUDE.md tools/corpus/ts-findings.json test/ src/`
(excluding `test/golden/refs/`) and reads `plans/*/decisions.md` only as evidence. Planning inventory (a starting list,
not the audit):

| Entry | Where | Planning reading |
| ----- | ----- | ---------------- |
| E1 `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` | `docs/conformance.md:2002-2008`, `:2475-2478`, `ts-findings.json` | `EadesRadial.java:102` `Math.sin(1.6073462520335293)`: HotSpot …4178, V8 and `StrictMath` …4177; one option string, geometry within 1e-13 |
| E2 disco `getOrthogonalPoints` | `docs/conformance.md:2137-2142` | 32 fields in six `import` stops of `disco.json`, all inside 1e-6; HotSpot differs on 9 `cos` and 5 `sin` of 160 each |
| E3 `Math.log` on x86_64 | `docs/conformance.md:2163` | bit-exact on the reference platform (arm64, 21.0.1); no divergence observed |
| E4 `Random.nextGaussian` / `JavaMath.log` | `docs/conformance.md:201-207` | a bit-exact `StrictMath.log` port, specified by the Javadoc; not a divergence |
| E5 the 36 call sites | `docs/conformance.md:231-298` | 34 rows "none observed"; the 5 rows citing E1/E2 are covered there |

Each entry gets one class:

- `accepted`: misses 1e-6, mechanism demonstrated, every position and size within 0.01 px, no discrete flip, pinned (D5).
- `inside-bar`: within 1e-6 everywhere (E2 at planning). Still measured and pinned, because #74 names it; listed as a
  last-ulp entry that needs no acceptance.
- `no-divergence`: no observed difference on the reference platform (E3, E4, E5 "none observed"). No delta to measure;
  the row says so. The unit-test-only call sites stay as they are (the comment on #74 already lists them).
- `fails`: above 0.01 px, a flipped discrete decision, or no demonstrated mechanism → D7.

**Rejected.** Measuring all 36 call sites (#74 asks for the delta of known-divergence entries; a site with no observed
divergence has no delta). Treating E1's option string as non-positional: `childAreaHeight` is a size, so it is measured.

## D3: how a delta is measured

**Decision.** The positional delta of a case is `max |oracle − port|` over every number that is a position or a size in
the layout output: `x`, `y`, `width`, `height` of the graph, nodes, ports and labels; every bend point, junction point,
and section start and end point; and option values that hold a size or position (E1: `childAreaHeight`,
`childAreaWidth`, parsed as numbers from their strings). Ids and element counts must match exactly first (a mismatch is a
discrete flip, D7). For a step dump (E2's `import` stops) the same rule applies to every numeric field of the stop. T1
measures from the local oracle sweep cache (E1) and the committed `disco.json` (E2); T4 re-measures in the pinning test
against the T3 ref and journals both values.

**Rejected.** Measuring only the fields that differ in the 1e-6 comparison (the bound is on every position and size).

## D4: mechanism and oracle evidence: a new JVM vector

**Decision.** A new recorder `tools/vectors/LastUlpVectors.java` with its script `tools/vectors/last-ulp-vectors.sh`
(shaped like `radial-vectors.sh` and the `Math.log` rows of `ForceVectors.java:1670-1700`) writes
`test/golden/refs/java/last-ulp.json`:

- `math` rows, one per input in `tools/vectors/last-ulp-inputs.txt` (T1; lines `<entry> <function> <hex input>`): the
  input, `Math.<f>(x)` bits on the first (cold) call and after a warm loop that gets the caller compiled (at least 200,000
  calls, a sink to keep it live), and `StrictMath.<f>(x)` bits. E1: every `sin`/`cos` input of `EadesRadial` in that
  layout. E2: every `sin`/`cos` input of `getOrthogonalPoints` in the 88 disco stops runs. T1 collects them from the TS
  side with temporary instrumentation in `$TMPDIR` (the inputs are bit-identical on both sides: 8b showed `atan2`
  bit-identical, and the import stop's other values are bit-exact).
- `layout` rows for E1: the oracle's export of `sloppy_overlaps_2` retargeted to radial, laid out the way
  `tools/oracle/harness/CaseRunner.java` does, on the first run and after a warm-up of repeated layouts, with
  `runsAgree`. The sweep's value (`"2561.1171089266686"`) came from a warm JVM, so a cold run may give V8's value.

The ref is new; it is added by script and journaled with the patch set (0001-0004). No existing ref changes.

**Rejected.** Inline oracle constants in a test (hand-copied expected values; AD-5 says refs come from scripts). Adding E1
to `test/golden/trees.json` (the tree-goldens test would then fail on the string and need a per-case exception in a
landed test). Pinning E1 from the gitignored sweep cache (CI has no JVM output).

## D5: the pinning test

**Decision.** `test/golden/last-ulp-divergences.test.ts`, one `describe` per `accepted` or `inside-bar` entry:

1. Mechanism: for every `math` row, V8's `Math.<f>(x)` bits equal the row's `StrictMath` bits, and the rows where the
   warmed HotSpot value differs from `StrictMath` are exactly the journaled set, each by one ulp.
2. Bound: E1 lays out the vendored `test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt` with the radial
   retarget the way the TS sweep does (`tools/corpus/ts-layout-pipeline.ts`: `.elkt` parse, retarget overlay, layout,
   oracle-like export; `tree-goldens.test.ts` shows the registration), compares with the recorded oracle layout(s): `compareLayout` at the
   default 1e-6 gives exactly the journaled diffs (E1: the one option string), and the D3 delta is at or below a named
   constant holding the measured value, which is itself at or below `LAST_ULP_BAR_PX = 0.01`. E2 replays the six `import`
   stops of `disco.json` through `test/helpers/disco-replay-dump.ts` and asserts the same two inequalities.
3. No discrete flip: ids, counts and non-numeric values other than the journaled diffs are exactly equal.

No change to `compare-json.ts`, `DEFAULT_TOLERANCE`, `DiscoVectors.test.ts` or any landed assertion.

**Rejected.** Folding the pins into the existing algorithm tests (they would need classification branches); asserting the
measured delta with `toBe` (a V8 update could move a 1e-13 value without crossing anything).

## D6: docs

**Decision.** `docs/conformance.md`: under the § 2 policy, a table "Last-ulp `Math.*` entries (AD-4 amendment)" with one
row per E1-E5 entry: case, class, mechanism (function, input, HotSpot and V8 bits or "none"), measured maximum
positional delta, pinning test. Replace `:283-284`, the end of `:2008` and `:2477-2478` ("… is issue #74") with the
result and a link to the table; add the measured delta and the pin to the 8a and 8b entries. The math-call-sites table
rows stay as they are (the fitness test pins the JSON, not the prose).

## D7: entries that fail

**Decision.** An entry classed `fails` is not fixed and not re-classed. File one `needs-ruling` issue per entry naming the
case, the measured delta or the missing evidence, and the rows; list it in the entries table as "open, #N"; finish the
rest (stop 4).

## Auto-confirmed (unattended)

Planning ran with `--unattended`. Each decision above was taken on the recommendation; rejected options and evidence:

| Decision | Taken | Rejected | Evidence |
| -------- | ----- | -------- | -------- |
| D1 amendment form | append to decisions.md | edit AD-4; new ADR | #74 "Work" list |
| D2 scope | documented entries, four classes | measure all 36 call sites | #74 audit bullet; `docs/conformance.md:231-298` |
| D3 measure | every position and size, option sizes too | only differing fields | #74 rule point 2 |
| D4 evidence | new recorder and new ref | inline constants; trees.json entry; sweep cache | AD-5; queue gate 7 allows added refs; `tree-goldens.test.ts` compares every manifest entry |
| D5 pin | one new test file, `≤ measured ≤ 0.01` | per-algorithm classification; exact `toBe` | #74 rule point 4 "pinned per case" |

The point the maintainer may overrule: D2's `inside-bar` class for E2 (it does not miss 1e-6, so the amended rule does
not require its acceptance; it is pinned because #74 names "the force entries").
