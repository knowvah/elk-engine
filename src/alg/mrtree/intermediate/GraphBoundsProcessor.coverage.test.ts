// SPDX-License-Identifier: EPL-2.0
// The empty-graph arm of GraphBoundsProcessor (mission 8a, T19): `stream().mapToDouble(..).min().getAsDouble()` on an empty
// stream throws NoSuchElementException ("No value present"), GraphBoundsProcessor.java:34-37. Unreachable through the pipeline (a
// component always has a node); the Java-traced statement is asserted directly.
import { describe, expect, it } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { TGraph } from '../graph/TGraph.js';
import { GraphBoundsProcessor } from './GraphBoundsProcessor.js';

describe('GraphBoundsProcessor on an empty graph (GraphBoundsProcessor.java:34-37)', () => {
  it('throws NoSuchElementException from the first getAsDouble', () => {
    expect(() => {
      new GraphBoundsProcessor().process(new TGraph(), new NullElkProgressMonitor());
    }).toThrow(NoSuchElementException);
  });
});
