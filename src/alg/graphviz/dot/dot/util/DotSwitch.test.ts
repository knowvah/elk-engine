// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../../emf/ecore/EObject.js';
import type { Attribute } from '../Attribute.js';
import type { AttributeStatement } from '../AttributeStatement.js';
import { DotFactory } from '../DotFactory.js';
import type { DotEObject } from '../DotPackage.js';
import type { EdgeStatement } from '../EdgeStatement.js';
import type { EdgeTarget } from '../EdgeTarget.js';
import type { Graph } from '../Graph.js';
import type { GraphvizModel } from '../GraphvizModel.js';
import type { Node } from '../Node.js';
import type { NodeStatement } from '../NodeStatement.js';
import type { Port } from '../Port.js';
import type { Statement } from '../Statement.js';
import type { Subgraph } from '../Subgraph.js';
import { DotSwitch } from './DotSwitch.js';

// Expected values: DotSwitch.java doSwitch(int, EObject): each class tries its own case, a statement kind then
// caseStatement, and every class ends in defaultCase; EMF's Switch.doSwitch(EObject) and defaultCase (null).

const F = DotFactory.eINSTANCE;

/** [class, factory, the statement kinds reach caseStatement]. */
const KINDS: ReadonlyArray<readonly [string, () => DotEObject, boolean]> = [
  ['GraphvizModel', () => F.createGraphvizModel(), false],
  ['Graph', () => F.createGraph(), false],
  ['Statement', () => F.createStatement(), true],
  ['Attribute', () => F.createAttribute(), true],
  ['NodeStatement', () => F.createNodeStatement(), true],
  ['Node', () => F.createNode(), false],
  ['EdgeStatement', () => F.createEdgeStatement(), true],
  ['EdgeTarget', () => F.createEdgeTarget(), false],
  ['AttributeStatement', () => F.createAttributeStatement(), true],
  ['Subgraph', () => F.createSubgraph(), true],
  ['Port', () => F.createPort(), false],
];

class DefaultOnly extends DotSwitch<string> {
  readonly seen: EObject[] = [];
  override defaultCase(object: EObject): string {
    this.seen.push(object);
    return 'default';
  }
}

class WithStatement extends DefaultOnly {
  override caseStatement(_object: Statement): string {
    return 'statement';
  }
}

/** Every case answers with its class name. */
class AllCases extends DefaultOnly {
  override caseGraphvizModel(_o: GraphvizModel): string {
    return 'GraphvizModel';
  }
  override caseGraph(_o: Graph): string {
    return 'Graph';
  }
  override caseStatement(_o: Statement): string {
    return 'Statement';
  }
  override caseAttribute(_o: Attribute): string {
    return 'Attribute';
  }
  override caseNodeStatement(_o: NodeStatement): string {
    return 'NodeStatement';
  }
  override caseNode(_o: Node): string {
    return 'Node';
  }
  override caseEdgeStatement(_o: EdgeStatement): string {
    return 'EdgeStatement';
  }
  override caseEdgeTarget(_o: EdgeTarget): string {
    return 'EdgeTarget';
  }
  override caseAttributeStatement(_o: AttributeStatement): string {
    return 'AttributeStatement';
  }
  override caseSubgraph(_o: Subgraph): string {
    return 'Subgraph';
  }
  override casePort(_o: Port): string {
    return 'Port';
  }
}

/** Exposes the protected classifier dispatch. */
class ById extends DefaultOnly {
  byId(classifierID: number, object: EObject): string | null {
    return this.doSwitchClassifierID(classifierID, object);
  }
}

describe('DotSwitch dispatch', () => {
  it.each(KINDS)('%s reaches defaultCase with the object when only defaultCase is overridden', (_n, create) => {
    const sw = new DefaultOnly();
    const object = create();
    expect(sw.doSwitch(object)).toBe('default');
    expect(sw.seen).toEqual([object]);
  });

  it.each(KINDS)('%s reaches caseStatement exactly when it is a statement kind', (_n, create, isStatement) => {
    expect(new WithStatement().doSwitch(create())).toBe(isStatement ? 'statement' : 'default');
  });

  it.each(KINDS)('%s reaches its own case first', (name, create) => {
    const sw = new AllCases();
    expect(sw.doSwitch(create())).toBe(name);
    expect(sw.seen).toEqual([]);
  });

  it.each(KINDS)('%s answers null from the unmodified switch', (_n, create) => {
    expect(new DotSwitch<string>().doSwitch(create())).toBeNull();
  });
});

describe('DotSwitch fallbacks', () => {
  it('an object of another package reaches defaultCase', () => {
    const foreign: EObject = {
      eClass: () => ({ getName: () => 'Graph' }),
      eContainer: () => null,
      eContents: () => F.createGraph().eContents(),
      eAllContents: () => [][Symbol.iterator](),
    };
    const sw = new AllCases();
    expect(sw.doSwitch(foreign)).toBe('default');
    expect(sw.seen).toEqual([foreign]);
  });

  it('an unknown classifier id reaches defaultCase', () => {
    const graph = F.createGraph();
    expect(new ById().byId(11, graph)).toBe('default');
    expect(new ById().byId(-1, graph)).toBe('default');
  });

  it('the base defaultCase answers null', () => {
    expect(new DotSwitch<string>().defaultCase(F.createGraph())).toBeNull();
  });
});
