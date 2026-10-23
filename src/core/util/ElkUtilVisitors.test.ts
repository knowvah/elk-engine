// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { GraphIssue, Severity } from '../validation/GraphIssue.js';
import { GraphValidationException } from '../validation/GraphValidationException.js';
import type { IValidatingGraphElementVisitor } from '../validation/IValidatingGraphElementVisitor.js';
import { ElkUtil } from './ElkUtil.js';
import type { IGraphElementVisitor } from './IGraphElementVisitor.js';

/** A graph `r` with two children `a` and `b`. */
function smallGraph(): { root: ElkNode; a: ElkNode; b: ElkNode } {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('r');
  const a = ElkGraphUtil.createNode(root);
  a.setIdentifier('a');
  const b = ElkGraphUtil.createNode(root);
  b.setIdentifier('b');
  return { root, a, b };
}

/** A visitor recording `<name>:<identifier>` for each element into the shared log. */
function recorder(name: string, log: string[]): IGraphElementVisitor {
  return { visit: (element): void => void log.push(`${name}:${element.getIdentifier()}`) };
}

/** A validating visitor reporting the given issues independent of what it visits. */
function validator(issues: GraphIssue[]): IValidatingGraphElementVisitor {
  return { visit: (): void => undefined, getIssues: (): GraphIssue[] => issues };
}

describe('ElkUtil.applyVisitors', () => {
  // ElkUtil.java:1085-1097: pre-order, the root included, each element by every visitor in argument order
  it('visits the root and every element once per visitor, in argument order', () => {
    const { root } = smallGraph();
    const log: string[] = [];
    ElkUtil.applyVisitors(root, recorder('v1', log), recorder('v2', log));
    expect(log).toEqual(['v1:r', 'v2:r', 'v1:a', 'v2:a', 'v1:b', 'v2:b']);
  });

  it('visits elements in the order of propertiesSkippingIteratorFor', () => {
    const { root, a } = smallGraph();
    ElkGraphUtil.createPort(a).setIdentifier('p');
    ElkGraphUtil.createLabelWithText('t', a).setIdentifier('l');
    const expected = [...ElkGraphUtil.propertiesSkippingIteratorFor(root, true)]
      .filter(isElkGraphElement)
      .map((e) => `v:${e.getIdentifier()}`);
    const log: string[] = [];
    ElkUtil.applyVisitors(root, recorder('v', log));
    expect(log).toEqual(expected);
    expect(log).toContain('v:p');
    expect(log).toContain('v:l');
  });

  it('visits nothing for an empty visitor list and does not query validators', () => {
    const { root } = smallGraph();
    let queried = false;
    const spy: IValidatingGraphElementVisitor = {
      visit: (): void => undefined,
      getIssues: (): GraphIssue[] => {
        queried = true;
        return [];
      },
    };
    ElkUtil.applyVisitors(root);
    ElkUtil.applyVisitors(root, spy);
    expect(queried).toBe(false);
  });
});

describe('ElkUtil.applyVisitorsWithValidation', () => {
  // ElkUtil.java:1110-1141
  it('throws with the Java message and the issue list when an error is reported', () => {
    const { a } = smallGraph();
    const issue = new GraphIssue(a, 'boom', Severity.ERROR);
    let thrown: unknown;
    try {
      ElkUtil.applyVisitorsWithValidation(a.getParent() as ElkNode, validator([issue]));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(GraphValidationException);
    const exception = thrown as GraphValidationException;
    expect(exception.message).toBe('ERROR: boom\n\tat Root Node r > Node a');
    expect(exception.getIssues()).toEqual([issue]);
  });

  it('joins the issues of all validators in visitor order, warnings included, with line breaks', () => {
    const { root, a } = smallGraph();
    const warning = new GraphIssue(root, 'w', Severity.WARNING);
    const error = new GraphIssue(a, 'e', Severity.ERROR);
    const log: string[] = [];
    let thrown: GraphValidationException | undefined;
    try {
      ElkUtil.applyVisitorsWithValidation(
        root,
        validator([warning]),
        recorder('plain', log),
        validator([]),
        validator([error]),
      );
    } catch (e) {
      thrown = e as GraphValidationException;
    }
    expect(thrown?.message).toBe('WARNING: w\n\tat Root Node r\nERROR: e\n\tat Root Node r > Node a');
    expect(thrown?.getIssues()).toEqual([warning, error]);
    expect(log).toEqual(['plain:r', 'plain:a', 'plain:b']);
  });

  it('does not throw when there are only warnings, no issues or no validators', () => {
    const { root } = smallGraph();
    const warning = new GraphIssue(root, 'w', Severity.WARNING);
    expect(ElkUtil.applyVisitorsWithValidation(root, validator([warning]))).toBeUndefined();
    expect(ElkUtil.applyVisitorsWithValidation(root, validator([]))).toBeUndefined();
    expect(ElkUtil.applyVisitorsWithValidation(root, recorder('x', []))).toBeUndefined();
  });
});

describe('ElkUtil.debugFolderPath and createIdentifier', () => {
  // ElkUtil.java:1226-1251: the body is inside elkjs-exclude (M2)
  it('returns null with and without subfolders', () => {
    expect(ElkUtil.debugFolderPath()).toBeNull();
    expect(ElkUtil.debugFolderPath('a', 'b')).toBeNull();
  });

  it('sets the identifier to the decimal identity hash code of the element', () => {
    const node: ElkGraphElement = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    ElkUtil.createIdentifier(node);
    expect(node.getIdentifier()).toBe(String(identityHashCode(node)));
    expect(node.getIdentifier()).toMatch(/^-?\d+$/);
  });
});
