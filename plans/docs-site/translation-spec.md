<!-- SPDX-License-Identifier: EPL-2.0 -->

# Translation spec

The shared spec every translation agent receives verbatim. Per-locale task files name the locale
and point here. After T10, `docs-site/de/` is the reviewed worked example: **read the German page
alongside the English source before translating** (batches 7–11).

## Locales

| Prefix | `lang` | Label (`DocsLocale.label`) |
|---|---|---|
| cs | cs-CZ | Čeština |
| da | da-DK | Dansk |
| de | de-DE | Deutsch |
| es | es-ES | Español |
| et | et-EE | Eesti |
| fi | fi-FI | Suomi |
| fr | fr-FR | Français |
| hu | hu-HU | Magyar |
| is | is-IS | Íslenska |
| it | it-IT | Italiano |
| ja | ja-JP | 日本語 |
| ko | ko-KR | 한국어 |
| nl | nl-NL | Nederlands |
| no | no-NO | Norsk |
| pl | pl-PL | Polski |
| pt-br | pt-BR | Português (Brasil) |
| ro | ro-RO | Română |
| ru | ru-RU | Русский |
| sk | sk-SK | Slovenčina |
| sv | sv-SE | Svenska |
| tr | tr-TR | Türkçe |
| zh-cn | zh-CN | 简体中文 |
| zh-tw | zh-TW | 繁體中文 |

Labels and `lang` match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/*.ts`.

## Page split {#page-split}

Each locale is two agents with disjoint write-sets, then the orchestrator. Paths are under
`docs-site/`.

| Part | Writes (`<p>` = prefix) | English source |
|---|---|---|
| a | `<p>/index.md`, `<p>/guide/{overview,architecture,contributing}.md` | the same relative English pages; `architecture` ← `docs/architecture/overview.md` + `docs/architecture/component-map.md` (translate the included content into one full page; keep the `/diagrams/*.svg` image references) |
| b | `<p>/conformance.md`, `<p>/guide/java-foundations.md`, `.vitepress/locales/goldens/<p>.json` | `conformance.md` ← `docs/conformance.md` (full page, not an `@include`); `java-foundations.md` ← the English page; goldens ← every `id` in `test/corpus/manifest.json` `golden[]` plus the `$showcase` block (keys listed in `copy-goldens.mjs`) |
| orchestrator | `.vitepress/locales/<p>.ts` (registration, written last) | — |

English-only pages are never translated: `parity.md`, `guide/translation-rules.md`,
`guide/collections-rules.md`, `guide/port-map.md`, `guide/inventory.md`, `guide/roadmap.md`,
`showcase/` (generated per locale by `copy-goldens.mjs`).

## Hard rules

1. **Front matter.** Every page starts with front matter containing `sourceHash:` — the SHA-256
   hex computed by `node scripts/i18n-hash.mjs <english-path>` (for a page with two included
   sources, pass the locale page path; the script resolves the sources). Keep existing English
   front-matter keys; translate values (`hero.text`, `tagline`, `features[].title/details`,
   action `text`), never keys. `hero.name` stays `@knowvah/elk-engine`.
2. **Code fences are byte-identical** — every fence, same order, same language tag. Comments
   inside code stay English. The lint fails on any difference.
3. **Never translate:** Java and TypeScript identifiers (`ElkNode`, `JavaHashMap`, `l2i`,
   `Double.toString`…), type names, ELK option ids (`org.eclipse.elk.layered.spacing.nodeNode`,
   `elk.algorithm`), algorithm ids (`layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`,
   `spore`, `topdownpacking`, `vertiflex`), bundle names (`org.eclipse.elk.alg.layered`), file paths,
   vector file names (`collections.json`), golden ids, commit shas, AD-/M-/D- decision ids,
   product nouns (Eclipse ELK, ELK JSON, Knowvah, VitePress, TypeScript, JVM, Java), inline `code`.
4. **Internal links take the prefix**: `/guide/overview` → `/<p>/guide/overview`. Exceptions stay
   unprefixed: the English-only pages above and `/showcase/…` is prefixed (it is generated per
   locale). Anchors on English-only pages are kept as-is; on translated pages use the anchor
   VitePress generates from the translated heading. External URLs unchanged.
5. **Component strings are substituted, not translated freely.** When prose names a gallery
   control ("Click to enlarge", "ELK JSON source"), use the exact string the orchestrator gives
   you in the prompt's `components` block. The orchestrator decides those strings and the nav `ui`
   labels before dispatch and writes `.vitepress/locales/<p>.ts` only after both parts pass lint —
   any file in `locales/` is auto-registered, so it must never exist early.
6. **Vue components and containers stay as-is**: `<GoldenGallery algorithm="…"/>`,
   `<ElkDiagram …/>`, `::: tip` (translate the body and a custom title if present).
7. **Structure mirrors English**: same headings in the same order, same tables (translate cells
   except identifiers), same images (`/diagrams/…` paths unchanged).

## Glossary

Use consistently within a locale. The German column is filled by T10 and is the model for the
others; each later locale appends its own terms to its commit body rather than editing this table
(one writer).

| English | de |
|---|---|
| node | |
| edge | |
| port (ElkPort) | |
| label | |
| hierarchy / compound node | |
| layout algorithm | |
| oracle (ELK built from source) | |
| golden (test case) | |
| conformance / divergence | |
| tolerance | |
| vector (JVM reference vector) | |
| shim (Java runtime shim) | |
| port (of ELK to TypeScript) | |

## Tone

Second person, technical, plain — match the English register. Formal address where the language
distinguishes (de *Sie*, fr *vous*, …), matching dot-atlassian's choices for the same locale.

## Commit

`feat(docs): translate the docs site into <language>` — one commit per locale, ≤72-char subject,
body wrapped at 80: glossary choices, any wording a non-reader would have to take on trust, and
any quarantined page. Body ends with `Task: TN (docs-site batch N)`. No attribution lines.
