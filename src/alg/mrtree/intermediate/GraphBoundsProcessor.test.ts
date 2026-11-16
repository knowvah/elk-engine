// SPDX-License-Identifier: EPL-2.0
// Proof of GraphBoundsProcessor (mission 8a, T14): `process` from the recorded LevelCoordinatesProcessor stop to the recorded
// GraphBoundsProcessor stop for every row of the ref that runs it, plus Java-traced hand cases (GraphBoundsProcessor.java:31-45).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { GraphBoundsProcessor } from './GraphBoundsProcessor.js';

describe('GraphBoundsProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the GraphBoundsProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('GraphBoundsProcessor', () => new GraphBoundsProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
  });
});

describe('GraphBoundsProcessor hand cases', () => {
  it('sets the min of the positions and the max of position plus size', () => {
    const { g, nodes } = graphOf(2, []);
    nodes[0]!.getPosition().x = 3;
    nodes[0]!.getPosition().y = -4;
    nodes[0]!.getSize().x = 10;
    nodes[0]!.getSize().y = 2;
    nodes[1]!.getPosition().x = -1;
    nodes[1]!.getPosition().y = 8;
    nodes[1]!.getSize().x = 1;
    nodes[1]!.getSize().y = 5;
    runOn(new GraphBoundsProcessor(), g);
    expect([
      g.getProperty(InternalProperties.GRAPH_XMIN),
      g.getProperty(InternalProperties.GRAPH_YMIN),
      g.getProperty(InternalProperties.GRAPH_XMAX),
      g.getProperty(InternalProperties.GRAPH_YMAX),
    ]).toEqual([-1, -4, 13, 13]);
  });

  it('an empty graph throws NoSuchElementException "No value present" (OptionalDouble.getAsDouble)', () => {
    const run = (): void => {
      runOn(new GraphBoundsProcessor(), graphOf(0, []).g);
    };
    expect(run).toThrow(NoSuchElementException);
    expect(run).toThrow('No value present');
  });
});
