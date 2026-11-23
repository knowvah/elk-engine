<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: npm-1-0-release (issues #90, #91)

| ID  | Decision (one line)                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------- |
| N1  | The maintainer accepts the proposed export surface of `docs/architecture/public-api.md` (69 exports, tiers 1 to 4); closes #90 |
| N2  | The first publish is `1.0.0`, not `0.x`; the surface is a commitment, frozen by AD-14                                         |
| N3  | Amends AD-14 and the proposal's "no new function" rule: one async entry point, `layout(json, options?) => Promise<json>`, as `@knowvah/dot-engine` and `@knowvah/plantuml-engine` offer `render` |
| N4  | `layout` is tier 5, port-local (no Java `@see`); it composes `ElkGraphJson` and `RecursiveGraphLayoutEngine` and changes no ported class |
| N5  | `layout` registers all ported algorithms itself, once per `LayoutMetaDataService` instance; a caller's own registration stays valid |
| N6  | The `layout` options are `layoutOptions` only, merged over the root's; nothing else is added until a consumer needs it (YAGNI) |

## N3 detail

Ruling by the maintainer, 2026-11-23: "We should also support an async render call ... we already do this for dot-engine and
plantuml-engine", and, of the shapes offered, `layout(json, options?) => Promise<json>`. The call is elkjs-shaped: ELK JSON
object or text in, laid-out ELK JSON object out. The input is never mutated. The work is synchronous inside the call; the
promise is the stable contract, so a later lazy or off-thread implementation changes no signature.

The object-model exports (tiers 1 to 4) stay as proposed. The "no wrapper, no register-everything helper" rule of the
proposal is amended for this one function only. AD-16c (idiomatic error hierarchy) is not touched: `layout` rejects with
the core error.
