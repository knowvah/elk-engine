// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { isElkConnectableShape } from '../../graph/ElkConnectableShape.js';
import { isElkEdge } from '../../graph/ElkEdge.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { isElkShape } from '../../graph/ElkShape.js';
import { isEMapPropertyHolder } from '../../graph/EMapPropertyHolder.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { GridElkNode } from './GridElkNode.js';
import { TopdownpackingLayoutProvider } from './TopdownpackingLayoutProvider.js';

/** A graph with `count` children named `c<i>`, root named `root`. */
function graphWith(count: number): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('root');
  for (let i = 0; i < count; i++) {
    ElkGraphUtil.createNode(root).setIdentifier(`c${String(i)}`);
  }
  return root;
}

describe('GridElkNode type guards (PK3: Java instanceof ElkNode and its super-interfaces)', () => {
  const grid = new GridElkNode(graphWith(1));

  it('isElkNode is true', () => {
    expect(isElkNode(grid)).toBe(true);
  });

  it('isElkConnectableShape is true', () => {
    expect(isElkConnectableShape(grid)).toBe(true);
  });

  it('isElkShape is true', () => {
    expect(isElkShape(grid)).toBe(true);
  });

  it('isElkGraphElement is true', () => {
    expect(isElkGraphElement(grid)).toBe(true);
  });

  it('isEMapPropertyHolder is true', () => {
    expect(isEMapPropertyHolder(grid)).toBe(true);
  });

  it('the guards of the interfaces GridElkNode does not implement stay false', () => {
    expect([isElkPort(grid), isElkLabel(grid), isElkEdge(grid)]).toEqual([false, false, false]);
  });

  it('a plain ElkNode still passes every guard it passed (the impl stays registered)', () => {
    const node = graphWith(0);
    expect([isElkNode(node), isElkConnectableShape(node), isElkShape(node), isElkGraphElement(node)]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});

/** Every member of the TS ElkNode interface chain, with arguments to pass (GridElkNode.java:154-521 plus InternalEObject). */
const DELEGATED: readonly (readonly [string, readonly unknown[]])[] = [
  ['getOutgoingEdges', []],
  ['getIncomingEdges', []],
  ['getHeight', []],
  ['setHeight', [3]],
  ['getWidth', []],
  ['setWidth', [4]],
  ['getX', []],
  ['setX', [5]],
  ['getY', []],
  ['setY', [6]],
  ['setDimensions', [7, 8]],
  ['setLocation', [9, 10]],
  ['getLabels', []],
  ['getIdentifier', []],
  ['setIdentifier', ['id']],
  ['getProperties', []],
  ['eClass', []],
  ['eResource', []],
  ['eContainer', []],
  ['eContents', []],
  ['eAllContents', []],
  ['eIsProxy', []],
  ['setProperty', ['property', 'value']],
  ['getProperty', ['property']],
  ['hasProperty', ['property']],
  ['copyProperties', ['holder']],
  ['getAllProperties', []],
  ['getPorts', []],
  ['getChildren', []],
  ['getParent', []],
  ['setParent', ['parent']],
  ['getContainedEdges', []],
  ['isHierarchical', []],
  ['eInternalContainer', []],
  ['eContainerFeatureID', []],
  ['eBasicSetContainer', ['container', 11]],
  ['eBasicRemoveFromContainer', []],
  ['eInverseAdd', ['otherEnd', 12]],
  ['eInverseRemove', ['otherEnd', 13]],
  ['eProxyURI', []],
  ['eSetProxyURI', ['uri']],
  ['eResolveProxy', ['proxy']],
  ['eDirectResource', []],
  ['eInternalResource', []],
  ['eSetResource', ['resource']],
];

describe('GridElkNode delegation', () => {
  it('forwards every member of the ElkNode interface chain to the wrapped node with its arguments and result', () => {
    const calls: [string, unknown[]][] = [];
    const results = new Map<string, symbol>();
    const recorder = new Proxy(
      {},
      {
        get: (_target, name) => {
          const key = String(name);
          return (...args: unknown[]) => {
            calls.push([key, args]);
            const result = Symbol(key);
            results.set(key, result);
            return result;
          };
        },
      },
    ) as ElkNode;
    const grid = new GridElkNode(recorder) as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const [name, args] of DELEGATED) {
      const result = grid[name]!(...args);
      expect([name, calls.at(-1)]).toEqual([name, [name, args]]);
      const delegatedResult = results.get(name);
      expect(result === delegatedResult || result === undefined).toBe(true);
    }
    expect(calls).toHaveLength(DELEGATED.length);
  });

  it('setProperty returns what the wrapped node returns (the wrapped node, not the wrapper), as Java does', () => {
    const node = graphWith(0);
    const grid = new GridElkNode(node);
    expect(grid.setProperty(CoreOptions.SPACING_NODE_NODE, 5)).toBe(node);
    expect(node.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(5);
  });

  it('reads and writes the wrapped node: bounds, children and properties are the node itself', () => {
    const node = graphWith(2);
    const grid = new GridElkNode(node);
    grid.setDimensions(40, 30);
    grid.setLocation(1, 2);
    expect([node.getWidth(), node.getHeight(), node.getX(), node.getY()]).toEqual([40, 30, 1, 2]);
    expect(grid.getChildren()).toBe(node.getChildren());
    expect(grid.getProperties()).toBe(node.getProperties());
    expect(grid.isHierarchical()).toBe(true);
    expect(grid.getIdentifier()).toBe('root');
  });
});

describe('GridElkNode grid (GridElkNode.java:63-152)', () => {
  it('setGridSize fills each row with cols nulls; getColumns / getRows report the size', () => {
    const grid = new GridElkNode(graphWith(0));
    grid.setGridSize(3, 2);
    expect([grid.getColumns(), grid.getRows()]).toEqual([3, 2]);
    expect([grid.getRow(0), grid.getRow(1)]).toEqual([
      [null, null, null],
      [null, null, null],
    ]);
  });

  it('put inserts (ArrayList.add(col, item), :73): the row list grows and later cells shift right', () => {
    const root = graphWith(2);
    const [a, b] = [...root.getChildren()];
    const grid = new GridElkNode(root);
    grid.setGridSize(2, 1);
    grid.put(0, 0, a!);
    grid.put(0, 0, b!);
    expect(grid.getRow(0)).toEqual([b, a, null, null]);
    expect(grid.get(1, 0)).toBe(a);
    expect(grid.getColumn(0)).toEqual([b]);
  });

  it('getRow returns the live row list; getColumn returns a new list', () => {
    const grid = new GridElkNode(graphWith(0));
    grid.setGridSize(1, 2);
    expect(grid.getRow(1)).toBe(grid.getRow(1));
    expect(grid.getColumn(0)).not.toBe(grid.getColumn(0));
    expect(grid.getColumn(0)).toEqual([null, null]);
  });

  it('a negative row count throws as new ArrayList<>(rows) does (:143)', () => {
    const grid = new GridElkNode(graphWith(0));
    expect(() => grid.setGridSize(1, -1)).toThrow(IllegalArgumentException);
    expect(() => grid.setGridSize(1, -1)).toThrow('Illegal Capacity: -1');
  });

  it('a negative index below the bounds checks throws IndexOutOfBoundsException from the row list', () => {
    const grid = new GridElkNode(graphWith(1));
    grid.setGridSize(2, 2);
    expect(() => grid.get(0, -1)).toThrow(IndexOutOfBoundsException);
    expect(() => grid.get(0, -1)).toThrow('Index -1 out of bounds for length 2');
  });

  it('an uninitialised grid dereferenced past the bounds check is a NullPointerException (D10: TypeError)', () => {
    const grid = new GridElkNode(graphWith(1));
    expect(() => grid.get(-1, -1)).toThrow(TypeError);
  });
});

describe('GridElkNode through progressMonitor.logGraph (BottomRowEqualWhitespaceEliminator.java:102)', () => {
  it('logGraph with logging enabled copies the wrapped node through the wrapper (copyGraph)', () => {
    const root = graphWith(2);
    root.setProperty(CoreOptions.SPACING_NODE_NODE, 7);
    const grid = new GridElkNode(root);
    const monitor = new BasicProgressMonitor().withLogging(true);
    monitor.logGraph(grid, 'tag');
    const logged = monitor.getLoggedGraphs();
    expect(logged).toHaveLength(1);
    const copy = logged[0]!.getGraph() as ElkNode;
    expect(copy).not.toBe(grid);
    expect(copy).not.toBe(root);
    expect(copy.getIdentifier()).toBe('root');
    expect([...copy.getChildren()].map((child) => child.getIdentifier())).toEqual(['c0', 'c1']);
    expect(copy.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(7);
  });

  it('a provider run with a logging monitor logs the placement and copies of the graph', () => {
    // the service registers the ElkReflect cloners the padding default needs (Java: PlainJavaInitialization)
    LayoutMetaDataService.getInstance();
    const root = graphWith(2);
    const padding = root.getProperty(CoreOptions.PADDING);
    const monitor = new BasicProgressMonitor().withLogging(true);
    new TopdownpackingLayoutProvider().layout(root, monitor);
    const placement = monitor.getSubMonitors()[0]!;
    const logs = placement.getLogs();
    expect(logs[0]).toBe('Node placement began for node root');
    // Java string concatenation of a double (Double.toString): the first currX is padding.left (:74, :89)
    expect(logs).toContain(`currX: ${doubleToString(padding.left)}`);
    expect(logs).toContain('Node Placing done!');
    const tags = placement.getLoggedGraphs().map((graph) => graph.getTag());
    expect(tags.at(-1)).toBe('Graph after node placement');
    const whitespace = monitor.getSubMonitors()[1]!;
    expect(whitespace.getLoggedGraphs().map((graph) => graph.getTag())).toEqual(['Graph after whitespace elimination']);
  });
});
