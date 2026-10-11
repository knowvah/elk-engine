<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — elk-models corpus wiring

**Agent:** typescript-pro · **Commit:** `test(corpus): pin elk-models and add corpus resolver`

## Context
ELK's test models live in `eclipse-elk/elk-models` (550 `.json`, 550
`.elkg`, 898 `.elkt`; directories `examples/`, `realworld/`, `tests/`,
`tickets/`). The user's clone is at `$ELK_MODELS_DIR`, default
`../../eclipse-elk/elk-models` relative to the repo root, at
`ac5af2ba511c0037e4f347e8bd91f013950951c7`. It is read-only (stop #7).
Only `.json` models are usable by TS before the elkt→json conversion
mission.

## Task
Pin the corpus, select 3–5 golden models, add a resolver used by tests and
scripts, and a fetch script for fresh machines.

## Write-set
`test/corpus/manifest.json`, `test/corpus/fetch.sh`,
`test/corpus/corpus.ts`, `test/corpus/corpus.test.ts`.

## Read-set
- `$ELK_MODELS_DIR/` (browse `examples/`, `tests/` for small `.json`)
- `../decisions.md#ad-5-goldens-and-corpus`, `#ad-15…`

## Golden selection (push-forward)
3–5 `.json` models, each < 50 nodes, that together exercise ports,
labels, and hierarchy (nested children), and that set a deterministic
algorithm (layered/mrtree/force with fixed seed, or no randomness). Prefer
`examples/` or `tests/`. Record why each was chosen in a `note` field.

## Interface contract (output; consumed by T16 and future missions)
```ts
// test/corpus/manifest.json
interface CorpusManifest {
  repo: 'eclipse-elk/elk-models';
  commit: 'ac5af2ba511c0037e4f347e8bd91f013950951c7';
  golden: { id: string /* kebab-case, unique */; path: string /* relative to models root */; note: string }[];
}
// test/corpus/corpus.ts
export function repoRoot(): string;
export function loadManifest(): CorpusManifest;
export function resolveModelsDir(): { dir: string } | { skip: string };
//   ELK_MODELS_DIR env, else <repoRoot>/../../eclipse-elk/elk-models;
//   { skip } when missing or `git rev-parse HEAD` ≠ manifest.commit (message names both)
```
- `fetch.sh`: if the dir is missing, `git clone https://github.com/eclipse-elk/elk-models`
  into it and `git checkout --detach <commit>`; if present at another
  commit, exit 2 with a message — never modify an existing clone.

## Acceptance criteria
- Given `ELK_MODELS_DIR` unset, then `resolveModelsDir()` uses
  `<repoRoot>/../../eclipse-elk/elk-models`.
- Given a directory at a different commit, then the result is a `skip`
  naming both shas (test via a temp git repo).
- Given the pinned clone, then every manifest `path` exists and parses as
  JSON; ids are unique.
- Given `fetch.sh` against an existing clone at the wrong commit, then exit
  2 and the clone is untouched.

## Quality bar
Gates in README.md (brief). `test/corpus/corpus.ts` is test-side code
(Node APIs allowed). shellcheck-clean `fetch.sh`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
