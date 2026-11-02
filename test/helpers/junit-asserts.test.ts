// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { addNode, addPort } from './lgraph-builders.js';
import { expectSameElements } from './junit-asserts.js';

describe('expectSameElements', () => {
  it('passes for the same objects in the same order', () => {
    const graph = new LGraph();
    const first = addNode(graph);
    const second = addNode(graph);
    expect(() => expectSameElements([first, second], [first, second])).not.toThrow();
  });

  it('passes for two empty sequences', () => {
    expect(() => expectSameElements([], [])).not.toThrow();
  });

  it('consumes a one-shot iterable once', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const ports = [addPort(node), addPort(node)];
    function* generate(): Generator<(typeof ports)[number]> {
      yield* ports;
    }
    expect(() => expectSameElements(generate(), ports)).not.toThrow();
  });

  it('fails for a structurally equal but distinct object', () => {
    const graph = new LGraph();
    const original = addNode(graph);
    const lookAlike = addNode(graph);
    original.id = 0;
    lookAlike.id = 0;
    // the two nodes are deeply equal field by field, and still not the same node
    expect(lookAlike).toEqual(original);
    expect(() => expectSameElements([lookAlike], [original])).toThrow();
  });

  it('fails for a reordering', () => {
    const graph = new LGraph();
    const first = addNode(graph);
    const second = addNode(graph);
    expect(() => expectSameElements([second, first], [first, second])).toThrow();
  });

  it('fails when the actual sequence is shorter', () => {
    const graph = new LGraph();
    const first = addNode(graph);
    const second = addNode(graph);
    expect(() => expectSameElements([first], [first, second])).toThrow();
  });

  it('fails when the actual sequence is longer', () => {
    const graph = new LGraph();
    const first = addNode(graph);
    const second = addNode(graph);
    expect(() => expectSameElements([first, second], [first])).toThrow();
  });
});
