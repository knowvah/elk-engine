// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { type AcceptedFinding, compareFindings, findingsOf, formatReport } from '../../tools/codeql/check.js';

const RULE = 'js/redundant-operation';
const FILE = 'src/alg/mrtree/ElkGraphImporter.ts';
const HASH = '1a2b3c4d5e6f7a8b:1';

const result = (ruleId: string, uri: string, line: number, hash: string, text = 'msg') => ({
  ruleId,
  message: { text },
  locations: [{ physicalLocation: { artifactLocation: { uri }, region: { startLine: line } } }],
  partialFingerprints: { primaryLocationLineHash: hash },
});
const sarif = (...results: unknown[]) => ({ runs: [{ results }] });
const accepted = (over: Partial<AcceptedFinding> = {}): AcceptedFinding => ({
  rule: RULE,
  file: FILE,
  fingerprint: HASH,
  reason: 'Java-faithful: ElkGraphImporter.java:122',
  ...over,
});

describe('findingsOf', () => {
  it('reads rule, file, line, fingerprint and message from every run', () => {
    const doc = {
      runs: [
        { results: [result(RULE, FILE, 94, HASH, 'identical')] },
        { results: [result('java/x', 'A.java', 3, 'ff:1')] },
      ],
    };
    expect(findingsOf(doc)).toEqual([
      { rule: RULE, file: FILE, line: 94, fingerprint: HASH, message: 'identical' },
      { rule: 'java/x', file: 'A.java', line: 3, fingerprint: 'ff:1', message: 'msg' },
    ]);
  });

  it('rejects a result without a primary location fingerprint', () => {
    const bare = { ruleId: RULE, message: { text: 'm' }, locations: result(RULE, FILE, 1, HASH).locations };
    expect(() => findingsOf(sarif(bare))).toThrow(`CodeQL result ${RULE} at ${FILE}:1 has no primaryLocationLineHash`);
  });
});

describe('compareFindings', () => {
  it('passes a finding that matches an accepted entry by rule, file and fingerprint, wherever its line moved', () => {
    const findings = findingsOf(sarif(result(RULE, FILE, 120, HASH)));
    expect(compareFindings(findings, [accepted()])).toEqual({ unaccepted: [], stale: [] });
  });

  it('reports a finding no entry accepts, and an entry no finding matches', () => {
    const findings = findingsOf(
      sarif(result(RULE, FILE, 94, 'other:1'), result('js/unused-local-variable', 'test/a.ts', 7, HASH)),
    );
    const report = compareFindings(findings, [accepted()]);
    expect(report.unaccepted.map((f) => `${f.rule} ${f.file}:${f.line}`)).toEqual([
      `${RULE} ${FILE}:94`,
      'js/unused-local-variable test/a.ts:7',
    ]);
    expect(report.stale).toEqual([accepted()]);
  });
});

describe('formatReport', () => {
  it('lists unaccepted findings and stale entries, and says so when there are none', () => {
    const findings = findingsOf(sarif(result(RULE, FILE, 94, 'x:1', 'Operands are identical.')));
    expect(formatReport(compareFindings(findings, [accepted()]))).toBe(
      [
        'codeql: 1 finding not in tools/codeql/accepted.json:',
        `  ${RULE} ${FILE}:94 Operands are identical. (fingerprint x:1)`,
        'codeql: 1 accepted entry no longer found (remove it):',
        `  ${RULE} ${FILE} (fingerprint ${HASH})`,
      ].join('\n'),
    );
    expect(formatReport({ unaccepted: [], stale: [] })).toBe('codeql: ok, every finding is accepted');
  });
});
