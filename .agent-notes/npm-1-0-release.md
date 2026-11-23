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
