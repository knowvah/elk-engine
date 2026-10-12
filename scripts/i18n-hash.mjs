// SPDX-License-Identifier: EPL-2.0
// Drift tracking for translated docs pages (decision D9). Every translated
// page records `sourceHash: <sha256 hex of its English source>` in its front
// matter. Translators obtain the value with
//   node scripts/i18n-hash.mjs <path>
// where <path> is an English file, or the locale page itself
// (docs-site/<p>/guide/architecture.md) to hash all of its English sources.
// Importing this module has no side effects.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../..');
export const SITE_DIR = 'docs-site';

/** A locale directory name: `de`, `pt-br`, `zh-cn` … */
export const LOCALE_PREFIX_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

/**
 * Locale-relative pages whose English source is not the page itself: the
 * wrapper pages `@include` repo docs, so the hash covers those files, in
 * include order.
 */
export const INCLUDED_SOURCES = {
  'conformance.md': ['docs/conformance.md'],
  'guide/architecture.md': ['docs/architecture/overview.md', 'docs/architecture/component-map.md'],
};

/** Repo-relative, `/`-separated form of `path` (absolute paths tolerated). */
function toRepoRelative(path, root) {
  const rel = isAbsolute(path) ? relative(root, path) : path;
  return rel.split(sep).join('/');
}

/** `{ prefix, rel }` of `docs-site/<prefix>/<rel>`, or null if not a locale page. */
export function splitLocalePage(localePagePath, root = REPO_ROOT) {
  const parts = toRepoRelative(localePagePath, root).split('/');
  if (parts[0] !== SITE_DIR || !LOCALE_PREFIX_PATTERN.test(parts[1] ?? '')) return null;
  if (parts.length < 3) return null;
  return { prefix: parts[1], rel: parts.slice(2).join('/') };
}

/**
 * Repo-relative paths of the English files a translated page derives from,
 * in hashing order: the `INCLUDED_SOURCES` entry, else `docs-site/<rel>`.
 */
export function englishSourceFor(localePagePath, root = REPO_ROOT) {
  const page = splitLocalePage(localePagePath, root);
  if (!page) {
    throw new Error(`"${localePagePath}" is not a locale page; expected docs-site/<prefix>/<page>.md`);
  }
  return INCLUDED_SOURCES[page.rel] ?? [`${SITE_DIR}/${page.rel}`];
}

/** sha256 hex of the concatenated bytes of the file(s), in order; relative paths resolve against `root`. */
export function hashSource(paths, root = REPO_ROOT) {
  const hash = createHash('sha256');
  for (const path of [paths].flat()) hash.update(readFileSync(resolve(root, path)));
  return hash.digest('hex');
}

/** The `sourceHash` value in a page's leading `---` front matter, or undefined. */
export function parseSourceHash(markdown) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!m) return undefined;
  const line = /^sourceHash:\s*["']?([0-9a-f]{64})["']?\s*$/im.exec(m[1]);
  return line?.[1];
}

/** Sources to hash for a CLI argument: a locale page's English sources, or the file itself. */
function sourcesForCli(target) {
  return splitLocalePage(target) ? englishSourceFor(target) : [target];
}

if (import.meta.main) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: node scripts/i18n-hash.mjs <english-source-path | locale-page-path>');
    process.exitCode = 2;
  } else {
    console.log(hashSource(sourcesForCli(target)));
  }
}
