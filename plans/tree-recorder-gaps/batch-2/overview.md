<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: scenarios, new refs and replays (one task per bundle)

Three parallel background subagents. The write-sets are disjoint, and the bundles do not import each other, so mutant
runs in one bundle cannot reach another bundle's tests (D8). Each subagent searches for inputs on the oracle, adds the
found inputs to its recorder as a new plan (D2), records the new file into scratch, copies it into
`test/golden/refs/java/`, writes the replay test (D3), and runs the D4 evidence check per item.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-radial.md) | R-a to R-d: `radial-extra.json` | `claude` (opus), background | `RadialVectors.java`, `radial-vectors.sh` (comments), `radial-extra.json`, `RadialExtraVectors.test.ts`, `radial-replay-rows.ts` (path helper) | T1 | [x] |
| [T3](T3-vertiflex.md) | V-a, V-b: `vertiflex-extra.json` | `claude` (opus), background | `VertiFlexVectors.java`, `vertiflex-vectors.sh` (comments), `vertiflex-extra.json`, `VertiFlexExtraVectors.test.ts`, `vertiflex-replay-rows.ts` (path helper) | T1 | [x] |
| [T4](T4-mrtree.md) | M-a to M-d: `mrtree-extra2.json` | `claude` (opus), background | `MrTreeVectors.java`, `mrtree-vectors.sh` (comments), `mrtree-extra2.json`, `MrTreeVectors.test.ts` (`REF_FILES`), `mrtree-replay-rows.ts` (path helper) | T1 | [x] |

## Common rules for T2-T4 (include in every subagent prompt)

- Probes: single-file `java` programs under `$TMPDIR/tree-recorder-gaps/<bundle>/` on the classpath the bundle's
  `*-vectors.sh` builds (`build_classpath`), with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2`. Or run the TS engine on
  the same ELK JSON for a quick screen. Never commit a probe. Quote its decisive output in the report.
- Recording: `ELK_VECTORS_CACHE=off nice -n 10 bash tools/vectors/<bundle>-vectors.sh "$TMPDIR/tree-recorder-gaps/<bundle>/out"`,
  after `uptime` (wait above 12). Then `cmp` each existing output file against `test/golden/refs/java/<same name>`. Any
  difference is stop 3. Then copy only the new file into `test/golden/refs/java/`.
- Run two cold recordings and `cmp` the new file between them. A difference means the plan is non-deterministic: fix it.
- Check `git diff --exit-code -- test/golden/refs/java/` over the existing files of the bundle after every step that could touch them.
- Mutants: only through `$TMPDIR/tree-recorder-gaps/mutate.sh` (D8), only on files of your own bundle, one at a time.
- Never: the full suite, `npm run coverage`, `git commit`, `git stash`, `gh`, edits outside your write-set, or edits to any
  existing assertion. Your report ends with the outcome table of your items, in the [items.md](../items.md) column layout.

**Observability (all three):** N/A — no new observable operations. **Rollback (all three):** Reversible. The new ref, test and
plan are additive. Reverting the task's commit restores the base.
