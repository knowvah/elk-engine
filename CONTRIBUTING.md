<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contributing

## Quality gates

Run these in order before you push and keep them green. They are the same commands CI runs (job
`ci` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

```bash
npm run format:check   # prettier --check .
npm run typecheck      # native TypeScript, must be clean
npm run coverage       # npm test + the 90% line/branch/function/statement thresholds
npm run docs:build     # docs site: locale completeness, dead links, showcase and parity pages
```

The golden suite runs inside `npm test` (and therefore `npm run coverage`). Its expected values come
from the oracle (ELK built from source), JVM vectors, or the Java source, and they are written
before the implementation. A failing test means the implementation is wrong: never loosen a
tolerance, delete a case, or regenerate a reference to get green. See "Tests Are Immutable" in
[`CLAUDE.md`](CLAUDE.md).

## Branches and commits

- Branch prefixes: `feature/`, `fix/`, `chore/`, `docs/`, then a short kebab-case description.
- Commits follow Conventional Commits: `<type>(<scope>): <description>`. The subject is at most 72
  characters, lowercase, with no trailing period. The body explains why, not what.
- Make one logical commit per task. They are preserved on `main` (see below).

## Pull requests

The `main` branch ruleset requires:

| Rule               | Consequence                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| Pull requests only | No direct pushes to `main`                                                |
| Status checks      | `ci` and `lint-title` must pass                                           |
| Signed commits     | Every commit on `main` must carry a verified signature                    |
| Thread resolution  | Review conversations must be resolved before merging                      |
| Merge method       | "Create a merge commit" is the only allowed method (no squash, no rebase) |

`lint-title` ([`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml)) checks the PR
title as a Conventional Commit because the title becomes the merge-commit subject. Merge commits
keep the per-task commits and their IDs on `main`.

Because every commit on `main` must be signed, either sign your branch commits (next section) or ask
a repository admin to merge with the ruleset bypass. Do not squash to work around it.

## Commit signing

Commits are signed with SSH, using a hardware key (a FIDO `sk-ed25519` key) for provenance. A
hardware key needs a physical touch per signature, so auto-signing is **off**: routine and scripted
commits stay touch-free, and you sign the commits you want on `main` explicitly.

### One-time setup

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519_sk     # the FIDO handle
git config --global commit.gpgsign false                     # don't auto-sign
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
```

On macOS, use Homebrew's OpenSSH for FIDO keys (Apple's build lacks the provider): `ssh-keygen` and
`ssh-add` must resolve to `/opt/homebrew/bin`. Optionally blank the handle passphrase for tap-only
signing. This is safe for an `sk` key, since the handle cannot sign without the physical key
present:

```bash
ssh-keygen -p -f ~/.ssh/id_ed25519_sk    # set new passphrase = empty
```

Register the **public** key on GitHub as a **Signing Key** (not just an authentication key), or the
required-signatures rule still fails:

```bash
gh auth refresh -h github.com -s admin:ssh_signing_key
gh ssh-key add ~/.ssh/id_ed25519_sk.pub --type signing --title "hardware commit-signing"
```

For `git log --show-signature` to report "Good", the allowed-signers file needs a line of the form
`<email> <public key>`.

### Signing the commits that land on `main`

Sign a commit as you make it with `git commit -S`. To sign a whole branch in one pass before
pushing, re-sign every commit since `main`:

```bash
git rebase --exec 'git commit --amend --no-edit -S' main
```

Verify a signature:

```bash
git log --show-signature -1     # expect: Good "git" signature ... ED25519-SK
```

## Documentation

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run docs:dev`     | Start the dev server for `docs-site/`          |
| `npm run docs:build`   | Production build (the PR gate described above) |
| `npm run docs:preview` | Serve the last production build                |

The docs scripts need Node 24.2 or newer. How translations are registered, kept current, and
debugged is described in [`docs-site/.vitepress/README.md`](docs-site/.vitepress/README.md).

## License

The project is EPL-2.0, the same as upstream ELK.

- Every code file carries an SPDX header: `// SPDX-License-Identifier: EPL-2.0` (`#` for sh/yml,
  `<!-- -->` for md). A fitness test enforces it for `.ts`, `.mjs`, `.java` and `.sh` files under
  `src/`, `test/` and `tools/`.
- Dev dependencies must be EPL-2.0 compatible (no GPL-only licenses such as GPL-3.0-only).
- Never read or copy OpenJDK source (AD-9). Implement `src/java/` shims only from the
  Javadoc-specified algorithms, and prove them against JVM-generated vectors.
