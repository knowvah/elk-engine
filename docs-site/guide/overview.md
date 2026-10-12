---
title: Overview
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overview

`@knowvah/elk-engine` is a faithful TypeScript port of the [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), the Java graph-layout library. There is no Java and no
WASM: the layout algorithms are re-implemented in plain TypeScript and verified against the Java
implementation.

::: warning Pre-alpha
No layout algorithm is ported yet. The repository holds the toolchain, the architecture documents,
the verification scaffolding, and the Java runtime shims. `src/index.ts` exports nothing public yet.
See the [roadmap](/guide/roadmap) for the order in which algorithms arrive.
:::

## The Java is the specification

The Java source at the pinned ELK commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` is the canonical
specification. The port follows it closely:

- Algorithms are not optimized or simplified. If the Java looks redundant, the redundancy is kept.
- Every branch is ported, and method boundaries are kept unless TypeScript forces a change.
- The JUnit tests are ported alongside the code they test.
- Java runtime behavior that ELK relies on (32-bit integer arithmetic, `HashMap` iteration order,
  `Random` sequences) is reproduced by shims. See [Java foundations](/guide/java-foundations).

The [translation rules](/guide/translation-rules) list how each Java concept maps to TypeScript.

## Verification against an oracle

The oracle is upstream ELK built from source, in a detached git worktree at the pinned commit.
Outputs of the port are compared with the oracle's outputs:

- Ids, element counts, edge-section topology, bend-point counts, and non-numeric values must match
  exactly.
- Numeric coordinates and sizes must match within an absolute tolerance of `1e-6`.

Curated oracle outputs are committed as golden references, so running the tests needs no JVM. The
full procedure is on the [conformance](/conformance) page.

## Public contract

The public API will be the ElkGraph object model plus the `ElkGraphUtil` factories. ELK JSON is an
I/O adapter, not the core model. The first npm publish freezes this surface.

## Runtime constraints

- `src/` is browser-safe: no Node built-ins, no `process.env`, ES modules only.
- There are zero runtime dependencies.

## Where to go next

- [Architecture](/guide/architecture): how the oracle, the bundles, and the layout engine fit
  together.
- [Port map](/guide/port-map) and [inventory](/guide/inventory): which Java packages map to which
  modules.
- [Contributing](/guide/contributing): gates and workflow.
