<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Vectors A, exception classes, guava boundary

Writes the first JVM vector files (before any shim, AD-13), the Java exception classes the shims
throw, and the fitness rule that admits `src/guava/`. All three are independent.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Vectors A: numeric, hash, text, random-setseed | java-architect | tools/vectors/JavaVectors.java, test/golden/refs/java/{numeric,hash,text,random-setseed}.json | — | [ ] |
| T2 | Java exception classes | typescript-pro | src/java/lang/{IllegalArgument,NumberFormat,IndexOutOfBounds,ArrayIndexOutOfBounds,Arithmetic}Exception.ts (+ .test.ts), src/java/util/NoSuchElementException.ts (+ .test.ts) | — | [ ] |
| T3 | `src/guava` boundary fitness rule | typescript-pro | test/architecture/module-boundaries.fitness.test.ts | — | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
