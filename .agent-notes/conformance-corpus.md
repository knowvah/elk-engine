<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — conformance-corpus (2026-10-11)

Planning-time notes are in `conformance-corpus-planning.md`.

## Observation: no Maven 3.9 on the dev machine
- **Context**: T3, refreshing `oracle-build.json` for the D0 jars.
- **Finding**: Maven is installed via Homebrew at 3.10.0 (user-confirmed); no 3.9 exists; the Tycho build needs 3.9.x. The jars
  were already built, so `tools/oracle/build.sh --record-only` rewrites the manifest without Maven.
- **Impact**: A real oracle rebuild (new ELK commit or patch) needs a 3.9 Maven via `ELK_MVN`.
- **Confidence**: High

## Observation: Xtext standalone `.elkt` loading needs equinox.common
- **Context**: T3 classpath for `ElkGraphStandaloneSetup.doSetup()`.
- **Finding**: Guice reflection loads `org.eclipse.core.runtime.OperationCanceledException`, so
  `org.eclipse.equinox.common` must be on the classpath though no manifest-derived list names it.
  Guice 5+ works with `jakarta.inject-api` from the p2 cache, no `javax.inject` jar. Syntax errors
  land in `resource.getErrors()`; `getResource` does not throw. First `.elkt` case pays ~0.5 s setup.
- **Impact**: Any future JVM harness reading `.elkt` needs the same bundle set.
- **Confidence**: High

## Observation: an existing fitness test used graph.text as its out-of-scope example
- **Context**: T2, adding D0 bundles to `IN_SCOPE_SUFFIXES`.
- **Finding**: `module-boundaries.fitness.test.ts` "keeps only in-scope ELK bundles" filtered
  `graph.text`; D0 put it in scope. User approved swapping the fixture to `core.service`.
- **Impact**: Scope changes can invalidate fixtures that name concrete bundles; check before
  widening scope again.
- **Confidence**: High
