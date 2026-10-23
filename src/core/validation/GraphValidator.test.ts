// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it } from 'vitest';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RuntimeException } from '../../java/lang/RuntimeException.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { ILayoutMetaDataProvider } from '../data/ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { LayoutAlgorithmResolver } from '../data/LayoutAlgorithmResolver.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { AlgorithmFactory } from '../util/AlgorithmFactory.js';
import { ElkUtil } from '../util/ElkUtil.js';
import type { IElkProgressMonitor } from '../util/IElkProgressMonitor.js';
import { GraphIssue } from './GraphIssue.js';
import { GraphValidator } from './GraphValidator.js';
import type { IValidatingGraphElementVisitor } from './IValidatingGraphElementVisitor.js';

const FOO_ID = 'foo.algorithm';

class FooAlgorithm extends AbstractLayoutProvider {
  layout(layoutGraph: ElkNode, _progressMonitor: IElkProgressMonitor): void {
    layoutGraph.setDimensions(100, 100);
  }
}

class FooValidator implements IValidatingGraphElementVisitor {
  readonly #issues: GraphIssue[] = [];

  visit(element: ElkGraphElement): void {
    if (element.getIdentifier() === 'foo') {
      this.#issues.push(new GraphIssue(element, 'FOO!', GraphIssue.Severity.ERROR));
    }
  }

  getIssues(): GraphIssue[] {
    return this.#issues;
  }
}

/** Java `List.toString()`. */
function javaListToString(items: readonly GraphIssue[]): string {
  return `[${items.map(String).join(', ')}]`;
}

let constructed = 0;

class CountingValidator extends FooValidator {
  constructor() {
    super();
    constructed++;
  }
}

class ThrowingValidator extends FooValidator {
  static readonly FAILURE = new Error('cannot construct');

  constructor() {
    super();
    throw ThrowingValidator.FAILURE;
  }
}

function algorithmData(
  id: string,
  validatorClass: (new () => IValidatingGraphElementVisitor) | null,
): LayoutAlgorithmData {
  const builder = new LayoutAlgorithmData.Builder().id(id).providerFactory(new AlgorithmFactory(FooAlgorithm));
  return (validatorClass === null ? builder : builder.validatorClass(validatorClass)).create();
}

/** A graph with one child node whose resolved algorithm is set directly, bypassing the registry. */
function graphWith(data: LayoutAlgorithmData | null): { graph: ElkNode; child: ElkNode } {
  const graph = ElkGraphUtil.createGraph();
  const child = ElkGraphUtil.createNode(graph);
  child.setIdentifier('foo');
  if (data !== null) {
    graph.setProperty(CoreOptions.RESOLVED_ALGORITHM, data);
  }
  return { graph, child };
}

afterEach(() => {
  LayoutMetaDataService.unload();
  constructed = 0;
});

describe('GraphValidatorTest (ported)', () => {
  it('testUnconnectedEdge', () => {
    const graph = ElkGraphUtil.createGraph();
    ElkGraphUtil.createEdge(graph);

    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);

    expect(javaListToString(validator.getIssues())).toBe('[ERROR: Edge is not connected. (Root Node > Edge)]');
  });

  it('testCustomValidation', () => {
    const provider: ILayoutMetaDataProvider = {
      apply(registry: ILayoutMetaDataProvider.Registry): void {
        registry.register(algorithmData(FOO_ID, FooValidator));
      },
    };
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(provider);

    const graph = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(graph).setIdentifier('foo');
    graph.setProperty(CoreOptions.ALGORITHM, FOO_ID);

    const algorithmResolver = new LayoutAlgorithmResolver();
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, algorithmResolver, validator);

    expect(javaListToString(validator.getIssues())).toBe('[ERROR: FOO! (Root Node > Node foo)]');
  });
});

describe('GraphValidator generic edge checks', () => {
  function connectedEdge(): { graph: ElkNode; edge: ElkEdge; a: ElkNode; b: ElkNode } {
    const graph = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(graph);
    const b = ElkGraphUtil.createNode(graph);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    return { graph, edge, a, b };
  }

  it('reports nothing for a connected edge in its best container', () => {
    const { graph } = connectedEdge();
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);
    expect(validator.getIssues()).toEqual([]);
  });

  it('warns when the edge is not in its best container', () => {
    const graph = ElkGraphUtil.createGraph();
    const sub = ElkGraphUtil.createNode(graph);
    sub.setIdentifier('sub');
    const a = ElkGraphUtil.createNode(sub);
    const b = ElkGraphUtil.createNode(sub);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    edge.setContainingNode(graph);

    const validator = new GraphValidator();
    validator.visit(edge);

    const issues = validator.getIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.getMessage()).toBe('Edge should be contained in Root Node > Node sub');
    expect(issues[0]?.getSeverity()).toBe(GraphIssue.Severity.WARNING);
    expect(issues[0]?.getElement()).toBe(edge);
  });

  it('reports an incoming shape that is not a source, and an incoming section conflict', () => {
    const { graph, edge, b } = connectedEdge();
    const other = ElkGraphUtil.createNode(graph);
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setIncomingShape(other);
    section.getIncomingSections().add(ElkGraphUtil.createEdgeSection(edge));
    section.setOutgoingShape(b);

    const validator = new GraphValidator();
    validator.visit(edge);

    expect(validator.getIssues().map((i) => [i.getMessage(), i.getSeverity()])).toEqual([
      ['ElkNode declared as incoming shape is not a source of this edge.', GraphIssue.Severity.ERROR],
      [
        'An edge section cannot be connected to an ElkNode and other sections at the same time.',
        GraphIssue.Severity.ERROR,
      ],
    ]);
  });

  it('reports an outgoing shape that is not a target, and an outgoing section conflict', () => {
    const { graph, edge, a } = connectedEdge();
    const other = ElkGraphUtil.createPort(ElkGraphUtil.createNode(graph));
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setIncomingShape(a);
    section.setOutgoingShape(other);
    section.getOutgoingSections().add(ElkGraphUtil.createEdgeSection(edge));

    const validator = new GraphValidator();
    validator.visit(edge);

    expect(validator.getIssues().map((i) => i.getMessage())).toEqual([
      'ElkPort declared as outgoing shape is not a target of this edge.',
      'An edge section cannot be connected to an ElkPort and other sections at the same time.',
    ]);
  });
});

describe('GraphValidator algorithm-specific validation', () => {
  it('skips an element whose graph has no resolved algorithm', () => {
    const { graph } = graphWith(null);
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);
    expect(validator.getIssues()).toEqual([]);
  });

  it('skips an algorithm without a validator class', () => {
    const { graph } = graphWith(algorithmData(FOO_ID, null));
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);
    expect(validator.getIssues()).toEqual([]);
  });

  it('delegates to the validator class and appends its issues after its own', () => {
    const { graph, child } = graphWith(algorithmData(FOO_ID, FooValidator));
    ElkGraphUtil.createEdge(graph);
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);

    expect(validator.getIssues().map((i) => i.getMessage())).toEqual(['Edge is not connected.', 'FOO!']);
    expect(validator.getIssues()[1]?.getElement()).toBe(child);
  });

  it('instantiates the validator class once per algorithm', () => {
    const { graph } = graphWith(algorithmData(FOO_ID, CountingValidator));
    ElkGraphUtil.createNode(graph);
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);
    ElkUtil.applyVisitors(graph, validator);
    expect(constructed).toBe(1);
  });

  it('wraps a constructor failure in a RuntimeException naming the algorithm', () => {
    const { graph } = graphWith(algorithmData(FOO_ID, ThrowingValidator));
    const validator = new GraphValidator();
    let thrown: unknown;
    try {
      ElkUtil.applyVisitors(graph, validator);
    } catch (ex) {
      thrown = ex;
    }
    expect(thrown).toBeInstanceOf(RuntimeException);
    expect((thrown as RuntimeException).message).toBe(`Failed to instantiate validator for ${FOO_ID}`);
    expect((thrown as RuntimeException).cause).toBe(ThrowingValidator.FAILURE);
  });

  it('validates a node whose algorithm differs from that of its parent with its own algorithm too', () => {
    const { graph, child } = graphWith(algorithmData('outer', null));
    const inner = ElkGraphUtil.createNode(child);
    inner.setIdentifier('foo');
    child.setProperty(CoreOptions.RESOLVED_ALGORITHM, algorithmData('inner', FooValidator));
    const validator = new GraphValidator();
    ElkUtil.applyVisitors(graph, validator);
    expect(validator.getIssues().map((i) => i.getElement())).toEqual([child, inner]);
  });
});
