<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: the DOT model

**Owner:** subagent (`claude`, opus). **Budget:** 60 min. **Commit:** `feat(graphviz-dot): port the dot model`.

## Context

The model is EMF-generated from `GraphvizDot.xtext` (`src-gen/org/eclipse/elk/alg/graphviz/dot/dot/`): 14 interfaces with
`impl/*Impl.java`, three EMF enums, `DotFactory`, `DotPackage`, `DotSwitch`, and `DotAdapterFactory`. The ElkGraph port
(AD-11, `plans/elkgraph-model/`, `src/graph/`) is the pattern for plain classes with Java accessor names. Statement subtypes
follow the grammar's inheritance (`Statement` is the supertype of `NodeStatement`, `EdgeStatement`, `AttributeStatement`,
`Attribute` and `Subgraph`).

## Write-set

`src/alg/graphviz/dot/dot/*.ts` (one file per interface: the class implements it in the same file, as the ElkGraph port does),
`EdgeOperator.ts`, `GraphType.ts`, `AttributeType.ts`, `DotFactory.ts`, `DotPackage.ts` (feature literals only, D1),
`util/DotSwitch.ts`, and colocated tests.

## Read-set

`src-gen/.../dot/**` (types, defaults, `eGet` feature lists, enum literals and values, `toString` only if a caller uses it);
`transform/DotImporter.java:120-200` (how `DotSwitch` is used); `formatting2/GraphvizDotFormatter.xtend` (which `DotPackage`
literals are named); `src/graph/ElkNode.ts` and its siblings (pattern); `src/xtext/formatting2/regionaccess/FeatureRef.ts`.

## Steps

1. Tests first: defaults of every attribute (EMF: `null` for `String`, `false` for `strict`, the first literal for enums); each
   enum's `get(String)` by literal and by name, `get(int)`, `getLiteral`, `getName`, `getValue`; that `DotFactory.eINSTANCE`
   creates each class; and that `DotSwitch.doSwitch` dispatches each class to its `caseX` and falls back to `defaultCase` as
   the generated switch does (the supertype chain).
2. Port the classes. Containment lists are arrays owned by the parent. Port no EMF notification, proxy or `eContainer`
   machinery unless a caller in this bundle or `src/xtext` needs it. If the serializer or the formatter needs a container or
   feature lookup, add only that, with a comment naming the caller.
3. `DotPackage.Literals`: `FeatureRef` constants for the features the formatter and sequencers name. T8 may ask for more;
   the orchestrator adds them.

## Acceptance criteria

- Given a fresh `DotFactory.eINSTANCE.createGraph()`, when read, then `isStrict()` is false, `getType()` is
  `GraphType.GRAPH`, `getName()` is null and `getStatements()` is empty, as `GraphImpl` declares.
- Given `EdgeOperator.get('->')`, when called, then it returns `DIRECTED` with value 0 and name `directed`. `get('x')` returns
  null.
- Given each concrete class, when passed to `DotSwitch.doSwitch` with only `defaultCase` overridden, then `defaultCase` is
  reached. When `caseStatement` is overridden too, then the five statement kinds reach it.

**Observability:** N/A. **Rollback:** reversible (new files).
