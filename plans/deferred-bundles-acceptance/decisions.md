<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: deferred-bundles-acceptance (issue #88)

Carried in unchanged: AD-1…AD-16 and the AD-4 amendment of 2026-11-13 (`plans/elk-engine-skeleton/decisions.md`), DB1-DB7
(`plans/deferred-bundles-adr/decisions.md`), conformance-corpus D0.

**The ruling, quoted (maintainer on #88, 2026-11-14):** "accept the ADR **amended**. `alg.libavoid`: no-go, out of scope, as the
ADR recommends. `alg.graphviz.dot` and `alg.graphviz.layouter`: **go**, inside `@knowvah/elk-engine`, ported faithfully with
`GraphvizTool`'s process replaced by an injected runner. The same functionality then comes from `@knowvah/dot-engine` through a
small adapter outside this package, so zero runtime dependencies and browser safety hold. […] The export, DOT parse and
`transferLayout` are deterministic ELK Java and meet AD-4 exactly. Only an end-to-end suite (pinned Graphviz 16.1.0 against the
dot-engine adapter) uses dot-engine's bar, as a stated AD-4 exception for that suite." Confirmed 2026-11-23: "good to go".
#95's body gives the bar's numbers: ±0.01 pt for `dot`, ±0.5 pt for `neato` and `fdp`.

## D0: scope: the acceptance is step 1 of #95

This mission does what accepting the ADR, as amended, changes in the repository: #95's step 1 ("Docs and decisions first"). #95
keeps steps 2-5 (the ports, the runner API, the adapter). T3 comments on #95 that step 1 has landed on `chore/issue-queue`.

## D1: the ADR keeps its analysis and gains a ruling

- Status line: `**Status:** Accepted, amended (ruling 2026-11-14, confirmed 2026-11-23). Proposed 2026-11-13. Issue: #88`.
- A `## Ruling (2026-11-14)` section after `## Decision`: a table of bundle → recommendation → ruling → where the work lives
  (`alg.libavoid` no-go → out of scope; the two Graphviz bundles no-go → in scope, #95), the injected-runner rationale in the
  maintainer's terms, and the AD-4 exception for the end-to-end suite.
- `## Decision` and the evidence summary stay as written, under a one-line note that they are the Proposed analysis.
- `## Consequences` becomes what this mission did (pointing at AD-17, CLAUDE.md, inventory, port-map, bundle-deps) and what #95
  does. Keep "Revisit when" for `alg.libavoid` only; the Graphviz triggers are moot.
- Record that the three bundles are unchanged between the ADR's evidence pin `8aaa3c14` and the pin `8bca22f4` (empty
  `git log` on their paths), so the evidence still holds. Refresh the fitness-test line numbers the ADR cites.

## D2: AD-17 records the ruling, verbatim in substance

Append `## AD-17: Deferred algorithm bundles (maintainer ruling 2026-11-14, #88)` at the end of
`plans/elk-engine-skeleton/decisions.md`, after the AD-4 amendment. It states:

1. `alg.libavoid` is out of scope (ADR evidence LA-3, LA-7, LA-8, LA-11, LA-12).
2. `alg.graphviz.dot` and `alg.graphviz.layouter` are in scope, ported faithfully; `GraphvizTool`'s process becomes an injected
   runner (DOT text and algorithm in, DOT text out). How it is injected is new API to settle with the maintainer under #95;
   module-level mutable state is not an option (AD-8).
3. Zero runtime dependencies and browser-safe `src/` hold: the dot-engine adapter lives outside the package.
4. AD-4 exception, for one suite only: the end-to-end suite (ELK with a pinned Graphviz 16.1.0 against elk-engine plus the
   dot-engine adapter) uses dot-engine's bar, ±0.01 pt for `dot` and ±0.5 pt for `neato` and `fdp`. Export, parse and
   `transferLayout` stay at 1e-6. The exception enters `docs/conformance.md` with the suite (#95).
5. It amends the `## Bundle scope` table above: the "Deferred" row now holds only the three `.ide` bundles (as CLAUDE.md lists
   them). The table itself is not edited.

## D3: the bundle table adopts both Graphviz bundles now

Add `'alg.graphviz.dot'` and `'alg.graphviz.layouter'` to `IN_SCOPE_SUFFIXES` and name AD-17 in its comment, then regenerate with
`npx tsx tools/bundle-deps.ts --write`. CLAUDE.md's "In scope" list and `IN_SCOPE_SUFFIXES` then agree, which is how #42 and
conformance-corpus D0 defined adoption. The regeneration must add exactly the two keys below and change nothing else (stop 5).

Expected values, from the manifests at `8bca22f4` read at planning (`git -C ../elk show 8bca22f4:plugins/<bundle>/META-INF/MANIFEST.MF`;
the out-of-scope requires are filtered by `buildBundleDeps`). They are written into the test before the suffixes change (TDD; AD-13
freezes them):

| Key | `bundle` | `requires` |
| --- | --- | --- |
| `src/alg/graphviz/dot` | `org.eclipse.elk.alg.graphviz.dot` | `['src/core', 'src/graph']` |
| `src/alg/graphviz/layouter` | `org.eclipse.elk.alg.graphviz.layouter` | `['src/alg/graphviz/dot', 'src/core', 'src/graph']` |

The committed table then has 18 keys (16 at planning). The new block, `describe('graphviz bundles (AD-17)')`, after the grammar
block, asserts: the two entries above; `bundleOf('src/alg/graphviz/layouter/X.ts')` is `src/alg/graphviz/layouter`; a layouter
file importing `../dot/Y.js` gives no violation; a dot file importing `../layouter/Y.js` gives exactly
`src/alg/graphviz/dot/X.ts -> src/alg/graphviz/layouter/Y.ts: src/alg/graphviz/dot may not import src/alg/graphviz/layouter`;
`unmappedFile('src/alg/libavoid/X.ts')` and `unmappedFile('src/alg/graphviz/X.ts')` are each `<file>: unmapped directory`.

**Rejected:** leaving the suffixes to #95. CLAUDE.md would call the bundles in scope while the fitness test rejects any file under
them, and the ADR's own "go" path names these steps.

## D4: CLAUDE.md, inventory and port-map

- **CLAUDE.md.** § Mission: `AD-1…AD-17`. § ELK Source Map: add `alg.graphviz.dot — ELK Graphviz Dot Language Parser` and
  `alg.graphviz.layouter — ELK Layout Bridge for Graphviz (Graphviz process replaced by an injected runner; AD-17)` to "In scope"
  (the purposes are the `Bundle-Name` headers at the pin); "Deferred" keeps only the three `.ide` bundles; "Out of scope" gains
  `alg.libavoid` (client of an external C++ routing server; AD-17). § Verification: one sentence that AD-17 exempts the planned
  Graphviz end-to-end suite from 1e-6. No other line changes.
- **inventory.md.** Rows 38-40: libavoid `Out`; the Graphviz rows `In`, rationale "in scope by AD-17; port tracked by #95". The
  legend says In = in scope (ported, or tracked by a named issue). The counts line becomes 18 In, 3 Deferred, 2 Reference, 9 Out
  (= 32). Recount from the table; a different total is stop 6.
- **port-map.md.** The `:618-630` paragraph: libavoid joins the out-of-scope list; the Graphviz bundles are in scope by AD-17, not
  yet ported (#95); the "proposed … until the maintainer rules" sentence becomes the accepted ruling. Extend the mission-mapping
  note: `bundle-deps.json` gained both Graphviz bundles under #88, before any port.

## D5: out of scope

Named in the README. Also: `tools/oracle/java-tests.sh:33-35` (its comment stays true: `alg.graphviz.layouter` is still not an
oracle jar); `shared.test`; the LGPL question for libavoid (moot under no-go).

## D6: issue traffic

T3 comments on #88 (what landed, the commit, the four points of AD-17) and on #95 (step 1 is done on the branch; steps 2-5
remain; the runner-API question still waits for the maintainer). No label changes by the executor; #88 closes when the branch
merges.

## Auto-confirmed (unattended)

Planning ran `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-24 and took these without a person:

- **Issue selection:** #88 is the lowest-numbered open `queue:ready` issue; no `queue:planned` issue was open; #88 has no
  "Blocked by" line. Its last label-relevant comment is the maintainer's 2026-11-23 "good to go".
- **D0, scope.** Options: (a) do #95's step 1 as the acceptance (chosen); (b) only flip the ADR's status line, leaving CLAUDE.md
  and the AD rows contradicting the ruling until #95 runs; (c) park #88 because the 11-14 comment lists the edits under #95.
  (c) was rejected because the maintainer re-readied #88 after that comment, and (b) because the ADR's "On acceptance" list and
  #95 step 1 are the same edits, which do not need the port. Evidence: the #88 comments of 11-14, 11-21 and 11-23; #95 § Scope 1.
- **D1-D4** follow from the ruling's text and #95 § Scope 1; the expected values in D3 come from the pinned manifests.
- **Not parked:** the decision reserved for the maintainer (the scope and the AD-4 exception) was made by the maintainer in a
  signed comment; this mission records it and decides nothing new. The change is reversible and touches no published API.
