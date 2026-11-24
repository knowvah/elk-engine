## Observation: two corpus sweeps fail on main with the local caches (filed: #151, #152)

- **Context**: coverage gate on `feature/public-api-1-0` (2026-11-23); baseline rerun on a detached worktree of `main` at `4c380f26`, with the ignored `test/corpus/.labels-sweep` and `.phase-sweep` caches copied in.
- **Finding**: `test/corpus/labels-sweep.test.ts` reports 2 mismatches (`model/tickets/layered/273_insideSelfLoopsWithLabels/{RIGHT,DOWN}`, oracle `69fe14f4…` vs port `d99a2025…`); `test/corpus/phase-sweep.test.ts` throws `UnsupportedGraphException` from `DepthFirstModelOrderLayerer.process` (`n_Merge` -> `n_TimedPlotter`). Identical on main and on the branch. Both skip when their cache is absent, so a clean checkout skips them.
- **Impact**: `npm run coverage` exits 1 and prints no coverage table while either fails. Not diagnosed (out of scope for the publish work): the mechanism is unknown, so whether the cache is stale or the port diverges is open.
- **Confidence**: High for "pre-existing"; Low for cause.

## Observation: tarball size changes at the first real export surface

- **Context**: `npm run publish:check` with `src/index.ts` exporting the surface.
- **Finding**: 4,221 files, 4.5 MB packed, 23.4 MB unpacked (`dist/index.js` 3.6 MB, map 7.6 MB). `PUBLISHING.md` still says 2.2 MB / 11.5 MB, measured when the bundle was empty.
- **Impact**: update that line before publishing; the source map is about a third of the unpacked size.
- **Confidence**: High

## Observation: a text-pattern sweep misses claims that are stale in meaning, not in wording

- **Context**: #155 rewrote the "Pre-1.0 / exports nothing" notices found by grepping their phrases (2026-11-23).
- **Finding**: The "Public contract" paragraph of `docs-site/guide/overview.md` and `README.md` was missed: it said "Versions stay 0.x until 1.0" (a phrase the sweep did not include) and, independently, listed textual graph formats and algorithm option value types that `docs/architecture/public-api.md` leaves out. It surfaced only when 23 translations of the same paragraph were read.
- **Impact**: After a status change, check every sentence about the API surface or the version against `public-api.md`, not only the phrases that changed. Translated copies of a page multiply the cost of a missed English sentence (one more round of 6 agents).
- **Confidence**: High

## Observation: locale hashes equal the English file at the previous refresh commit

- **Context**: Scoping the 1.0 refresh of the translated home and overview pages.
- **Finding**: `shasum -a 256` of `docs-site/{index,guide/overview}.md` at the commit before #155 equals the locale `sourceHash` (prefix-checked), so the diff of the English page between two commits is exactly the drift to translate. `scripts/i18n-hash.mjs` takes a locale page path or an English `docs-site/` path.
- **Impact**: A refresh brief can quote the English diff and one hash per page. `docs-site/.vitepress/i18n-hashes.json` (written by `docs:i18n-hashes` during `docs:build`) is gitignored and never edits pages.
- **Confidence**: High

## Observation: include line ranges of a wrapper page go stale silently

- **Context**: Refreshing the architecture translations (#133).
- **Finding**: `docs-site/guide/architecture.md` includes `docs/architecture/overview.md` by line ranges. The overview grew
  (status paragraph, 22-row table), the ranges did not, and the built English page lost two sections with no test or
  build error. Found only by reading the built headings.
- **Impact**: any edit that adds or removes lines in an included file shifts the ranges; check the built page headings
  (`docs-site/.vitepress/dist/guide/architecture.html`) after such an edit. A region marker would remove the fragility.
- **Confidence**: High
