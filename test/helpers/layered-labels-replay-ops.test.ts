// SPDX-License-Identifier: EPL-2.0
// The new ops' own contract: the manager twin's arithmetic and installation, the capture of logged graphs, op placement.
import { beforeAll, describe, expect, it } from 'vitest';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { LoggedGraph } from '../../src/core/util/LoggedGraph.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import {
  LABEL_MANAGER_NONE,
  LABEL_MANAGER_SHRINK_WIDTH,
  capturedLogged,
  createLabelManager,
  installLabelManager,
  runLabelsRow,
  type LabelsEnvironment,
} from './layered-labels-replay-ops.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';

const TARGET = 50;
const labelOf = (width: number, height: number): ReturnType<typeof ElkGraphUtil.createLabel> => {
  const label = ElkGraphUtil.createLabel(ElkGraphUtil.createGraph());
  label.setDimensions(width, height);
  return label;
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('createLabelManager', () => {
  const manager = createLabelManager(LABEL_MANAGER_SHRINK_WIDTH);

  it('shrinks a wider label to the target width and keeps its height', () => {
    const label = labelOf(120, 14);
    const size = manager.manageLabelSize(label, TARGET)!;
    expect([size.x, size.y]).toEqual([TARGET, 14]);
    expect([label.getWidth(), label.getHeight()]).toEqual([120, 14]);
  });

  it('returns null for a label at the target width and for a narrower one', () => {
    expect(manager.manageLabelSize(labelOf(TARGET, 9), TARGET)).toBeNull();
    expect(manager.manageLabelSize(labelOf(10, 9), TARGET)).toBeNull();
  });

  it('rejects a kind that is not a manager, naming it', () => {
    expect(() => createLabelManager(LABEL_MANAGER_NONE)).toThrow('unknown label manager kind none');
    expect(() => createLabelManager('grow')).toThrow('unknown label manager kind grow');
  });
});

describe('installLabelManager', () => {
  it('sets LABEL_MANAGER on the node for shrink-width and leaves it unset for none', () => {
    const shrunk = ElkGraphUtil.createGraph();
    installLabelManager(shrunk, LABEL_MANAGER_SHRINK_WIDTH);
    expect(shrunk.hasProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(true);
    const plain = ElkGraphUtil.createGraph();
    installLabelManager(plain, LABEL_MANAGER_NONE);
    expect(plain.hasProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(false);
  });
});

describe('capturedLogged', () => {
  it('pairs DOT and JSON by tag, depth first, sub-monitors after their parent', () => {
    const root = new BasicProgressMonitor().withLogging(true);
    root.logGraph('digraph a {}', '0-a', LoggedGraph.Type.DOT);
    root.logGraph('{a}', '0-a', LoggedGraph.Type.JSON);
    const child = root.subTask(1) as BasicProgressMonitor;
    child.logGraph('digraph b {}', '1-b', LoggedGraph.Type.DOT);
    child.logGraph('{b}', '1-b', LoggedGraph.Type.JSON);
    expect(capturedLogged(root)).toEqual({
      tags: ['0-a', '1-b'],
      dot: ['digraph a {}', 'digraph b {}'],
      json: ['{a}', '{b}'],
    });
  });

  it('is empty for a monitor that does not log', () => {
    expect(capturedLogged(new BasicProgressMonitor())).toEqual({ tags: [], dot: [], json: [] });
  });

  it('rejects DOT and JSON graphs that do not pair up by tag', () => {
    const root = new BasicProgressMonitor().withLogging(true);
    root.logGraph('digraph a {}', '0-a', LoggedGraph.Type.DOT);
    root.logGraph('{b}', '0-b', LoggedGraph.Type.JSON);
    expect(() => capturedLogged(root)).toThrow('do not pair up by tag');
  });

  it('rejects a logged graph of another type', () => {
    const root = new BasicProgressMonitor().withLogging(true);
    root.logGraph('<svg/>', '0-a', LoggedGraph.Type.SVG);
    expect(() => capturedLogged(root)).toThrow('a logged graph of type');
  });
});

describe('runLabelsRow', () => {
  const INPUT = { elk: { id: 'root', children: [{ id: 'n1', width: 10, height: 10 }] } };
  const row = (steps: PipelineStopRow['steps']): PipelineStopRow => ({
    id: 'scenarios/synthetic',
    group: 'scenarios',
    input: INPUT,
    target: null,
    options: {},
    steps,
    prefix: null,
    expected: {} as PipelineStopRow['expected'],
  });
  const unused = (): never => {
    throw new Error('unused');
  };
  const env: LabelsEnvironment = {
    factories: { createProcessor: unused, createPhase: unused },
    components: { split: () => [], combine: () => undefined },
  };
  const rootOf = (result: { graph: { getProperty: (p: never) => unknown } }): ElkNode =>
    result.graph.getProperty(InternalProperties.ORIGIN as never) as ElkNode;

  it('sets the manager on the root before the import, and restores the transformer afterwards', () => {
    const before = ElkGraphTransformer.prototype.importGraph;
    const result = runLabelsRow(row([['labelManager', 'shrink-width'], ['importGraph', null], ['dump']]), env);
    expect(rootOf(result).hasProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(true);
    expect(ElkGraphTransformer.prototype.importGraph).toBe(before);
  });

  it('leaves the manager unset for none', () => {
    const result = runLabelsRow(row([['labelManager', 'none'], ['importGraph', null], ['dump']]), env);
    expect(rootOf(result).hasProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(false);
  });

  it('checks the arity of labelManager and names an unknown kind', () => {
    expect(() => runLabelsRow(row([['labelManager']]), env)).toThrow(
      'row scenarios/synthetic: op labelManager takes 1 arguments, got 0',
    );
    expect(() => runLabelsRow(row([['labelManager', 'grow'], ['importGraph', null], ['dump']]), env)).toThrow(
      'unknown label manager kind grow',
    );
  });

  it('throws naming an op neither this module nor 7f knows, and a labelManager that is not first', () => {
    expect(() => runLabelsRow(row([['frobnicate']]), env)).toThrow(
      'row scenarios/synthetic: unknown step op frobnicate',
    );
    expect(() =>
      runLabelsRow(
        row([
          ['importGraph', null],
          ['labelManager', 'none'],
        ]),
        env,
      ),
    ).toThrow('unknown step op labelManager');
  });

  it('rejects a row without steps and terminal ops with arguments', () => {
    expect(() => runLabelsRow(row(null), env)).toThrow('row scenarios/synthetic has no steps');
    expect(() =>
      runLabelsRow(
        row([
          ['importGraph', null],
          ['logging', 'x'],
        ]),
        env,
      ),
    ).toThrow('op logging takes 0 arguments and ends the row');
  });

  it('lays out twice around the visitor for interactive and returns both exports', () => {
    const visited: unknown[] = [];
    const result = runLabelsRow(row([['importGraph', null], ['normalise'], ['interactive']]), {
      ...env,
      createInteractiveVisitor: () => ({ visit: (element) => visited.push(element) }),
    });
    expect(visited).toEqual([rootOf(result)]);
    expect((result.layout1 as { id: string }).id).toBe('root');
    expect((result.layout as { id: string }).id).toBe('root');
    expect(result.terminal).toBe('layout');
  });

  it('demands a visitor factory for interactive', () => {
    expect(() => runLabelsRow(row([['importGraph', null], ['normalise'], ['interactive']]), env)).toThrow(
      /needs a visitor factory/,
    );
  });
});
