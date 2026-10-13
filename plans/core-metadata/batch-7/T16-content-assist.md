<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — `LayoutDataContentAssist`

**Agent:** typescript-pro · **Commit:** `feat(T16): add layout data content assist`

## Context
Prefix-matching proposals for option ids, algorithm ids and option values, used by editors (and by
the deferred `*.text.ide` bundles later). Its JUnit test has a parameterised class
(`LayoutOptionsPrefixes`, 11 rows) and `Other` (4 cases). Two `Other` cases need the held-back
`Box/FixedLayouterOptions` and are deferred to mission 5 unchanged (C10).

## Task
TDD. Port the class with its nested `Proposal` (C3; three `of` overloads per §6.5),
`getLayoutOptionProposals`, `getLayoutAlgorithmProposals`, `getLayoutOptionValueProposals`, the
private matching helpers (`matchesPrefix`, `startsWith`, …) and `getAlgorithm`/`getRelevantNode`.
Streams and `Optional` follow translation-rules §6.9 (eager arrays; order preserved). Port
`LayoutDataContentAssistTest`: the 11 parameterised rows as `it.each`, `testParentNodes`,
`testOptionGroupIsAdded`; record `testAlgorithmSpecificKnown`/`Unknown` as **not ported** in a header
comment naming C10 (no skipped or placeholder test bodies). `@Before` registers `CoreOptions` as in
the Java. EMF `EClass` lookup in the parameterised test uses `ElkGraphPackage.eINSTANCE` /
`ElkGraphFactory.eINSTANCE` from mission 2.

## Write-set
`src/core/data/LayoutDataContentAssist.ts`, `src/core/data/LayoutDataContentAssist.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutDataContentAssist.java`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/data/LayoutDataContentAssistTest.java`
- `src/core/data/LayoutMetaDataService.ts` (T14), `src/graph/ElkGraphPackage.ts`, `docs/translation-rules.md` §6.9
- `../decisions.md#c10--deferred-junit-cases`

## Interface contract
`class LayoutDataContentAssist { static readonly Proposal; static getLayoutOptionProposals(element, prefix);
static getLayoutAlgorithmProposals(prefix); static getLayoutOptionValueProposals(optionData, prefix);
static getAlgorithm(element) }` — exact Java signatures.

## Acceptance criteria
- Given the 11 `LayoutOptionsPrefixes` rows, then each expected option is among the proposals.
- Given `testParentNodes` and `testOptionGroupIsAdded`, then they pass with assertions unchanged.
- Given `getLayoutOptionValueProposals` for an enum option and an `EnumSet` option with a prefix,
  then the proposals and their order follow the Java branches.
- Given the test file header, then it names the two deferred cases and C10.

## Quality bar
README gates; ≥ 95% coverage; functions ≤ 30 NLOC, CCN ≤ 10; `@see` on the class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not port the two deferred cases in any form (C10); do not add algorithms to the service.
