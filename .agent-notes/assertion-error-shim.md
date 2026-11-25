<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: assertion-error-shim (issue #114, 2026-11)

## Observation: a search for the name does not find every AssertionError stand-in

- **Context**: proving that no file in `src/` builds an `AssertionError` by hand (#114's "Done when").
- **Finding**: `grep "name = 'AssertionError'"` and the `ast-grep` pattern `$E.name = 'AssertionError'` find a stand-in only
  when it sets the name. `LazyLinkingResource.ts:413` threw a plain `new Error('Unexpected severity: …')` where
  `LazyLinkingResource.java:423` throws `new AssertionError(…)`; neither search listed it. It was found from the Java side:
  `grep AssertionError` over ELK at the pin and over the `.java` of the source bundles, matched against the Java file names
  that `src/` cites with `@see` and against same-named ported classes.
- **Impact**: for "no port site stands in for Java class X", enumerate the Java uses of X and read the port at each one. A
  search of the port for one spelling of the stand-in is a positive control, not the enumeration.
- **Confidence**: High

## Observation: the p2 cache holds the Java sources of the third-party bundles

- **Context**: the brief planned `javap -p -c` on the Xtext jar "if no source is on disk".
- **Finding**: `~/.m2/repository/p2/osgi/bundle/` has `org.eclipse.xtext.source`, `org.eclipse.xtext.util.source`,
  `org.eclipse.emf.common.source`, `org.eclipse.emf.ecore.source`, `com.google.gson.source`, `com.google.guava.source`,
  `org.eclipse.equinox.common.source`, `org.eclipse.xtext.xbase.lib.source` and `org.eclipse.xtend.lib.source`, each a jar
  of `.java` files at the version of the binary bundle (Xtext 2.36.0.v20240825-0714). Unpacked under `$TMPDIR`, they can be
  searched with line numbers that agree with the `@see` citations in `src/`. None of them is OpenJDK (AD-9).
- **Impact**: read the third-party Java from these jars; `javap` is needed only to confirm what the binary does.
- **Confidence**: High

## Observation: a CyclicLinkingException never leaves the resolution that owns its triple

- **Context**: deciding whether a reader of a caught error's `name` can receive a `CyclicLinkingException` (stop 2).
- **Finding**: `resolving` holds only triples of active `getEObjectForTriple` frames (`LazyLinkingResource.ts:226`, removed in
  the `finally` at `:239-241`), and each such frame runs its nested resolutions inside the `try` of `linkTriple` (`:253-260`),
  which catches the exception for its own triple. The exception therefore crosses only the linking service, the scope provider
  and its scopes, `EcoreUtil.resolve` and `getEObject`. `ElkGraphScopeProvider` and `ElkGraphJsonScopeProvider` call no
  cross-reference getter, so resolutions never nest in the shipped languages and the exception is thrown only in tests.
- **Impact**: a later change to the exception (or to the cyclic counter) needs to look only at those frames. A scope provider
  that starts to read a cross-reference makes the exception reachable.
- **Confidence**: High (read from the source; the reachability claim is by reading, with no run that tries to nest).

## Observation: only IGNORE reaches the default arm of getDiagnosticList

- **Context**: writing the test for the unexpected-severity arm.
- **Finding**: `DiagnosticMessage`'s constructor throws `IllegalArgumentException` for `Severity.INFO`
  (`DiagnosticMessage.ts:20-21`, as the Java does), so a fixture with `INFO` fails before the arm. `IGNORE` is the one severity
  that reaches `throw new AssertionError('Unexpected severity: IGNORE')`.
- **Impact**: use `Severity.IGNORE` in any test of that arm.
- **Confidence**: High
