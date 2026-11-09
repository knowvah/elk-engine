# Recorder identity-hash sensitivity (2026-11-09)

## Observation: collections.json depends on JavaVectors.java's exact source text
- **Context**: Fixing GitHub Code Quality findings in `tools/vectors/*.java` (PR after #31). Every edited recorder was
  re-run cold and byte-compared against its committed ref.
- **Finding**: Any code edit to `tools/vectors/JavaVectors.java` changes the committed
  `test/golden/refs/java/collections.json`. A comment-only edit does not; one unused method or a new local does. The
  diffs (724 `order` entries) are all in `hashMap`: the bin order of treeified bins with non-Comparable `ColliderPlain`
  keys comes from `HashMap.tieBreakOrder`, i.e. `System.identityHashCode`. The single-file source launcher compiles in
  the same JVM, so javac's allocations shift the identity-hash sequence whenever the source changes. Unedited source
  reproduces the ref run after run (JDK 21.0.1); a `javac` + `java -cp` run does not (the ref was recorded via the
  launcher).
- **Impact**: 7 Code Quality findings in that file (`:83` index-out-of-bounds, 6 number-format) were left open. Any
  future edit to `JavaVectors.java` must re-record `collections.json` and update the TS expectations that depend on it.
  A durable fix is a driver script that pins `-XX:hashCode=2` (or compiles first) and a one-time re-record.
- **Confidence**: High (controlled reruns: unedited x2 identical to ref; edited x2 identical to each other, not to ref).
