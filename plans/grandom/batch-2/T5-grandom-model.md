<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `gRandom` model

**Agent:** typescript-pro · **Commit:** `feat(T5): add the grandom model as plain classes`

## Context
D3. The EMF model is generated (`src-gen/.../gRandom/*.java`, `impl/*Impl.java`, `model/generated/GRandom.ecore`).
Precedent: mission 2's plain ElkGraph classes (AD-11) and 4b's text model use. One class per file, Java names.

## Task
1. Classes `RandGraph`, `Configuration`, `Hierarchy`, `Edges`, `Nodes`, `Size`, `Ports`, `Flow`, `DoubleQuantity`
   with the generated accessors (`getX`/`setX`, `isX` for booleans, `getConfigs()`/`getFlow()` as mutable arrays) and
   EMF defaults (`int` → 0, `boolean` → false, `EDoubleObject`/`EIntegerObject`/`EFloatObject` → `null`, enum
   features → first literal, containment → `null`). Implement the `isSet` semantics the T2 dump records for
   unsettable features if any feature is unsettable; otherwise none.
2. Enums `Formats`, `Form`, `Side`, `FlowType`, `ConstraintType` per translation-rules §6.3, keeping `getName()`,
   `getLiteral()` (`custom` ↔ `'graphs'`, `bipartite` ↔ `'bipartite graphs'`, …) and `getValue()`.
3. `GRandomPackageLiterals.ts` (or the closest name the 4b/4c ports use) exposing only `CONFIGURATION__MD`,
   `CONFIGURATION__MW`, `CONFIGURATION__PF` as the `EStructuralFeature` shape `src/xtext/validation` expects.
4. Tests: defaults, enum literal/name/value tables, setters.

## Write-set
`src/core/debug/grandom/gRandom/**` (+ tests).

## Read-set
`src-gen/.../gRandom/{*.java,impl/*Impl.java}` (accessors, defaults), `model/generated/GRandom.ecore`,
`src/xtext/validation/EStructuralFeature.ts`, `docs/translation-rules.md` §5 and §6.3.

## Interface contracts (outputs)
The model classes and enums above, and the three feature literals; consumed by T7–T14.

## Acceptance criteria
- Given a new `Configuration`, when read, then `getSamples()` = 0, `isMD()` = false, `getSeed()` = null,
  `getForm()` = `Form.TREES` (first literal).
- Given `Form.CUSTOM`, when `getLiteral()`, then `"graphs"`; given `Form.getByLiteral('acyclic graphs')`, then
  `Form.ACYCLIC` (if the generated enum exposes it).
- Given the three literals, when used with `AbstractDeclarativeValidator.error`, then they type-check.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
