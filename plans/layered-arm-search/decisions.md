<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-arm-search: decisions

Carried in unchanged: AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), the arm keying of
`plans/layered-compound/unreached.md` § Measurement, the reference platform of #52 (macOS arm64, JDK 21.0.1), and the
maintainer ruling in the body of #59 (2026-11-13).

## Auto-confirmed (unattended)

`/plan-mission --unattended` planned this on 2026-11-21. Each decision gives the options it rejected and the evidence,
so the maintainer can audit it.

### D1

**Where the rows go: append to the existing recorders.**

- The crossing-min arms (T3, T4) go in `tools/vectors/LayeredOrderVectors.java`, through its `SCENARIOS` mechanism:
  the `scenarios/<class>/<name>` and `sites/<class>/<name>` ids at `LayeredOrderVectors.java:2081`. The ref is
  `layered-order.json`.
- The north/south arms (T2) go in `tools/vectors/LayeredCompoundVectors.java`, in `SITE_ROWS` (`:2886-2906`), as `run`
  rows. The ref is `layered-compound.json`.
- A crossing-min input that needs a nested graph goes to compound `SITE_ROWS` as a `run` row (outcome 1). An example
  is a compound dummy without `MODEL_ORDER` ([arms.md](arms.md), arms 15-17). The order recorder imports flat levels
  only (`LayeredOrderVectors.java:24-27`).
- Both recorders already import inline ELK JSON. Their replay tests (`LayeredOrderVectors.test.ts`,
  `LayeredCompoundSites.test.ts`) replay every row with no per-row code. Neither recorder gains a new step kind or row
  kind.
- Evidence:
  - The issue says "curated rows through the recorder".
  - The fourth north/south arm is already reached by compound `sites/OrthogonalEdgeRouter/extPortSelfLoop/*` rows (7h
    Sc14).
  - The 7c rows that reached the neighbouring comparator arms are order `scenarios`/`sites` rows.
  - Both refs are far from the 16 MiB cap: 3.76 MB and 12.24 MB at planning.
- The issue's "existing refs stay byte-identical" is read as **every existing row byte-identical**, which the D5
  id-keyed diff proves. This is how #55's mission read the same constraint (`plans/layered-loops-evidence/decisions.md`
  D3), and queue gate 7 allows a ref the brief names.
- Rejected:
  - (a) A new recorder with a new ref and a new replay test. That duplicates two replay stacks for at most 25 rows.
  - (b) A second output file from the same recorders. It needs recorder, script and loader changes for no gain over
    the D5 proof.
  - (c) The routing recorder for the north/south rows. It also runs the hierarchical port router, but the
    extPortSelfLoop precedent and the arm table of D6 are in the compound recorder.

### D2

**The search harness: `tools/arm-search/`, scratch instrumentation of the oracle, and TypeScript generators.**

- `instrument.sh <JavaSource>... -- <outDir>`:
  - copies each named source file from the oracle worktree (`~/git/knowvah/elk-oracle/plugins/...`) to
    `$TMPDIR/layered-arm-search/instr/src`, where the caller adds `System.err` logging lines (kept as a `.patch` next to
    the generator that uses it);
  - compiles the copy with `javac` against the classpath of `tools/vectors/layered-order-vectors.sh` (its
    `build_classpath`);
  - prints a classpath with `<outDir>` first.
- The oracle worktree and `~/git/knowvah/elk` are only read. Instrumentation patches live under
  `tools/arm-search/<group>/instrument/`. They are not oracle patches (AD-3), and no script applies them anywhere but
  the scratch copy.
- Corpus logging runs the existing sweeps with that classpath and a scratch output directory: `ORDER_SWEEP_DIR`, and the
  equivalent for the compound and routing sweeps. They never write `test/corpus/.order-sweep`.
- Generators are TypeScript run with `npx tsx`, so `tools/**/*.ts` typechecks them, with an SPDX header. Each takes an
  explicit seed and writes inline ELK JSON candidates. A candidate is screened on the TS side first: a scratch vitest
  config outside the repo replays a pseudo-row through the order or compound replay helpers, with coverage of the arm.
  It is then confirmed on the oracle with a single-file probe or a filtered recorder run.
- Commit only the generators, scripts and instrumentation patches that produced a recorded row or back a proof or an
  outcome-4 record. Every committed file is CodeQL-, prettier- and complexity-clean.
- Rejected:
  - (a) Editing logging into the oracle worktree and rebuilding: forbidden by the issue and the queue rules.
  - (b) A Java agent or bytecode rewriting: a dependency question, and slower to write than a copied source file.
  - (c) Generators in Java: the TS screen must replay the port anyway.

### D3

**What each outcome means for a row.**

- **Outcome 1, reached through layout:** an order row whose steps are only `importGraph`, `normalise`, real phases
  and the processors a pipeline runs, in `IntermediateProcessorStrategy` order up to the stop (the `scenarios/` shape
  of `LayeredOrderVectors.java:125-130`). A compound `run` row (a full layout of an inline graph) also counts.
- **Outcome 2, reached by site scenario only:** an order row whose steps build state: `layers`, `setProperty`,
  `reverseEdge`, or a processor out of pipeline order. Each outcome-2 arm says whether a real layout could produce
  that state, as the issue asks.
- **Outcome 3, proven dead:** an argument from the Java text, citing lines and the invariant that excludes the arm, in
  the style of `plans/layered-compound/unreached.md` (H8 4 table). A proof that rests on JVM sort or hash order says so
  ([stop 8](stop-conditions.md)).
- **Outcome 4, unreached (not proven dead):** the group's budget is spent. Record what was tried and the closest the
  search came: the input, and which guard conjunct failed.
- An input that reaches the arm on the oracle but makes the oracle throw is outcome 1 with the throw pinned by a probe,
  as #55 did (`.agent-notes/layered-loops-evidence.md`, spline observation). No row is recorded for it. The test file
  that would pin the TS throw is outside the write-set, so file a `follow-up` issue for that pin.

### D4

**Budget and order of work: 4 h wall clock per group, the three groups in parallel, proof first.** The total is
12 h, the issue's cap. For each arm, the agent first writes the guard's full precondition from the Java and checks
whether an invariant excludes it, which is cheap. If one does, that is outcome 3. Otherwise it builds the input
backward from the guard. A group stops early when every arm in it has an outcome. When the budget runs out, the open
arms are outcome 4.

- Evidence: the issue sets 4 h per group and lets the planner split differently without raising the total. The groups
  share no class.
- Rejected: one sequential search of 12 h. The groups are independent, and parallel runs keep the mission's wall clock
  near 5 h.

### D5

**Each ref changes only by appended rows. An id-keyed diff checks it, and the new rows have a byte budget.**

- The diff is a scratch script that compares base and new by row id. Every base row must be byte-equal (compact JSON)
  and in its order. Every new id must be under `scenarios/`, `sites/` (order) or `sites/` (compound), and the header
  may differ only in `rowCounts`.
- Budget: at most 250 KB of new rows per ref. Where several candidates reach the same arm, keep the smallest graph.
- Each regeneration runs by script (`layered-order-vectors.sh`, `layered-compound-vectors.sh`) and is journaled with
  the oracle stamp (`8bca22f4` + 0001-0004). The recorders' own checks stay as they are: double build, byte identity,
  `MAX_BYTES`.

### D6

**Per-row arm proof: the existing compound arm table, and a new order table checked by the same tool.**

- The north/south rows add entries to `test/helpers/layered-compound-site-arms.json`. Its structural test
  (`LayeredCompoundSites.test.ts:61`) and `tools/vectors/compound-site-arms.mjs` cover them unchanged.
- The order rows get `test/helpers/layered-order-search-arms.json`, with the same shape: row id → `[{file, line, arm}]`.
  `compound-site-arms.mjs` gains optional `--table <file>`, `--test <file>` and `--title <suffix>` flags. The order
  test titles are `<id>: replays the recorded result` (`LayeredOrderVectors.test.ts:46`), not `<id>`. Without flags the
  tool behaves exactly as now.
- One structural test for the new table goes in `LayeredOrderVectors.test.ts`, modelled on the compound one: ids exist,
  files and lines exist, v8 arm forms. It is a new test; no existing assertion changes.
- Rejected: a copy of the tool for the order rows (about 60 duplicated lines).

### D7

**No production `src/` change.** The 25 arms stay verbatim (CLAUDE.md, "The Java is sacred"; the issue's boundary).
A new row that the port replays differently from the oracle is a discrepancy. Diagnosis mode applies: instrument both
sides and find the first divergence. Then follow [stop 2](stop-conditions.md): file a `follow-up` issue with the
diagnosis artifact, keep the row out of the ref, and record the arm as "reached on the oracle; port diverges, #N".

### D8

**Closing the hand-offs.**

- Each of these gets one appended journal row that points at the new `unreached.md` section:
  `plans/layered-crossing-min-tests/decision-journal.md` (C3), `plans/layered-loops-wrapping-compaction/decision-journal.md`
  (7g), and `plans/layered-compound/decision-journal.md` (stop 8 / #59).
- No earlier line is edited. `docs/conformance.md` gets the outcome-3 and outcome-4 arms in its layered coverage
  section.

### D9

**Arms outside the 25.** A probe or row that happens to take another arm listed as untaken in an earlier map is noted
in the new `unreached.md` section, with the row id and the earlier map's line. It is not searched for, and no earlier
classification is edited.

### D10

**Subject:** `test(layered): search the 25 arms 7h left unreached` (50 characters). Footer `Refs: #59`.
