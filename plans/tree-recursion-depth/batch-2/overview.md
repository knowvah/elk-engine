<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: conversions, one track per bundle

Three parallel subagents. The bundles do not import each other (`test/architecture/bundle-deps.json`), so their write-sets
are disjoint and one track's conversion cannot change another track's tests. Each track runs the D2 loop until both of its
shapes meet D1, or its budget (stop 7) runs out.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-mrtree.md) | mrtree path and caterpillar | `claude` (opus) | `src/alg/mrtree/**` (converted sites, new sibling helpers, new `*.explicit-stack.test.ts`) | T1 | [x] |
| [T3](T3-radial.md) | radial path and caterpillar | `claude` (opus) | `src/alg/radial/**` (same kinds) | T1 | [x] |
| [T4](T4-vertiflex.md) | vertiflex path and caterpillar | `claude` (opus) | `src/alg/vertiflex/**` (same kinds) | T1 | [x] |

## The loop (every track)

1. Probe the track's two shapes at `D_oracle` with the T1 harness (default stack). Both `ok`: go to step 5.
2. Take the innermost `src/alg/<bundle>/` frame of the overflow as the site. A frame outside the bundle is stop 8.
3. Write `<Class>.explicit-stack.test.ts` first (D4: twin, ≥ 40 seeded trees, deep case). Run it: the deep case must fail
   (overflow) before the change (red); the equality cases pass against the recursive port. Then convert
   (D3) and rerun: all pass.
4. Run the bundle's tests (`npx vitest run src/alg/<bundle>`), including the landed replays: all pass unchanged. Update the
   site's row in your report table. Go to step 1.
5. Final evidence per shape at `D_oracle`: TS `ok`; `compare.ts` against the oracle output passes (1e-6); `cmp` against the
   T1 D5 reference passes (byte-identical). Run the new test files once under `--jitless`
   (`node --jitless node_modules/vitest/vitest.mjs run <files>` or the pool `execArgv` equivalent) and quote the result.

## Common rules (include in every subagent prompt)

- The subagent prompt is the task file, plus [decisions.md](../decisions.md) D0-D7, [stop-conditions.md](../stop-conditions.md),
  the bundle's rows of [sites.md](../sites.md), the T1 journal rows (`D_oracle`, first frames, harness paths, D5 hashes), the
  Opus scope compensation of `~/.claude/rules/model-routing.md`, and the CLAUDE.md sections "The Java Is Sacred",
  "Tests Are Immutable", "Translation Rules", "Layout & Naming".
- Read the Java of each site at `~/git/knowvah/elk` (read only) before converting. Keep `@see` tags; a new helper file carries
  the SPDX header and its own `@see` to the same Java file.
- Write only your bundle's files. Never: the full suite, `npm run coverage`, `git commit`, `git stash`, `gh`, edits to an
  existing test's assertions, edits to `test/golden/refs/**`, or files outside your write-set. Probes and JVM runs under
  `nice -n 10` after `uptime` (wait above 12).
- After each site: `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity` (read the report, not
  the exit code).
- Report (structured, no prose): a site table (site, probe that named it, test file, twin-equality count, deep depth,
  result); per shape the final depth reached, the oracle compare result and the D5 `cmp` result; the jitless run; any stop
  with its diagnosis artifact.

The orchestrator commits each track's work (one commit per converted site, or one per track if the sites were reported
together) and fills [sites.md](../sites.md).

**Observability (all three):** N/A — no new observable operations. **Rollback (all three):** Reversible: reverting a
conversion restores the verbatim recursion; no data or contract changes.
