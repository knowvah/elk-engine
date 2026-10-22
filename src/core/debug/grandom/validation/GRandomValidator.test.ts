// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Configuration } from '../gRandom/Configuration.js';
import { Form } from '../gRandom/Form.js';
import { GRandomValidator } from './GRandomValidator.js';

const MESSAGE_MD = 'maxDegree only defined on trees.';
const MESSAGE_MW = 'maxWidth only defined on trees.';
const MESSAGE_PF = 'Partition Fraction only defined on bipartite graphs.';

function config(form: Form, flags: { md?: boolean; mw?: boolean; pf?: boolean }): Configuration {
  const c = new Configuration();
  c.setForm(form);
  c.setMD(flags.md ?? false);
  c.setMW(flags.mw ?? false);
  c.setPF(flags.pf ?? false);
  return c;
}

const check = (c: Configuration): [string, string][] =>
  new GRandomValidator().optionsRestrictions(c).map((e) => [e.message, e.feature.getName()]);

describe('GRandomValidator.optionsRestrictions', () => {
  it('reports maxDegree off trees', () => {
    expect(check(config(Form.CUSTOM, { md: true }))).toEqual([[MESSAGE_MD, 'mD']]);
    expect(check(config(Form.TREES, { md: true }))).toEqual([]);
  });

  it('reports maxWidth off trees', () => {
    expect(check(config(Form.BIPARTITE, { mw: true }))).toEqual([[MESSAGE_MW, 'mW']]);
    expect(check(config(Form.TREES, { mw: true }))).toEqual([]);
  });

  it('reports partitionFraction off bipartite graphs', () => {
    expect(check(config(Form.TREES, { pf: true }))).toEqual([[MESSAGE_PF, 'pF']]);
    expect(check(config(Form.BIPARTITE, { pf: true }))).toEqual([]);
  });

  it('reports all three in ERRORS order and nothing without flags', () => {
    expect(check(config(Form.CUSTOM, { md: true, mw: true, pf: true }))).toEqual([
      [MESSAGE_MD, 'mD'],
      [MESSAGE_MW, 'mW'],
      [MESSAGE_PF, 'pF'],
    ]);
    expect(check(config(Form.ACYCLIC, {}))).toEqual([]);
  });
});
