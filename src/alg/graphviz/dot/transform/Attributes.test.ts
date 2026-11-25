// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Attributes } from './Attributes.js';

/** Every constant of Attributes.java, in declaration order: [name, value]. */
const JAVA_CONSTANTS: readonly (readonly [string, string])[] = [
  ['BOUNDINGBOX', 'bb'],
  ['COMMENT', 'comment'],
  ['COMPOUND', 'compound'],
  ['CONCENTRATE', 'concentrate'],
  ['CROSSMIN_LIMIT', 'mclimit'],
  ['DAMPING', 'Damping'],
  ['EDGEDIR', 'dir'],
  ['EDGELEN', 'len'],
  ['EPSILON', 'epsilon'],
  ['FIXEDSIZE', 'fixedsize'],
  ['FONTNAME', 'fontname'],
  ['FONTSIZE', 'fontsize'],
  ['HEADLABEL', 'headlabel'],
  ['HEADLP', 'head_lp'],
  ['HEIGHT', 'height'],
  ['LABEL', 'label'],
  ['LABELANGLE', 'labelangle'],
  ['LABELDISTANCE', 'labeldistance'],
  ['LABELPOS', 'lp'],
  ['LAYOUT', 'layout'],
  ['LHEAD', 'lhead'],
  ['LTAIL', 'ltail'],
  ['OVERLAP', 'overlap'],
  ['PACK', 'pack'],
  ['PAD', 'pad'],
  ['POS', 'pos'],
  ['MARGIN', 'margin'],
  ['MAXITER', 'maxiter'],
  ['MINDIST', 'mindist'],
  ['NEATO_MODEL', 'model'],
  ['NODESEP', 'nodesep'],
  ['SIMPLEX_LIMIT', 'nslimit'],
  ['RANKDIR', 'rankdir'],
  ['RANKSEP', 'ranksep'],
  ['RATIO', 'ratio'],
  ['SEP', 'sep'],
  ['SHAPE', 'shape'],
  ['SPLINES', 'splines'],
  ['SPRING_CONSTANT', 'K'],
  ['START', 'start'],
  ['STYLE', 'style'],
  ['TAILLABEL', 'taillabel'],
  ['TAILLP', 'tail_lp'],
  ['WEIGHT', 'weight'],
  ['WIDTH', 'width'],
];

describe('Attributes', () => {
  it('declares every Java constant with its Graphviz name', () => {
    const actual = Object.entries(Attributes).filter(([, v]) => typeof v === 'string');
    expect(actual).toEqual(JAVA_CONSTANTS);
  });
});
