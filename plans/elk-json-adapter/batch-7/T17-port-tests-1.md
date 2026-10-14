<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Port `EdgesTest`, `IdTest`, `GraphTest`, `LayoutOptionsTest`

**Agent:** typescript-pro · **Commit:** `test(T17): port the edges, id, graph and layout option tests`

## Context
19 of the 32 layout-free `graph.json.test` methods. Assertions are frozen (AD-13): ported unchanged.

## Task
Port, one TS file per Java/Xtend file, colocated in `src/graph/json/`:
`EdgesTest.xtend` (3), `IdTest.java` (7), `GraphTest.xtend` (5), `LayoutOptionsTest.xtend` (4).
Each file: header `Ported from <path>`; J10 setup (`unload()` + `getInstance()` in `beforeEach`);
Xtend multi-line strings as template literals verbatim; `JsonIOException` from `src/gson`;
`assertThrows(X, …)` → `expect(…).toThrow(X)`; Guava `CharMatcher.whitespace().removeFrom` →
a local helper in the test file that removes exactly the characters Guava's Javadoc lists for
`CharMatcher.whitespace()` (journal the list); tests without an assertion keep none.

## Write-set
`src/graph/json/{EdgesTest,IdTest,GraphTest,LayoutOptionsTest}.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/{EdgesTest,GraphTest,LayoutOptionsTest}.xtend`, `IdTest.java`
- `src/graph/json/ElkGraphJson.ts` (T15), `../decisions.md#j10--test-setup`

## Interface contract
None consumed later.

## Acceptance criteria
- Given the 19 methods, then each is ported with assertions unchanged and passes.
- Given `LayoutOptionsTest.exportLayoutOptions`, then the whitespace-stripped export equals
  `{"id":"n0","layoutOptions":{"elk.direction":"UP"}}` exactly.
- Given the files, then no skipped or placeholder tests.

## Quality bar
README gates; stop 10 if any assertion would need to change.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No source edits; a failing ported test is a diagnosis of the port (stop 8 if undiagnosable).
