// SPDX-License-Identifier: EPL-2.0
// The CodeQL gate's verdict: every finding of GitHub Code Quality's suites, run locally by tools/codeql/scan.sh, must be
// listed in tools/codeql/accepted.json with a reason (a faithful port of a Java quirk, or a false positive), and every
// entry there must still match a finding. Entries match by rule, file and CodeQL's primaryLocationLineHash, which
// identifies the line by its content, so they survive line shifts and lapse when that line changes.
//
//   npx tsx tools/codeql/check.ts <accepted.json> <results.sarif>...   exit 0 ok, 1 unaccepted or stale entries
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export interface Finding {
  readonly rule: string;
  readonly file: string;
  readonly line: number;
  readonly fingerprint: string;
  readonly message: string;
}

export interface AcceptedFinding {
  readonly rule: string;
  readonly file: string;
  readonly fingerprint: string;
  readonly reason: string;
}

export interface Report {
  readonly unaccepted: readonly Finding[];
  readonly stale: readonly AcceptedFinding[];
}

interface SarifResult {
  readonly ruleId: string;
  readonly message: { readonly text: string };
  readonly locations: readonly {
    readonly physicalLocation: {
      readonly artifactLocation: { readonly uri: string };
      readonly region: { readonly startLine: number };
    };
  }[];
  readonly partialFingerprints?: { readonly primaryLocationLineHash?: string };
}

const ACCEPTED_FILE = 'tools/codeql/accepted.json';

/** The findings of a SARIF document, from every run. */
export function findingsOf(sarif: unknown): Finding[] {
  const runs = (sarif as { runs: { results: SarifResult[] }[] }).runs;
  return runs.flatMap((run) =>
    run.results.map((r) => {
      const location = r.locations[0]?.physicalLocation;
      const file = location?.artifactLocation.uri ?? '';
      const line = location?.region.startLine ?? 0;
      const fingerprint = r.partialFingerprints?.primaryLocationLineHash;
      if (fingerprint === undefined)
        throw new Error(`CodeQL result ${r.ruleId} at ${file}:${line} has no primaryLocationLineHash`);
      return { rule: r.ruleId, file, line, fingerprint, message: r.message.text.replace(/\s+/g, ' ') };
    }),
  );
}

const keyOf = (f: { rule: string; file: string; fingerprint: string }): string =>
  `${f.rule}\u0000${f.file}\u0000${f.fingerprint}`;

/** Findings no entry accepts, and entries no finding matches. */
export function compareFindings(findings: readonly Finding[], accepted: readonly AcceptedFinding[]): Report {
  const acceptedKeys = new Set(accepted.map(keyOf));
  const foundKeys = new Set(findings.map(keyOf));
  return {
    unaccepted: findings.filter((f) => !acceptedKeys.has(keyOf(f))),
    stale: accepted.filter((a) => !foundKeys.has(keyOf(a))),
  };
}

export function formatReport(report: Report): string {
  if (report.unaccepted.length === 0 && report.stale.length === 0) return 'codeql: ok, every finding is accepted';
  const lines: string[] = [];
  if (report.unaccepted.length > 0) {
    lines.push(
      `codeql: ${report.unaccepted.length} finding${report.unaccepted.length === 1 ? '' : 's'} not in ${ACCEPTED_FILE}:`,
    );
    for (const f of report.unaccepted)
      lines.push(`  ${f.rule} ${f.file}:${f.line} ${f.message} (fingerprint ${f.fingerprint})`);
  }
  if (report.stale.length > 0) {
    lines.push(
      `codeql: ${report.stale.length} accepted entr${report.stale.length === 1 ? 'y' : 'ies'} no longer found (remove it):`,
    );
    for (const a of report.stale) lines.push(`  ${a.rule} ${a.file} (fingerprint ${a.fingerprint})`);
  }
  return lines.join('\n');
}

/* v8 ignore start -- CLI wiring */
function main(argv: readonly string[]): number {
  const [acceptedPath, ...sarifPaths] = argv;
  if (acceptedPath === undefined || sarifPaths.length === 0) {
    process.stderr.write('usage: check.ts <accepted.json> <results.sarif>...\n');
    return 2;
  }
  const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8')) as AcceptedFinding[];
  const findings = sarifPaths.flatMap((p) => findingsOf(JSON.parse(readFileSync(p, 'utf8'))));
  const report = compareFindings(findings, accepted);
  process.stdout.write(`${formatReport(report)}\n`);
  return report.unaccepted.length === 0 && report.stale.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
/* v8 ignore stop */
