// SPDX-License-Identifier: EPL-2.0
// Copy step (run in docs:build / docs:dev, like copy-reports.mjs): read the
// golden manifest (`golden[]`) and the oracle ELK JSON layouts it lists, and
// inject them into the docs site: (1) a data file the showcase gallery
// imports, and (2) one generated page per layout algorithm plus a showcase
// index. The goldens are ORACLE outputs (ELK Java built from source) and they
// render CLIENT-SIDE in the browser from their JSON; see
// .vitepress/theme/GoldenGallery.vue.
//
// English descriptions live in `.vitepress/locales/goldens/en.json`
// (`{ "<goldenId>": "<description>", "$showcase": { … } }`). Every locale
// module found at `.vitepress/locales/<p>.ts` additionally gets
//   - `.vitepress/goldens.<p>.json`: the same data with descriptions taken
//     from `.vitepress/locales/goldens/<p>.json` (per-id English fallback);
//   - `<p>/showcase/{index,<algorithm>}.md`: pages with translated prose and
//     `/<p>/`-prefixed internal links.
//
// Keys starting with `$` are not golden ids. The optional `$showcase` object
// overrides the English defaults in EN_SHOWCASE below (every key is optional;
// a missing key falls back to English). `en.json`'s `$showcase` must equal
// EN_SHOWCASE so translators have one source to copy. Templates use `{name}`
// placeholders, filled by the generator:
//
//   indexTitle        front-matter title of the index page
//   indexHeading      H1 of the index page
//   indexIntro        paragraph before the algorithm list; {total}
//   indexRowCount     per-algorithm count suffix on the index; {count}
//   indexOutro        closing paragraph; {conformance} = the link to the
//                     conformance page (rendered from conformanceLabel)
//   conformanceLabel  link text of the conformance link
//   algorithmTitle    front-matter title of an algorithm page; {algorithm}
//   algorithmHeading  H1 of an algorithm page; {algorithm}, {count}
//   algorithmIntro    sentence after the blurb on an algorithm page
//   blurbs            { layered }: one-line description of each algorithm
//
// Importing this module has no side effects; the generator runs only when the
// file is executed directly (`node docs-site/copy-goldens.mjs`).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // docs-site/
const REPO = join(HERE, '..'); // repo root
const MANIFEST = join(REPO, 'test/corpus/manifest.json');
const REFS_DIR = join(REPO, 'test/golden/refs/elk');
const LOCALES_DIR = join(HERE, '.vitepress/locales');
const LOCALE_GOLDENS_DIR = join(LOCALES_DIR, 'goldens');
const SHOWCASE_KEY = '$showcase';
const MODULE_EXT = '.ts';
const ELK_PREFIX = 'org.eclipse.elk.';
// A plain YAML scalar cannot hold `:`/`#`, start with an indicator, or end in a space (\x22 is a double quote).
const YAML_UNSAFE = /[:#]|^[\s'\x22{}[\]&*!|>%@`,?-]|\s$/;

/** English showcase prose; see the key list in the header comment. */
export const EN_SHOWCASE = {
  indexTitle: 'Showcase',
  indexHeading: 'Showcase: the golden corpus',
  indexIntro: `Every graph in this section is one of **{total} golden layouts** produced by the ELK Java reference implementation (the oracle, built from source). They are stored as ELK JSON and rendered **live in your browser** from that JSON. One page per layout algorithm:`,
  indexRowCount: '{count} goldens',
  indexOutro: `Each card shows the oracle layout, a short description, and, folded away, the ELK JSON it is drawn from. These are the layouts the TypeScript port is held to (see {conformance}).`,
  conformanceLabel: 'Conformance',
  algorithmTitle: '{algorithm} goldens',
  algorithmHeading: '{algorithm}: {count} goldens',
  algorithmIntro: 'Each graph below is an oracle layout rendered live in your browser from its ELK JSON.',
  blurbs: {
    layered: 'Layer-based (Sugiyama-style) layout for node-link diagrams with ports and hierarchy.',
  },
};

/** The site's algorithm id: the ELK algorithm id without its package prefix. */
export function siteAlgorithmId(algorithm) {
  return algorithm.startsWith(ELK_PREFIX) ? algorithm.slice(ELK_PREFIX.length) : algorithm;
}

/** Replace each `{name}` in `template` with `vars[name]`. */
export function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

/** English showcase strings overridden key-by-key (blurbs per algorithm). */
export function resolveShowcase(overrides) {
  const o = overrides ?? {};
  return {
    ...EN_SHOWCASE,
    ...o,
    blurbs: { ...EN_SHOWCASE.blurbs, ...(o.blurbs ?? {}) },
  };
}

/**
 * Entries with `description` replaced by the translation when one exists
 * (per-id English fallback). `missingIds` lists entries with no translation.
 * Keys of `translations` starting with `$` are not ids.
 */
export function localizeGoldens(entries, translations) {
  const missingIds = [];
  const localized = entries.map((e) => {
    const t = translations[e.id];
    if (typeof t === 'string') {
      return { ...e, description: t };
    }
    missingIds.push(e.id);
    return { ...e };
  });
  return { entries: localized, missingIds };
}

/** URL prefix for a locale: '' for English, `/<p>` otherwise. */
function urlBase(prefix) {
  return prefix ? `/${prefix}` : '';
}

/**
 * A front-matter value: plain when YAML reads it back unchanged, else
 * double-quoted (JSON strings are valid YAML). Translated titles can contain
 * `: `, which a plain scalar cannot.
 */
export function yamlScalar(value) {
  return YAML_UNSAFE.test(value) ? JSON.stringify(value) : value;
}

/** Markdown of the showcase index page. */
export function renderShowcaseIndex(prefix, order, counts, strings) {
  const s = resolveShowcase(strings);
  const base = urlBase(prefix);
  const total = order.reduce((n, alg) => n + counts[alg], 0);
  const rows = order
    .map((alg) => {
      const count = fillTemplate(s.indexRowCount, { count: counts[alg] });
      return `- [**${alg}**](${base}/showcase/${alg}) — ${s.blurbs[alg] ?? ''} _(${count})_`;
    })
    .join('\n');
  const conformance = `[${s.conformanceLabel}](${base}/conformance)`;
  return `---
title: ${yamlScalar(s.indexTitle)}
---

# ${s.indexHeading}

${fillTemplate(s.indexIntro, { total })}

${rows}

${fillTemplate(s.indexOutro, { conformance })}
`;
}

/** Markdown of one algorithm's showcase page. */
export function renderAlgorithmPage(algorithm, count, strings) {
  const s = resolveShowcase(strings);
  const vars = { algorithm, count };
  const lead = [s.blurbs[algorithm], s.algorithmIntro].filter(Boolean).join(' ');
  return `---
title: ${yamlScalar(fillTemplate(s.algorithmTitle, vars))}
---

# ${fillTemplate(s.algorithmHeading, vars)}

${lead}

<GoldenGallery algorithm="${algorithm}" />
`;
}

/** Group entries (with their parsed ELK JSON graph) by site algorithm id. */
export function groupByAlgorithm(entries, readGraph) {
  const byAlgorithm = {};
  for (const e of entries) {
    const algorithm = siteAlgorithmId(e.algorithm);
    (byAlgorithm[algorithm] ??= []).push({
      id: e.id,
      description: e.description,
      algorithm,
      graph: readGraph(e.id),
    });
  }
  const order = Object.keys(byAlgorithm).sort();
  const counts = Object.fromEntries(order.map((alg) => [alg, byAlgorithm[alg].length]));
  return { order, counts, byAlgorithm };
}

/** Locale prefixes = `*.ts` modules directly in `localesDir` (sorted). */
export function listLocalePrefixes(localesDir) {
  if (!existsSync(localesDir)) return [];
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(MODULE_EXT))
    .map((d) => d.name.slice(0, -MODULE_EXT.length))
    .sort();
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function readTranslations(prefix) {
  const file = join(LOCALE_GOLDENS_DIR, `${prefix}.json`);
  return existsSync(file) ? readJson(file) : {};
}

function writeShowcasePages(dir, prefix, grouped, strings) {
  mkdirSync(dir, { recursive: true });
  const { order, counts } = grouped;
  writeFileSync(join(dir, 'index.md'), renderShowcaseIndex(prefix, order, counts, strings));
  for (const alg of order) {
    writeFileSync(join(dir, `${alg}.md`), renderAlgorithmPage(alg, counts[alg], strings));
  }
}

function writeData(file, grouped) {
  writeFileSync(file, JSON.stringify({ byAlgorithm: grouped.byAlgorithm }));
}

function writeLocale(prefix, entries, readGraph) {
  const translations = readTranslations(prefix);
  const localized = localizeGoldens(entries, translations);
  const grouped = groupByAlgorithm(localized.entries, readGraph);
  writeData(join(HERE, `.vitepress/goldens.${prefix}.json`), grouped);
  writeShowcasePages(join(HERE, prefix, 'showcase'), prefix, grouped, translations[SHOWCASE_KEY]);
  const done = localized.entries.length - localized.missingIds.length;
  console.log(`[copy-goldens] ${prefix}: ${done}/${localized.entries.length} descriptions translated`);
}

function main() {
  const english = readJson(join(LOCALE_GOLDENS_DIR, 'en.json'));
  const entries = readJson(MANIFEST).golden.map((g) => ({
    id: g.id,
    algorithm: g.algorithm,
    description: english[g.id] ?? g.note,
  }));
  const readGraph = (id) => readJson(join(REFS_DIR, `${id}.json`));
  const grouped = groupByAlgorithm(entries, readGraph);

  // (1) data the client gallery imports (gitignored, generated).
  writeData(join(HERE, '.vitepress/goldens.json'), grouped);
  // (2) generated pages: a showcase index + one page per algorithm (gitignored).
  writeShowcasePages(join(HERE, 'showcase'), '', grouped, english[SHOWCASE_KEY]);
  console.log(
    `[copy-goldens] ${entries.length} goldens / ${grouped.order.length} algorithms → goldens.json + ${grouped.order.length + 1} pages`,
  );
  for (const prefix of listLocalePrefixes(LOCALES_DIR)) {
    writeLocale(prefix, entries, readGraph);
  }
}

if (import.meta.main) main();
