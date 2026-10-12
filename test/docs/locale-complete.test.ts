// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertLocaleComplete,
  EN,
  LOCALES,
  navFor,
  sidebarFor,
  stringsForLang,
  TRANSLATABLE_EXCLUDES,
  type NavLabels,
  type SidebarGroup,
} from '../../docs-site/.vitepress/i18n.js';
import { EN_COMPONENTS, pickStrings, type ComponentStrings } from '../../docs-site/.vitepress/theme/strings.js';

const FIXTURE_ROOT = fileURLToPath(new URL('./fixtures/site/', import.meta.url));
const FIXTURE_LOCALES = ['xx', 'yy'];
const XX_UI: NavLabels = { ...EN, guide: 'Gyde', englishOnly: '(Inglish)' };

/** The English sidebar, group by group (decisions.md#english-only). */
const EN_SIDEBAR: SidebarGroup[] = [
  {
    text: 'Guide',
    items: [
      { text: 'Overview', link: '/guide/overview' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'Java foundations', link: '/guide/java-foundations' },
      { text: 'Contributing', link: '/guide/contributing' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Translation rules', link: '/guide/translation-rules' },
      { text: 'Collections rules', link: '/guide/collections-rules' },
      { text: 'Port map', link: '/guide/port-map' },
      { text: 'Inventory', link: '/guide/inventory' },
      { text: 'Roadmap', link: '/guide/roadmap' },
    ],
  },
  {
    text: 'Verification',
    items: [
      { text: 'Conformance', link: '/conformance' },
      { text: 'Parity', link: '/parity' },
    ],
  },
  {
    text: 'Showcase',
    items: [
      { text: 'The golden corpus', link: '/showcase/' },
      { text: 'layered', link: '/showcase/layered' },
    ],
  },
];

describe('assertLocaleComplete', () => {
  it('names the missing translatable page', () => {
    expect(() => assertLocaleComplete(FIXTURE_ROOT, 'xx', TRANSLATABLE_EXCLUDES, FIXTURE_LOCALES)).toThrow(
      /missing 1 of 2 pages:\n {2}docs-site\/xx\/guide\/overview\.md\n/,
    );
  });

  it('ignores excluded pages, dot-dirs, public/ and other locales', () => {
    // yy lacks parity.md, guide/roadmap.md and showcase/x.md, all excluded;
    // .vitepress/ and public/ pages are not English pages; xx's own tree must
    // not count as English pages for yy.
    expect(() => assertLocaleComplete(FIXTURE_ROOT, 'yy', TRANSLATABLE_EXCLUDES, FIXTURE_LOCALES)).not.toThrow();
  });

  it('counts a page as missing once its exclusion is lifted', () => {
    const withoutParity = TRANSLATABLE_EXCLUDES.filter((e) => e !== 'parity.md');
    expect(() => assertLocaleComplete(FIXTURE_ROOT, 'yy', withoutParity, FIXTURE_LOCALES)).toThrow(
      /docs-site\/yy\/parity\.md/,
    );
  });
});

describe('navFor / sidebarFor', () => {
  const nav = navFor('/xx', XX_UI);

  it('prefixes translated pages and keeps English-only ones unprefixed', () => {
    expect(nav.find((i) => i.link === '/xx/guide/overview')?.text).toBe('Gyde');
    expect(nav.find((i) => i.link === '/parity')?.text).toBe('Parity (Inglish)');
    expect(nav.find((i) => i.link === '/guide/translation-rules')?.text).toBe('Reference (Inglish)');
    expect(nav.some((i) => i.link.startsWith('/xx/parity'))).toBe(false);
  });

  it('marks exactly the unprefixed sidebar links English-only', () => {
    const links = sidebarFor('/xx', XX_UI).flatMap((g) => g.items);
    const unprefixed = links.filter((i) => !i.link.startsWith('/xx/'));
    expect(unprefixed.map((i) => i.link)).toEqual([
      '/guide/translation-rules',
      '/guide/collections-rules',
      '/guide/port-map',
      '/guide/inventory',
      '/guide/roadmap',
      '/parity',
    ]);
    expect(unprefixed.map((i) => i.text.endsWith('(Inglish)'))).toEqual([true, true, true, true, true, true]);
    expect(links.filter((i) => i.link.startsWith('/xx/')).every((i) => !i.text.endsWith('(Inglish)'))).toBe(true);
    expect(links.find((i) => i.link === '/xx/conformance')?.text).toBe('Conformance');
  });

  it('reproduces the English nav exactly for the root', () => {
    expect(navFor('', EN)).toEqual([
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Reference', link: '/guide/translation-rules' },
      { text: 'Conformance', link: '/conformance' },
      { text: 'Parity', link: '/parity' },
      { text: 'Showcase', link: '/showcase/' },
    ]);
  });

  it('reproduces the English sidebar exactly for the root', () => {
    expect(sidebarFor('', EN)).toEqual(EN_SIDEBAR);
  });
});

describe('component strings', () => {
  const de: ComponentStrings = { ...EN_COMPONENTS, close: 'Schliessen' };

  it('falls back to English for an unknown lang', () => {
    expect(stringsForLang('zz-ZZ')).toBe(EN_COMPONENTS);
    expect(pickStrings('zz-ZZ')).toBe(EN_COMPONENTS);
    expect(pickStrings('zz-ZZ', { 'de-DE': de })).toBe(EN_COMPONENTS);
  });

  it('picks the registered lang', () => {
    expect(pickStrings('de-DE', { 'de-DE': de }).close).toBe('Schliessen');
  });

  it('has the English component defaults', () => {
    expect(EN_COMPONENTS.elkSource).toBe('ELK JSON source');
    expect(EN_COMPONENTS.rendering).toBe('rendering…');
  });
});

describe('LOCALES', () => {
  // Registration is discovery: the registry must equal the module files on disk, no more, no less.
  it('registers exactly the locale modules on disk', () => {
    const dir = fileURLToPath(new URL('../../docs-site/.vitepress/locales/', import.meta.url));
    const modules = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith('.ts'))
          .map((f) => f.slice(0, -3))
          .sort()
      : [];
    expect(Object.keys(LOCALES).sort()).toEqual(modules);
    for (const loc of Object.values(LOCALES)) expect(stringsForLang(loc.lang)).toBe(loc.components);
  });
});
