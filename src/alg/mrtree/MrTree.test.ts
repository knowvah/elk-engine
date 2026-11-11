// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { registerMrTree } from '../../../test/helpers/mrtree-replay-state.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { TGraph } from './graph/TGraph.js';
import { MrTree } from './MrTree.js';

/** A progress monitor whose whole tree reports cancellation (JUnit-free stand-in for a user abort). */
class CanceledMonitor extends BasicProgressMonitor {
  override isCanceled(): boolean {
    return true;
  }
  protected override doSubTask(): BasicProgressMonitor {
    return new CanceledMonitor();
  }
}

/** A monitor that has no sub task to give (`subTask` returns null, as for a closed monitor). */
class NoSubTaskMonitor extends BasicProgressMonitor {
  override subTask(): IElkProgressMonitor | null {
    return null;
  }
}

/** A parent with one child, imported as the provider does (initial centres at (10,5) and (10,5)). */
function parentAndChild(): { readonly tGraph: TGraph; readonly positions: () => number[][] } {
  registerMrTree();
  const root = ElkGraphUtil.createGraph();
  const a = ElkGraphUtil.createNode(root);
  const b = ElkGraphUtil.createNode(root);
  for (const node of [a, b]) {
    node.setDimensions(20, 10);
  }
  ElkGraphUtil.createSimpleEdge(a, b);
  const tGraph = new ElkGraphImporter().importGraph(root);
  return {
    tGraph,
    positions: () => [...tGraph.getNodes()].map((node) => [node.getPosition().x, node.getPosition().y]),
  };
}

describe('MrTree.doLayout', () => {
  it('runs the assembled processors and returns the graph it was given', () => {
    const { tGraph, positions } = parentAndChild();
    const before = positions();
    expect(new MrTree().doLayout(tGraph, new BasicProgressMonitor())).toBe(tGraph);
    expect(positions()).not.toEqual(before);
  });

  it('creates its own monitor when the sub task is null and still lays out', () => {
    const { tGraph, positions } = parentAndChild();
    const expected = (() => {
      const other = parentAndChild();
      new MrTree().doLayout(other.tGraph, new BasicProgressMonitor());
      return other.positions();
    })();
    new MrTree().doLayout(tGraph, new NoSubTaskMonitor());
    expect(positions()).toEqual(expected);
  });

  it('stops before the first processor when the monitor is canceled', () => {
    const { tGraph, positions } = parentAndChild();
    const before = positions();
    new MrTree().doLayout(tGraph, new CanceledMonitor());
    expect(positions()).toEqual(before);
  });
});
