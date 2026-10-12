// SPDX-License-Identifier: EPL-2.0
//
// Mirror the generated parity report (docs/parity-report.md) into the VitePress
// site as parity.md so it publishes with the docs. Run as a step of `docs:dev` /
// `docs:build` (see package.json). The copy is gitignored: the source of truth is
// docs/parity-report.md (written by tools/corpus/parity-report.ts); edit that,
// never the copy.
//
// The source has links written for its docs/ location; rewrite them to site
// paths (or GitHub URLs for files outside the site) so they resolve when published.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_BLOB = 'https://github.com/knowvah/elk-engine/blob/main';
const MIRROR_COMMENT =
  '<!-- Mirrored from docs/parity-report.md by docs-site/copy-reports.mjs at docs build time. Edit the source report, not this copy. -->';
const SITE_DIR = 'docs-site';
// Optional prefix a link may carry: same dir, or up-and-back-into docs/.
const DOCS_PREFIX = String.raw`(?:\.\/|\.\.\/docs\/)?`;
const REPO_PREFIX = String.raw`(?:\.\/|\.\.\/)?`;

export const REPORTS = [{ src: '../docs/parity-report.md', dst: 'parity.md', title: 'Parity report' }];

/** [pattern, replacement] pairs applied in order to link targets of the form `](target)`. */
const REWRITES = [
  [new RegExp(String.raw`\]\(${DOCS_PREFIX}conformance\.md(?:#[^)]*)?\)`, 'g'), '](/conformance)'],
  [new RegExp(String.raw`\]\(${DOCS_PREFIX}translation-rules\.md\)`, 'g'), '](/guide/translation-rules)'],
  [new RegExp(String.raw`\]\(${DOCS_PREFIX}architecture\/overview\.md\)`, 'g'), '](/guide/architecture)'],
  [new RegExp(String.raw`\]\(${DOCS_PREFIX}architecture\/(port-map|inventory)\.md\)`, 'g'), '](/guide/$1)'],
  [new RegExp(String.raw`\]\(${REPO_PREFIX}plans\/([^)]+)\)`, 'g'), `](${GITHUB_BLOB}/plans/$1)`],
  [new RegExp(String.raw`\]\(${REPO_PREFIX}test\/corpus\/([^)]+)\)`, 'g'), `](${GITHUB_BLOB}/test/corpus/$1)`],
];

export class MissingReportSourceError extends Error {
  constructor(path) {
    super(`report source not found: ${path}`);
    this.name = 'MissingReportSourceError';
  }
}

export function rewriteReportLinks(md) {
  return REWRITES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), md);
}

export function mirrorReport(md, { src, title }) {
  const front = `---\ntitle: ${title}\n---\n`;
  const note = MIRROR_COMMENT.replace('docs/parity-report.md', src.slice(src.indexOf('docs/')));
  return `${front}\n${note}\n\n${rewriteReportLinks(md)}`;
}

function readSource(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (cause) {
    if (cause?.code === 'ENOENT') throw new MissingReportSourceError(path);
    throw cause;
  }
}

const defaultRoot = () => fileURLToPath(new URL('..', import.meta.url));

export function copyReports(root = defaultRoot()) {
  const written = [];
  for (const entry of REPORTS) {
    const source = readSource(resolve(root, SITE_DIR, entry.src));
    const target = join(root, SITE_DIR, entry.dst);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, mirrorReport(source, entry));
    written.push(`${SITE_DIR}/${entry.dst}`);
  }
  return written;
}

function main() {
  try {
    for (const path of copyReports()) process.stderr.write(`copy-reports: wrote ${path}\n`);
  } catch (error) {
    if (!(error instanceof MissingReportSourceError)) throw error;
    process.stderr.write(`copy-reports: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.main) main();
