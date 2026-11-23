---
title: Getting started
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Getting started

The examples on this page are real files in the repository. CI runs them and compares their output with Eclipse ELK
itself, so they work as shown.

## Install

```sh
npm install @knowvah/elk-engine
```

The package has no runtime dependencies and runs in Node 22 or newer and in the browser.

## Build a graph and lay it out

A graph is a tree of `ElkNode`s with `ElkEdge`s between them, exactly as in Eclipse ELK. `ElkGraphUtil` creates the
elements, `setProperty` sets layout options, and `RecursiveGraphLayoutEngine` computes the layout in place.

<<< @/../test/docs/examples/build-and-layout.ts

Three things to notice:

- **Sizes are yours.** The engine positions nodes; it does not measure them. Give every node (and every label) a width
  and a height.
- **Register the algorithm.** Java ELK finds algorithms with a `ServiceLoader`. This port has none: register the
  metadata provider of each algorithm you use, once, before the first layout. The core algorithms `fixed`, `box` and
  `random` need no registration.
- **The result is in the graph.** After `layout`, read `node.getX()`, `node.getY()` and each edge's
  `getSections()` for the route.

## The short way: `layout`

If you have [ELK JSON](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html) and want
it laid out, `layout` is one call. It takes the graph as an object or as JSON text, registers every algorithm itself, and
returns a promise of the laid-out graph. The graph you pass is not changed.

```ts
import { layout } from '@knowvah/elk-engine';

const laidOut = await layout({
  id: 'root',
  layoutOptions: { 'elk.algorithm': 'layered' },
  children: [
    { id: 'a', width: 40, height: 20 },
    { id: 'b', width: 40, height: 20 },
  ],
  edges: [{ id: 'e', sources: ['a'], targets: ['b'] }],
});
// laidOut.children[0].x, .y; laidOut.edges[0].sections[0].startPoint, .endPoint
```

A second argument, `{ layoutOptions: { 'elk.direction': 'DOWN' } }`, is merged over the root's `layoutOptions`. The work
runs inside the call; the promise is the stable contract. `layout` is the only function this package adds to ELK's own
API; everything else keeps its Java name. The test `src/layout.test.ts` checks it against the Eclipse ELK result.

## ELK JSON in, ELK JSON out, with the object model

If your graph is already [ELK JSON](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html),
`ElkGraphJson` reads and writes it. Layout options are plain strings there, so no enum needs importing.

<<< @/../test/docs/examples/json-roundtrip.ts

This is the input the test feeds it, a client talking to a server that contains two nodes:

<<< @/../test/golden/examples-inputs/json-roundtrip.json

## Another algorithm

Every ported algorithm is used the same way: register its provider and name it in `CoreOptions.ALGORITHM`. Here is
Mr. Tree laying out a small reporting tree.

<<< @/../test/docs/examples/tree-layout.ts

The algorithms and their option classes are listed in the [API reference](/reference/).

## How these examples are checked

Each file above has a twin graph that Eclipse ELK, built from the pinned Java source, laid out once. The test
`test/docs/examples.test.ts` runs the example and requires the same ids, the same structure, and coordinates within
`1e-6` of the Java result. See [Conformance](/conformance) for the full procedure.
