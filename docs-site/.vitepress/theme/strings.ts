// SPDX-License-Identifier: EPL-2.0
/**
 * User-visible strings of the site's interactive components (the ELK
 * diagram viewer and the stale-translation banner), with English defaults.
 *
 * This module is client-safe — no Node built-ins — because the theme
 * components import it. Each locale supplies its own `ComponentStrings` in
 * `.vitepress/locales/<prefix>.ts`; `config.ts` exposes them to the client as
 * `themeConfig.componentsByLang`, and components resolve the active one with
 * `pickStrings(useData().lang.value, useData().theme.value.componentsByLang)`.
 * The registry itself (`i18n.ts`) reads the filesystem and stays build-side.
 */

export interface ComponentStrings {
  /** Diagram source `<summary>`. */
  elkSource: string;
  /** Fallback when a render error has no friendly message. */
  renderFailed: string;
  /** Thumbnail tooltip. */
  clickToEnlarge: string;
  /** Placeholder while a diagram renders. */
  rendering: string;
  /** Modal close-button aria-label. */
  close: string;
  /** Stale-translation banner body. */
  staleNotice: string;
  /** Stale-translation banner link to the English page. */
  staleLink: string;
}

export const EN_COMPONENTS: ComponentStrings = {
  elkSource: 'ELK JSON source',
  renderFailed: 'Render failed',
  clickToEnlarge: 'Click to enlarge',
  rendering: 'rendering…',
  close: 'Close',
  staleNotice: 'The English version of this page has changed since it was translated.',
  staleLink: 'Read the current English page',
};

/**
 * The strings for `lang` from a `lang → strings` table, or English when the
 * table is absent or has no entry for it (the root locale never has one).
 */
export function pickStrings(lang: string, byLang?: Readonly<Record<string, ComponentStrings>>): ComponentStrings {
  return byLang?.[lang] ?? EN_COMPONENTS;
}
