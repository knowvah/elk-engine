<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: C1 one `.elkj` scope-provider wiring (typescript-pro)

**Goal:** the `ElkGraphJsonScopeProvider`-over-local-scope wiring is built in one place, the linking bundle, and the
serializer takes it from there instead of duplicating it (D8).

## Context

`createElkGraphJsonLinking` (`src/graph/json/text/linking/ElkGraphJsonLinkingServices.ts:74-100`) and
`createSemanticSequencer` (`src/graph/json/text/serializer/ElkGraphJsonSerializer.ts:18-50`) both build a
`DefaultQualifiedNameConverter`, a `ResourceScopeCache`, an `ImportedNamespaceAwareLocalScopeProvider` over
`SingleResourceGlobalScopeProvider` and `ElkGraphJsonQualifiedNameProvider`, wrapped in `ElkGraphJsonScopeProvider`.
Java binds `IScopeProvider → ElkGraphJsonScopeProvider` and its delegate once
(`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/AbstractElkGraphJsonRuntimeModule.java:166-173`);
the serializer's `@SerializerScopeProviderBinding` has no binding of its own.

## Write-set

- `src/graph/json/text/linking/ElkGraphJsonLinkingServices.ts` (+ test)
- `src/graph/json/text/ElkGraphJsonTextServices.ts` (+ test)
- `src/graph/json/text/serializer/ElkGraphJsonSerializer.ts`, `ElkGraphJsonCrossReferenceSerializer.ts` (+ tests)

## Read-set

- The four files above; `decisions.md#d8-one-scope-provider`
- Xtext 2.36.0: `DefaultRuntimeModule` (`IResourceScopeCache` binding and scope), `OnChangeEvictingCache`,
  `ImportedNamespaceAwareLocalScopeProvider`, `AbstractDeclarativeScopeProvider` (`@Singleton`?), the serializer's
  `CrossReferenceSerializer` injection point
- `src/xtext/util/ResourceScopeCache.ts` (what keys the cache, when it is cleared)

## Step 1: verify (D8), journal the finding before any edit

State, with file:line evidence: (a) whether Guice gives the linker and the serializer the same scope-provider instance
or two; (b) the Java scope cache's lifetime (singleton keyed by resource and evicted on change, or per instance);
(c) whether the TS `ResourceScopeCache` is keyed by resource. Then:

- Equivalent wiring (stateless providers, or the cache lifetime preserved): the linking bundle exposes the provider,
  as an instance or as a factory per call, whichever keeps today's cache lifetime for both load and serialize.
- The Java wires state that the shared TS object would change (e.g. a cache shared across a load and a later
  serialize where Java evicts it): stop 3.

## Acceptance criteria

- Given the change, when a `.elkj` graph is serialized, then the serializer's cross-reference scope comes from the
  linking bundle and `ElkGraphJsonSerializer.ts` no longer constructs `ImportedNamespaceAwareLocalScopeProvider`.
- Given every `.elkj` write, reparse, round-trip (`test/golden/elkj-roundtrip.test.ts`) and curated-ref test, then they
  pass unchanged.
- Given a load followed by a serialize of an edited graph, then cross-references resolve as before (a test pins the
  cache lifetime chosen in step 1).
- Given the commit, then typecheck, colocated tests and complexity pass; the `@see`s name the Java bindings.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.

## Commit

`refactor(T6): share the elkj scope provider wiring with the serializer`; body cites C1 and the step-1 finding.
