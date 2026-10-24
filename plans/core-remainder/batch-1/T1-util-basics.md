<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — `WrappedException`, `DefaultFactory`, `Triple`, `Quadruple`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T1): port wrapped exception, default factory, triple and quadruple`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). These are leaf utilities:
- `DefaultFactory` and the landed `AlgorithmFactory` reference `WrappedException`. 5a omitted `AlgorithmFactory`'s
  catch arms because `WrappedException` did not exist yet; leave `AlgorithmFactory` as it is.
- Nothing in core calls `Triple` or `Quadruple`. `alg.mrtree` and `alg.common`/`alg.disco` use them later.

## Task
1. Port these files, one class per file, with Java names, `@see` headers and the SPDX line:
   - `J/util/WrappedException.java`: AD-16, so extend the Java parent from `src/java/lang/RuntimeException.ts`.
   - `J/util/DefaultFactory.java`
   - `J/util/Triple.java`
   - `J/util/Quadruple.java`
2. `DefaultFactory`:
   - It takes a constructor `new () => T` where Java takes a `Class` (P7) and implements the landed `IFactory<T>`.
   - Java's catch of `InstantiationException` and `IllegalAccessException` (`:40-45`) cannot happen with a TS
     constructor call. Keep the structure only if it stays reachable; otherwise comment the Java lines and journal it
     (push-forward).
3. `Triple` and `Quadruple`:
   - Port `hashCode`, `equals` and `toString` as written (`Triple.java:83-102`, `Quadruple.java:98-118`).
   - `equals` casts without an `instanceof` check (`Triple.java:94`, `Quadruple.java:109`), so a non-Triple argument
     throws `ClassCastException` (`src/java/lang/ClassCastException.ts`). Keep that behaviour.
   - `hashCode` uses `Int32` arithmetic and member `hashCode()` when present, otherwise the identity hash
     (`src/java/lang/IdentityHashCode.ts`). Follow `src/core/util/Pair.ts` for the pattern.
4. Add `WrappedException` to `test/architecture/exception-hierarchy.fitness.test.ts` with its Java parent.

## Write-set
The four files above (+ colocated tests), `test/architecture/exception-hierarchy.fitness.test.ts`.

## Read-set
- The four Java files.
- `src/core/util/{Pair,IFactory,AlgorithmFactory}.ts`.
- `src/java/lang/{RuntimeException,IdentityHashCode,Int32,JavaObjects}.ts`; also `src/java/util/JavaObjects.ts` if
  that is where it lives.
- `plans/elk-engine-skeleton/decisions.md` (AD-16).

## Interface contracts (outputs)
- `new WrappedException(cause, message?)`, matching the Java constructors.
- `new DefaultFactory<T>(ctor)`, with `create()` and `destroy(obj)`.
- `Triple<F,S,T>` and `Quadruple<A,B,C,D>`, with Java accessor names (`getFirst()`, …), `equals` and `hashCode`.

## Acceptance criteria
- Given `WrappedException`, when the fitness test runs, then its prototype chain matches the Java parents (AD-16).
- Given `new DefaultFactory(C)`, when `create()` runs twice, then two distinct `C` instances are returned.
- Given two `Triple`s with equal members, when compared, then `equals` is true and their `hashCode` values are equal
  and follow the Java formula.
- Given a `Quadruple` holding `null` members, when `hashCode` and `toString` run, then they match the Java null
  handling.
- Given `triple.equals("x")`, when called, then `ClassCastException` is thrown, as the Java cast does.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
