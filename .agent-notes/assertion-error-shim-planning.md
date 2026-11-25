<!-- SPDX-License-Identifier: EPL-2.0 -->

# assertion-error-shim: planning observations (issue #114)

## Observation: the fitness test's Exception case skips by parent, not by family

- **Context**: planning #114, the move of `CyclicLinkingException` onto the `AssertionError` shim.
- **Finding**: the third case of `test/architecture/exception-hierarchy.fitness.test.ts` ("puts every Java exception under
  Exception") skips a row only when its parent is JS `Error`. A class whose Java parent chain runs through `java.lang.Error` but
  whose direct parent is a shim (`CyclicLinkingException extends AssertionError`) is then checked against `Exception` and fails.
- **Impact**: any future subclass of `AssertionError` (or of a later `java.lang.Error` shim) needs the family skip of D4.3.
- **Confidence**: High (read from the test source at `d8a1acc0`).

## Observation: SplinesMath and HyperEdgeCycleDetector hide their constructors differently

- **Context**: choosing how to port `SplinesMath`'s private constructor.
- **Finding**: `SplinesMath.java:53-55` throws `new AssertionError(...)` unconditionally; `HyperEdgeCycleDetector.java:43-44`
  uses `assert false`, which runs only under `-ea`. The ports differ for that reason (`throw` and `devAssert`).
- **Impact**: when porting a utility-class constructor, read whether the Java `throw`s or `assert`s before copying a precedent.
- **Confidence**: High (Java read at the pin `8bca22f4`).
