<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Comment scenario recorder (R6, R7)

**Agent:** java-architect (sonnet) · **Commit:** `test(T14): record comment attachment oracle scenarios`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `comments/*` has no Java tests and nothing in ELK calls it, so the oracle is its only behavioural
spec (R6). This task records about 10 `CommentAttacher` scenarios on the source-built oracle; T19 replays them in TS.
- Pattern to follow: `tools/vectors/elkr-vectors.sh` (oracle classpath, `vector-cache.sh`, one `cache:` line per
  program) and the `Elkt*Vectors.java` recorders, if `.elkt` inputs are used.
- **Never edit `tools/vectors/vector-cache.sh`**, and never change a landed vector file.

## Task
1. **Scenario inputs** in `tools/vectors/comment-scenarios/`. Use `.elkt` (preferred: hand-written and readable;
   needs the Xtext standalone setup the `Elkt*` recorders use) or ELK JSON. Each scenario has:
   - a small graph with comment boxes (`commentBox: true`), labelled targets and sizes;
   - a declarative attacher configuration, from a fixed vocabulary that both the recorder and T19 implement:
     - `includeHierarchy` (`limitToCurrentHierarchyLevel`), `keepHeuristicsEnabledWithExplicitAttachments`;
     - the explicit provider: `none`, or `byLabelPrefix:<p>`, a recorder-defined explicit provider (keep it trivial
       and identical in TS);
     - the bounds provider: `ElkGraphBoundsProvider`, cached or not;
     - filters: `SizeFilter(maxArea)`, `TextPrefixFilter(prefixes, caseSensitive, requiredForEligibility, text=firstLabel)`;
     - matchers: `DistanceMatcher(maxDistance, normalization)`, `AlignmentMatcher(maxOffset, normalization)`,
       `NodeReferenceMatcher(fuzzy, maxDistance, text=firstLabel, name=firstLabel)`;
     - the decider: `AggregatedMatchDecider(aggregator: max|min|avg|sum, lowerBoundary, included)`.
2. **Coverage across the scenarios:** every matcher and filter, both normalization functions, fuzzy vs strict
   references (camelCase, whitespace, ASCII case), explicit attachments that disable or keep heuristics, hierarchy on
   and off, a comment that stays unattached, and a size-filtered comment.
3. **`tools/vectors/CommentVectors.java`:** for each scenario, load the graph, build the `CommentAttacher` from the
   configuration, run `attachComments(new ElkGraphDataProvider(root).cached())` (or uncached, per scenario), then read
   the created edges back as `[commentId, targetId]` pairs, sorted.
   - Run each scenario **twice** on fresh graphs. If the pairs differ, fail; that scenario has an identity-order tie
     and must be redesigned (R6, stop 8).
   - Design out ties: for each comment, keep the best and second-best normalized aggregates well apart. Log the margin
     in the JSON.
4. **`tools/vectors/comment-vectors.sh`:** a copy of the `elkr-vectors.sh` structure (oracle jars plus third-party
   bundles, cache namespace `comments`). It writes `test/golden/refs/java/comments.json`.
5. Run it twice; the output must be byte-identical. At least 8 usable scenarios are required (stop 8).

## Write-set
`tools/vectors/{CommentVectors.java,comment-vectors.sh}`, `tools/vectors/comment-scenarios/**`,
`test/golden/refs/java/comments.json`.

## Read-set
- `J/comments/*.java`, especially `CommentAttacher.java:106-437`, `AggregatedMatchDecider.java` and
  `NodeReferenceMatcher.java:90-180`.
- `tools/vectors/{elkr-vectors.sh,ElktParseVectors.java}`; `tools/vectors/vector-cache.sh` (read only).
- `.agent-notes/vector-cache-and-key-line.md`.
- `decisions.md#r6--comment-evidence`, `#r7--vector-tooling`.

## Interface contracts (outputs, consumed by T19)
```json
{ "jdk": "...", "oracle": "<commit>",
  "scenarios": [ { "name": "...", "input": "comment-scenarios/<file>", "config": { ... vocabulary above ... },
                   "attachments": [["comment1", "nodeA"], ...], "minMargin": 0.25 } ] }
```
The configuration vocabulary is documented at the top of `CommentVectors.java`. T19 implements exactly that
vocabulary.

## Acceptance criteria
- Given two consecutive runs, when the outputs are compared, then `comments.json` is byte-identical, and the second
  run is served from the cache.
- Given each scenario, when it runs twice inside one recording, then the attachments are identical, and each is
  free of ties per `minMargin`.
- Given the scenario set, when inspected, then it contains at least 8 scenarios and exercises every matcher, filter
  and decider option listed above.
- Given the recording, when `git status` runs, then no landed file under `test/golden/refs/java/` changed.

## Observability / Rollback
N/A — test tooling only. Reversible: revert the commit.
