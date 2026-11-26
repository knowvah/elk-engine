<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: self-loop-assert-arms (issue #115, 2026-11)

## Observation: a null side into `lowestPortOnSide` is a NoSuchElementException on the JVM, not an NPE

- **Context**: row 105 of #115 (`RoutingDirector.determineThreeSideLoopRoutes`, `default` arm). The issue text says the
  Java then fails with "an NPE later in `lowestPortOnSide`".
- **Finding**: `assignLeftmostRightmostPorts(slLoop, null, null)` on the oracle build throws
  `java.util.NoSuchElementException: No value present`. Guava's `ArrayListMultimap.get(null)` returns the empty list of an
  absent key (`getSLPortsBySide(null)` prints `[]`), and `Stream.min(...).get()` throws on it (`RoutingDirector.java:288`).
  The port's multimap shim also returns no values for a null key, and `lowestPortOnSide` already throws
  `NoSuchElementException('No value present')` for an empty side, so the port matched with no new check.
- **Impact**: a null key into a Guava `HashMap`-backed multimap is not a null dereference. Before translating "the Java
  then fails on the null" into a `TypeError`, find the statement that dereferences it.
- **Confidence**: High (run on the oracle jars, with and without `-ea`)

## Observation: private Java methods can be run on the oracle build with a throwaway reflection probe

- **Context**: D4 took expected values from the Java source and rejected a committed JVM vector. The arms are private and
  unreachable from a graph, so no recorder or `tools/oracle/run.sh` case drives them.
- **Finding**: a single `.java` file under `$TMPDIR`, compiled with `javac -cp` and run with `java` (once plain, once with
  `-ea`), calls the private methods through `getDeclaredMethod(...).setAccessible(true)`. The classpath is the
  `alg.layered`, `core`, `graph` and `alg.common` jars named by `oracle-build.json`, plus the newest `com.google.guava`,
  `com.google.guava.failureaccess`, `org.eclipse.emf.common`, `org.eclipse.emf.ecore`, `org.eclipse.xtext.xbase.lib`,
  `org.eclipse.xtend.lib` and `org.eclipse.xtend.lib.macro` jars of `~/.m2/repository/p2/osgi/bundle/`. Without
  `xbase.lib` the first read of a `LayeredOptions` constant fails with
  `NoClassDefFoundError: org/eclipse/xtext/xbase/lib/CollectionLiterals` (`LayeredMetaDataProvider`'s static
  initializer). `SelfLoopHolder.install(lNode)` on a hand-built `LGraph`/`LNode`/`LPort`/`LEdge` gives the loops, edges
  and labels the methods take. It writes nothing outside `$TMPDIR` and takes a few seconds.
- **Impact**: when a brief's expected values rest on reading the Java, a probe like this confirms them on the JVM at no
  cost to the repository. It is evidence for the journal, not a ref: nothing is recorded or replayed.
- **Confidence**: High

## Observation: under `-ea` the arm of `addOuterBendPoint` is never the first assert to fire

- **Context**: writing the `AssertionError` test of row 99 (`OrthogonalSelfLoopRouter.java:367`).
- **Finding**: `addOuterBendPoint` calls `getBaseVector(portSide, …)` (`:347`) before its own `switch` on the same side
  (`:351`). For a side outside the four, `getBaseVector` asserts at `:441` first, so under `-ea` the `assert false` at
  `:367` cannot be reached at all; without `-ea` it is reached with a null `result`. The JVM probe shows both
  (`AssertionError` with `bendPoints.size() == 0`; `size() == 1` with a null element).
- **Impact**: a test that pins the `devAssert` of that arm itself has to stub `getBaseVector`; the unstubbed
  `assertionErrorOf` test pins the assert of `getBaseVector`.
- **Confidence**: High
