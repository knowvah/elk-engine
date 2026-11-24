<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: canonical-nan (issue #72)

These are locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

## D0: the ruling this mission executes

The maintainer ruling on #53 (2026-11-13): (1) the port has one canonical NaN form, `Double.doubleToLongBits`
(`7ff8000000000000`), amending W5 for NaN only; the JVM's two NaN encodings differ only in the sign bit and the oracle
does not reproduce which one it gets. (2) It is port-wide for layout comparisons: docs and the remaining raw-NaN layout
recorders and sweeps move to the canonical form in #72; JDK shim vectors keep raw bits. #72 adds the work list: a
conformance entry, an audit of every recorder and sweep helper comparing layout output, a move to the canonical form on
both sides with a unit test that both NaN signs hash alike, and refs that change only on NaN-bearing values, regenerated
by script and journaled. No ruling is open: #72 carries no `needs-ruling` label and no "Blocked by".

## D1: what counts as a layout comparison

**Decision.** In scope is every site that turns a double from a layout run (oracle or port) into bits for a ref, a hash or
an equality test:

- JVM: the `hex`/`hx`/`bits`/`bitsOf`/`rawHex` encoders and the C4 `double` encoders of every recorder and sweep in
  `tools/vectors/` other than the JDK shim recorders, and oracle-against-oracle stability checks on layout coordinates
  (`RectPackingVectors.positions`, `RectPackingVectors.java:718-724`; the moved-vertex count, `SporeLayoutVectors.java:973-974`).
- TS: every helper or replay test that encodes a port double as hex to compare with those refs or hashes.

Out of scope: `JavaVectors.java`, `CoreJdkVectors.java` and any row testing a bit-level API (`doubleToRawLongBits`,
`longBitsToDouble`, `Float32`), where the raw bits are the behaviour; production code in `src/` (`Point.ts`,
`ElkRectangle.ts` port Java `hashCode`s); comparisons that decode a ref to a number and compare with `Object.is`
(`test/golden/compare-json.ts`), which are sign-blind already; Gson text outputs (bare `NaN`) of the corpus sweeps.

T1 classifies each site as `raw` (can emit a raw NaN), `guarded` (throws on NaN before encoding), `by-construction`
(the value was parsed from text, so a NaN is already canonical) or `canonical`, and journals the table. A site whose
class T1 cannot prove is treated as `raw`.

**Rejected.** Only the sites the issue names (AlgCommon, Disco, the 7b-7f2 sweeps): the issue asks for every recorder.

## D2: the canonical form on each side

**Decision.** JVM: `Double.doubleToLongBits(d)` in place of `Double.doubleToRawLongBits(d)`, formatted as before. Landed
canonical sites (`ForceVectors.hex`'s ternary, `SporeLayoutVectors.bits`, the 7g/7h `rawHex`) stay as they are: they are
already equivalent. TS: one shared helper `test/helpers/double-hex.ts` exporting `CANONICAL_NAN_HEX = '7ff8000000000000'`
and `canonicalHex(value: number): string`, built on the vector-proven shim `doubleToLongBits`
(`src/java/lang/JavaDouble.ts:41`, proven by `hash.json:354-360`). Each TS site calls it instead of its local
`DataView`/`doubleToRawLongBits` encoder. `force-replay-rows.ts`'s `NAN_HEX` and `layered-loops-sweep.ts`'s
`CANONICAL_NAN` become re-uses of `CANONICAL_NAN_HEX`, keeping their exported names so no importer changes.

**Rejected.** (a) A hand-written `isNaN ? NAN : raw` in each file: twenty copies of one literal (no-magic-strings rule).
(b) Canonicalising dumps after the fact with `canonicalNaN` everywhere: it works only on hex strings already emitted and
leaves the encoders raw.

## D3: guarded recorders keep their guard

**Context.** Most layout recorders throw "NaN in a recorded value" before encoding (`AlgCommonVectors.java:197-203`,
`DiscoVectors.java:1841-1846` and 16 more). They never write a NaN, so their refs hold none. The issue names AlgCommon and
Disco as candidates and notes that Disco "fails on any NaN".

**Decision.** Swap the encoder behind the guard to `doubleToLongBits` and fix the header comment, and keep the guard.
For non-NaN input the two calls return the same bits, so the refs stay byte-identical. The guard is a separate check (the
scenario must not produce NaN) that the issue does not ask to remove.

**Rejected.** (a) Remove the guards so NaN rows can be recorded: it changes what each recorder accepts, needs new rows to
mean anything, and the issue's work list does not ask for it; it stays a maintainer choice (a `follow-up` may propose it).
(b) Leave raw calls behind guards: a fitness test cannot tell them from a real raw site, and the issue names AlgCommon.

## D4: the proof

**Decision.** TS: `test/helpers/double-hex.test.ts` asserts that `7ff8000000000000`, `fff8000000000000`,
`7ff8dead0000beef`, `7ff0000000000001` and `ffffffffffffffff` (built with `longBitsToDouble`) all encode to
`7ff8000000000000`, and that `0.0`, `-0.0`, `±Infinity`, `Double.MIN_VALUE` and `1.5` keep their raw bits. Each changed
helper with an exported encoder or hash gets one test that a value or dump with an `fff8…` NaN encodes or hashes equal to
the `7ff8…` one (the shape of `layered-loops-sweep.test.ts`). JVM: the Java side has no unit framework; the proof is the
JDK contract (Javadoc of `doubleToLongBits`), the JVM rows `hash.json:354-360` that map every NaN pattern to `7ff8…`, and
the fitness test (D5) that no raw call is left.

## D5: the fitness test

**Decision.** `test/architecture/canonical-nan.fitness.test.ts` fails when `doubleToRawLongBits` appears in
`tools/vectors/**/*.java`, or `doubleToRawLongBits`/`setFloat64(` appears in `test/helpers/**/*.ts` or
`src/alg/**/*.test.ts`, outside an allowlist kept in the test with a reason per entry. The allowlist starts with
`JavaVectors.java` and `CoreJdkVectors.java` (JDK shim vectors), `test/helpers/double-hex.ts` only if it needs raw bits,
and any site T1 classifies as a bit-level test or as an input builder (for example `spore-tree-fixtures.ts:104` if it
builds inputs rather than encoding output). A comment line counts: the headers say `doubleToLongBits` after T2.

## D6: docs

**Decision.** `docs/conformance.md`: a short entry right after the comparator table's non-finite row (line 169) stating
the two JVM encodings and the sign bit, the #53 evidence (7g T19: one case's raw bits changed run to run), the canonical
form `Double.doubleToLongBits` = `7ff8000000000000`, that every non-NaN value keeps its raw IEEE bits, and that JDK shim
vectors stay raw. Sentences T1 finds that still call a layout encoding "raw IEEE hex" without the NaN exception (for
example near lines 1619, 1637, 1732) get the exception or a link to the entry. Recorder header comments are T2's.

## D7: regeneration and evidence

**Decision.**

1. T1 reruns every layout recorder **unchanged** into `$TMPDIR/canonical-nan/before/` and diffs each output with its
   ref. All must be byte-identical: that separates pre-existing drift (stop 1) from this mission's change.
2. T4 reruns every recorder T2 changed into `$TMPDIR/canonical-nan/after/` and diffs again. The prediction is no
   difference: the only layout refs with NaN are `force.json` and `spore-layout.json` (canonical already)
   and `mrtree-units.json`, whose 72 NaN are all `7ff8…` today. A difference only at NaN tokens is copied into the ref
   and journaled with the recorder, the file, the count and "patch: issue #72". Any other difference is stop 3.
3. T4 copies each local sweep `results.jsonl` aside, reruns every sweep whose Java T2 changed (`--force`), and compares by
   id: status, class and processor must be equal; an `ok` hash may change only where the case's dump holds NaN, shown by
   `--dump` with the base recorder (`git show <base>:<file>` into `$TMPDIR`) canonicalised equal to the new dump. Then the
   TS sweep tests run and must keep every pass.

## D8: one commit per task, then one squash

**Decision.** Commits after T1 (journal), T2, T3 and T4 under the queue's commit rule; T5 tags `canonical-nan/pre-squash`,
runs `git reset --soft <base>` and makes one commit with `Refs: #72`.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-24. `next` resolved to #72 (lowest open
`queue:ready` without `queue:on-branch`, no "Blocked by"; no `queue:planned` issue open).

| Decision | Taken | Rejected | Evidence |
| -------- | ----- | -------- | -------- |
| D1 scope | every recorder and TS encoder of layout doubles | the three named sites only | #72 item 2 "Audit every recorder"; #53 ruling 2 |
| D2 form | `doubleToLongBits` (JVM), one shared TS helper on the shim | per-file ternaries; dump post-processing | `hash.json:354-360`; `JavaDouble.ts:41`; 7g precedent |
| D3 guards | keep, swap encoder | remove guards; leave raw behind guard | issue work list does not ask; identical non-NaN bits |
| D4 proof | TS unit tests + JDK contract + JVM rows + fitness | a JVM unit framework | no Java test harness in `tools/vectors` |
| D5 fitness | one architecture test with an allowlist | code review only | `~/.claude/rules/architecture.md` fitness functions |
| D7 evidence | unchanged-recorder baseline, then NaN-only diff | regenerate and diff once | AD-13; separates drift from change |

The one point the maintainer may overrule is D3: if they want NaN rows recordable, that is a later issue.
