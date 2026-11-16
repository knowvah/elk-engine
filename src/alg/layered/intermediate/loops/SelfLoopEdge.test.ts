// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LLabel } from '../../graph/LLabel.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

/** A node with one port pair joined by one self loop; returns the installed holder's only edge. */
function singleLoop() {
  const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
  const lNode = lGraph.getLayerlessNodes()[1]!;
  SelfLoopTestGraphCreator.ports(lNode, 0, 1, 0, 0);
  const lEdge = SelfLoopTestGraphCreator.edge(lNode.getPorts()[0]!, lNode.getPorts()[1]!);
  const holder = SelfLoopHolder.install(lNode);
  const slEdge = [...holder.getSLHyperLoops()[0]!.getSLEdges()][0]!;
  return { lNode, lEdge, holder, slEdge };
}

describe('SelfLoopEdge', () => {
  it('represents its edge and registers itself with the source and target port', () => {
    const { lEdge, slEdge } = singleLoop();
    expect(slEdge.getLEdge()).toBe(lEdge);
    expect(slEdge.getSLSource().getLPort()).toBe(lEdge.getSource());
    expect(slEdge.getSLTarget().getLPort()).toBe(lEdge.getTarget());
    expect(slEdge.getSLSource().getOutgoingSLEdges()).toEqual([slEdge]);
    expect(slEdge.getSLTarget().getIncomingSLEdges()).toEqual([slEdge]);
  });

  it('belongs to the hyper loop that collected it', () => {
    const { holder, slEdge } = singleLoop();
    expect(slEdge.getSLHyperLoop()).toBe(holder.getSLHyperLoops()[0]);
  });

  it('is inline exactly when one of its labels sets edge-labels.inline', () => {
    const { lEdge, slEdge } = singleLoop();
    expect(slEdge.isInline()).toBe(false);
    const plain = new LLabel('a');
    const inline = new LLabel('b');
    inline.setProperty(LayeredOptions.EDGE_LABELS_INLINE, true);
    lEdge.getLabels().push(plain);
    expect(slEdge.isInline()).toBe(false);
    lEdge.getLabels().push(inline);
    expect(slEdge.isInline()).toBe(true);
  });

  it('getLabelSide reads the side of its hyper loop labels and throws without them', () => {
    const { lEdge, slEdge } = singleLoop();
    expect(() => slEdge.getLabelSide()).toThrow(TypeError);

    // a labelled loop: the labels object exists once an edge with labels is collected
    const labelled = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
    const lNode = labelled.getLayerlessNodes()[1]!;
    SelfLoopTestGraphCreator.ports(lNode, 0, 1, 0, 0);
    const labelledEdge = SelfLoopTestGraphCreator.edge(lNode.getPorts()[0]!, lNode.getPorts()[1]!);
    labelledEdge.getLabels().push(new LLabel('x'));
    const holder = SelfLoopHolder.install(lNode);
    const slLabelledEdge = [...holder.getSLHyperLoops()[0]!.getSLEdges()][0]!;
    expect(slLabelledEdge.getLabelSide()).toBeNull();
    slLabelledEdge.getSLHyperLoop()!.getSLLabels()!.setSide(PortSide.NORTH);
    expect(slLabelledEdge.getLabelSide()).toBe(PortSide.NORTH);
    expect(lEdge.getLabels()).toHaveLength(0);
  });
});
