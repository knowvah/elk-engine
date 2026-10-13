// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { GraphIssue, Severity } from './GraphIssue.js';

function node(identifier: string) {
  const n = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
  n.setIdentifier(identifier);
  return n;
}

describe('GraphIssue.Severity', () => {
  it('declares ERROR and WARNING with user strings', () => {
    expect(GraphIssue.Severity).toBe(Severity);
    expect(Severity.values()).toEqual([Severity.ERROR, Severity.WARNING]);
    expect(Severity.ERROR.getUserString()).toBe('Error');
    expect(Severity.WARNING.getUserString()).toBe('Warning');
    expect(Severity.WARNING.name()).toBe('WARNING');
    expect(Severity.WARNING.ordinal()).toBe(1);
    expect(String(Severity.ERROR)).toBe('ERROR');
  });
});

describe('GraphIssue.Severity lookup and ordering', () => {
  it('valueOf resolves each constant by name', () => {
    expect(Severity.valueOf('ERROR')).toBe(Severity.ERROR);
    expect(Severity.valueOf('WARNING')).toBe(Severity.WARNING);
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => Severity.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => Severity.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.validation.GraphIssue.Severity.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(Severity.WARNING.compareTo(Severity.ERROR)).toBe(1);
    expect(Severity.ERROR.compareTo(Severity.WARNING)).toBe(-1);
    expect(Severity.ERROR.compareTo(Severity.ERROR)).toBe(0);
  });
});

describe('GraphIssue', () => {
  it('exposes its constructor arguments', () => {
    const n = node('n1');
    const issue = new GraphIssue(n, 'm', Severity.WARNING);
    expect(issue.getElement()).toBe(n);
    expect(issue.getMessage()).toBe('m');
    expect(issue.getSeverity()).toBe(Severity.WARNING);
  });

  it('toString prints severity, message and element path', () => {
    const issue = new GraphIssue(node('n1'), 'm', Severity.ERROR);
    expect(issue.toString()).toBe('ERROR: m (Root Node > Node n1)');
  });

  it('equals compares element identity, message and severity', () => {
    const n = node('n1');
    const issue = new GraphIssue(n, 'm', Severity.ERROR);
    expect(issue.equals(new GraphIssue(n, 'm', Severity.ERROR))).toBe(true);
    expect(issue.equals(new GraphIssue(node('n1'), 'm', Severity.ERROR))).toBe(false);
    expect(issue.equals(new GraphIssue(n, 'other', Severity.ERROR))).toBe(false);
    expect(issue.equals(new GraphIssue(n, 'm', Severity.WARNING))).toBe(false);
    expect(issue.equals('m')).toBe(false);
  });

  it('gives equal issues equal hash codes', () => {
    const n = node('n1');
    const a = new GraphIssue(n, 'm', Severity.ERROR);
    const b = new GraphIssue(n, 'm', Severity.ERROR);
    expect(a.hashCode()).toBe(b.hashCode());
    expect(Number.isInteger(a.hashCode())).toBe(true);
  });

  it('accepts a null element but throws TypeError where Java throws NullPointerException', () => {
    const issue = new GraphIssue(null, 'm', Severity.ERROR);
    expect(issue.getElement()).toBeNull();
    expect(issue.equals(new GraphIssue(null, 'm', Severity.ERROR))).toBe(true);
    expect(() => issue.hashCode()).toThrow(TypeError);
    expect(() => issue.toString()).toThrow(TypeError);
  });
});
