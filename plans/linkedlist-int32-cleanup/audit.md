<!-- SPDX-License-Identifier: EPL-2.0 -->

# Audit: equality-based calls on the `LinkedList` shim (T1, D1-D3)

`src/java/util/LinkedList.ts` compares with `===` in `remove(e)`, `contains` and `indexOf`; Java compares with
`equals`. This audit lists every caller and says whether the two can answer differently.

**Result: 15 rows: 14 `same`, 1 `handled`, no `differs`, no `unreachable-differs`.** No caller of the
shim relies on a value `equals` that the port does not already provide. One defect was found outside D1, on a Java
list the port keeps as a plain array (§ 4, row A3, issue #120).

Java paths are relative to `plugins/org.eclipse.elk.` at `8bca22f4`; TS paths to `src/`.

## 1. How the calls were enumerated

Both sides are type-driven, not grep-driven.

**TS side.** TypeScript 7 has no JS compiler API, so the compiler itself was used as the query: rename the four
methods in a scratch edit, collect the "property does not exist" errors (each names the receiver type), restore the
file.

```sh
# in src/java/util/LinkedList.ts: removeAt -> removeAt__AUDIT, remove -> remove__AUDIT,
#                                 contains -> contains__AUDIT, indexOf -> indexOf__AUDIT
npx tsc --noEmit --pretty false > "$TMPDIR/t1-tsc-audit.txt"; git checkout -- src/java/util/LinkedList.ts
```

23 errors, all TS2339/TS2551 (a missing property; no assignability error, so no interface hides a call): 9 in
`LinkedList.test.ts`, 14 in non-test sources. Those 14 are rows 1 and 3-15 below (row 2 comes from the Java side: its
port calls `removeFirst`). `removeAt` is included to check the `remove(int)` / `remove(Object)` overload on every list.

**Java side.** A one-off `javac` Tree API program (source in § 5) printed, for every call named `contains`,
`indexOf`, `lastIndexOf`, `remove`, `removeAll`, `retainAll`, `containsAll`, `equals`, `hashCode`,
`removeFirstOccurrence`, `removeLastOccurrence`, `removeIf`, `containsKey`, `containsValue`, `Objects.equals/equal/hash`,
the receiver's static type, the overload javac resolved and the argument types. Input: the `src`, `src-gen` and
`xtend-gen` directories of the sixteen in-scope bundles in the oracle worktree (`../elk-oracle`, `8bca22f4` plus
patches 0001-0003), classpath the third-party bundles the recorders use (`tools/vectors/*-vectors.sh`).

```sh
nice -n 10 java -cp "$CP" EqCalls.java "$CP" <19 source dirs> > t1-java-typed.tsv   # JDK 21.0.1, load 11.9
```

845 calls. 17 did not resolve (the receiver is a `getProperty` of a generated options class that is not among the
sources); their argument types are all enums (`SizeConstraint`, `SizeOptions`, `PortLabelPlacement`,
`TopdownNodeTypes`, `OrderWeighting`) or `LayoutOptionData` against a `Property`, so none is a list of a value-equal
type. 178 calls resolve to a `List`/`Collection`/`Queue` method (4 of them on an `EnumSet`); the element types of the
other 174 receivers are in § 2 and § 4. No call compares two lists (`equals`, `Objects.equals`) and no hashed
collection is keyed by a list or a `KVectorChain`.

## 2. Types: element types of the port's `LinkedList` instances

| TS element type | Held in (`src/`) | Java element class | Java `equals` |
| --------------- | ---------------- | ------------------ | ------------- |
| `KVector` | `core/math/KVectorChain.ts:47` (`extends LinkedList<KVector>`, every bend-point and junction-point chain); parameters of `core/math/{ISplineInterpolator,CubicSplineInterpolator}.ts` | `core.math.KVector` | **value**: `x == other.x && y == other.y` (`core/src/org/eclipse/elk/core/math/KVector.java:116-124`), so `NaN` never equals and `-0.0` equals `0.0` |
| `number` | `core/util/BoxLayoutProvider.ts:31-32`, `core/util/BoxLayoutProviderGrouping.ts:42-43` (`rowIndices`, `rowHeights`); `alg/layered/p5edges/orthogonal/HyperEdgeSegment.ts:49,51` and its readers in `OrthogonalRoutingGenerator{,Conflicts}.ts` | `Integer` (`rowIndices`), `Double` (the others) | **value** (`Integer.equals`, `Double.equals`: `NaN` equals `NaN`, `-0.0` does not equal `0.0`) |
| `TNode`, `TEdge`, `TLabel` | `alg/mrtree/**` | `alg.mrtree.graph.{TNode,TEdge,TLabel}` | identity (no override up to `MapPropertyHolder`). The `TEdge` with a value `equals` is `alg.common.TEdge`; no `LinkedList` holds it |
| `LNode`, `LLabel[]` | `alg/layered/intermediate/{NodePromotionModelOrder,LabelSideSelector}.ts`, `alg/layered/p1cycles/{BFSNodeOrder,Greedy}CycleBreaker.ts` | `alg.layered.graph.LNode`; `LLabel[]` | identity (arrays compare by identity) |
| `V` | `alg/layered/intermediate/BiLinkedHashMultiMap.ts:16` | instantiated once, `BiLinkedHashMultiMap<Integer, LNode>` (`alg.layered/…/intermediate/NodePromotion.java:166`) | identity (`LNode`) |
| `HierarchyEdge`, `ElkNode` | `core/debug/grandom/generators/RandomGraphGenerator{,Ante,Connect}.ts` | `RandomGraphGenerator.HierarchyEdge`; EMF `ElkNode` | identity |
| `CGroup`, `NNode`, `FEdge`, `BezierCurve`, `Group`, `BlockRow` | `alg/common/compaction/oned`, `alg/layered/compaction/oned/algs`, `alg/common/networksimplex`, `alg/force/ComponentsProcessor.ts`, `core/math/BezierSpline.ts`, `core/util/BoxLayoutProviderGrouping.ts`, `alg/rectpacking/util/Block.ts` | the classes of the same name | identity (none is among the 20 in-scope Java files that declare `boolean equals(`) |
| `T` | `core/util/InstancePool.ts:24` | `InstancePool<T>` (`core/src/…/util/InstancePool.java`: `isEmpty`, `removeFirst`, `addLast`, `size`, `clear` only) | not compared |
| `E` | `alg/mrtree/p2order/NodeOrderer.ts:23` (`sortList`, called with `TNode` lists) | `TNode` | identity |
| `unknown` | `core/data/LayoutMetaDataService.ts:288-289` (the clone function of `LinkedList`-typed option values) | any | not compared (copy constructor only) |

Not `LinkedList`s in the port, although the Java declares one: `SCCModelOrderCycleBreaker.stronglyConnectedComponents`
(`LinkedList<Set<LNode>>` in Java, `Set<LNode>[]` here; the Java calls `contains` on the sets, never on the list),
`Lists.newLinkedList` results (`T[]`), and `LayoutCategoryData.layouters` (§ 4, A3).

## 3. Calls on the shim

| # | Java file:line | TS file:line | element type | method | verdict | reason |
| - | -------------- | ------------ | ------------ | ------ | ------- | ------ |
| 1 | `alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HypernodesProcessor.java:178` | `alg/layered/intermediate/HypernodesProcessor.ts:28-35,222` | `KVector` | `KVectorChain.remove(Object)` | handled | the port calls a local `removeEqual`, which finds the first element with `KVector.equals` and removes it by index (`removeAt`, the only shim call) |
| 2 | `alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:692` | `alg/disco/transform/ElkGraphTransformerGeometry.ts:236` | `KVector` | `KVectorChain.remove()` | same | javac resolves the no-argument `LinkedList.remove()`, which is `removeFirst()`; no comparison |
| 3 | `alg.layered/src/org/eclipse/elk/alg/layered/intermediate/BiLinkedHashMultiMap.java:57` | `alg/layered/intermediate/BiLinkedHashMultiMap.ts:46` | `V` = `LNode` | `remove(Object)` | same | identity `equals` |
| 4 | `alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TEdge.java:84` | `alg/mrtree/graph/TEdge.ts:66` | `TEdge` (mrtree) | `contains(Object)` | same | identity `equals`; the argument is `this` |
| 5 | `alg.mrtree/…/graph/TEdge.java:85` | `alg/mrtree/graph/TEdge.ts:67` | `TEdge` | `remove(Object)` | same | as row 4 |
| 6 | `alg.mrtree/…/graph/TEdge.java:87` | `alg/mrtree/graph/TEdge.ts:69` | `TEdge` | `contains(Object)` | same | as row 4 |
| 7 | `alg.mrtree/…/graph/TEdge.java:111` | `alg/mrtree/graph/TEdge.ts:92` | `TEdge` | `contains(Object)` | same | as row 4 |
| 8 | `alg.mrtree/…/graph/TEdge.java:112` | `alg/mrtree/graph/TEdge.ts:93` | `TEdge` | `remove(Object)` | same | as row 4 |
| 9 | `alg.mrtree/…/graph/TEdge.java:114` | `alg/mrtree/graph/TEdge.ts:95` | `TEdge` | `contains(Object)` | same | as row 4 |
| 10 | `alg.mrtree/src/org/eclipse/elk/alg/mrtree/p1treeify/DFSTreeifyer.java:127` | `alg/mrtree/p1treeify/DFSTreeifyer.ts:98` | `TEdge` | `remove(Object)` | same | identity `equals` |
| 11 | `alg.mrtree/…/p1treeify/DFSTreeifyer.java:128` | `alg/mrtree/p1treeify/DFSTreeifyer.ts:99` | `TEdge` | `remove(Object)` | same | identity `equals` |
| 12 | `alg.mrtree/src/org/eclipse/elk/alg/mrtree/p2order/OrderBalance.java:179` | `alg/mrtree/p2order/OrderBalance.ts:175` | `TEdge` | `remove(int)` | same | javac resolves `List.remove(int)`; the port calls `removeAt` |
| 13 | `alg.mrtree/…/p2order/OrderBalance.java:193` | `alg/mrtree/p2order/OrderBalance.ts:203` | `TEdge` | `remove(int)` | same | as row 12 |
| 14 | `core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java:890` | `core/debug/grandom/generators/RandomGraphGeneratorAnte.ts:217` | `HierarchyEdge` | `remove(int)` | same | `List.remove(int)`; the port calls `removeAt(0)` |
| 15 | `alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java:356` | `alg/rectpacking/util/Block.ts:320` | `BlockRow` | `rows.removeAll(rowsToDelete)` | same | identity `equals`; the port filters `rows` (an array) by `rowsToDelete.contains(row)` |

Value-equal element types with no equality-based call at all, on either side:

- `LinkedList<Double>` connection coordinates of `HyperEdgeSegment` (`alg.layered/…/p5edges/orthogonal/HyperEdgeSegment.java:79,81`):
  the Java calls `add`, `addAll`, `clear`, `get`, `getFirst`, `getLast`, `size`, `isEmpty`, `stream` and iterates; the
  port's readers do the same.
- `LinkedList<Integer> rowIndices` and `LinkedList<Double> rowHeights` of `BoxLayoutProvider`
  (`core/src/…/util/BoxLayoutProvider.java:217-256,395-442`): `add`, `addLast`, `listIterator` only.
- Every other `KVectorChain` (bend points, junction points, spline control points): the javac enumeration has exactly
  two calls with a `KVectorChain` receiver, rows 1 and 2. The junction-point lookups `createdJunctionPoints.contains`
  (`PolylineEdgeRouter.java:476`, `BaseRoutingDirectionStrategy.java:93`) are on a `Set<KVector>`, ported as
  value-hashed `JavaHashSet`s.
- `LinkedList<number>` has no `removeAt` call either, so the `List<Integer>.remove(int)` / `remove(Object)` overload
  hazard does not arise.

## 4. Java lists the port keeps as arrays (outside D1, recorded for the follow-up)

The javac enumeration covers every Java list, so the calls on a value-equal element type that the port represents as a
plain array were checked too. These are not `LinkedList` shim callers; #47's brief leaves them to a follow-up (#121).

| # | Java file:line | TS file:line | element type | method | verdict | reason |
| - | -------------- | ------------ | ------------ | ------ | ------- | ------ |
| A1 | `core/src/org/eclipse/elk/core/util/ElkUtil.java:893` | `core/util/ElkUtilJunctions.ts:49` | `KVector` | `remove(int)` | same | index removal (`splice(i, 1)`) |
| A2 | `alg.layered/…/p5edges/splines/NubSpline.java:140,224,263` | `alg/layered/p5edges/splines/NubSplineKnots.ts:105` | `Double` | `remove(int)` | same | `polarCoordinate.remove(0)` with an `int` literal is the index overload; the port calls `shift()` |
| A3 | `core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java:494` | `core/data/LayoutMetaDataService.ts:139` | `LayoutAlgorithmData` | `contains(Object)` | **differs** | `equals` compares ids (`LayoutAlgorithmData.java:82-87`); the port's `includes` is identity. Registering a provider twice leaves one layouter in the Java category and two in the port's (oracle run and diagnosis in #120). Not fixed here: not a shim caller |
| A4 | `alg.common/…/nodespacing/internal/NodeLabelLocation.java:373` | `alg/common/nodespacing/internal/NodeLabelLocation.ts:403` | `Set<NodeLabelPlacement>` | `contains(Object)` | handled | `some((placements) => placements.equals(labelPlacement))` |
| A5 | `alg.layered/…/p4nodes/LinearSegmentsNodePlacer.java:410` | `alg/layered/p4nodes/LinearSegmentsNodePlacerCreation.ts:347-351` | `LinearSegment` | `remove(Object)` | handled | `findIndex((candidate) => segment.equals(candidate))`; `:292,296` are `remove(int)` |
| A6 | `alg.layered/…/intermediate/preserveorder/CMGroupModelOrderCalculator.java:38-39` | `alg/layered/intermediate/preserveorder/CMGroupModelOrderCalculator.ts:37-38` | `Integer` | `contains(Object)` | same | `===` on two `int` values is `Integer.equals` (no `NaN`, no `-0`) |
| A7 | `alg.mrtree/…/intermediate/CompactionProcessor.java:165` | `alg/mrtree/intermediate/CompactionProcessor.ts:199-201` | `Pair<Double, Double>` | `indexOf(Object)` | handled | `findIndex((x) => x.equals(found))` |
| A8 | `alg.layered/…/p5edges/orthogonal/OrthogonalRoutingGenerator.java:516,544` | `alg/layered/p5edges/orthogonal/OrthogonalRoutingGeneratorCycles.ts:62,99` | `HyperEdgeSegment` | `remove(int)` | same | `sources.remove(0)` is index removal (`shift()`), no comparison |
| A9 | `alg.common/…/networksimplex/NNode.java:215-316` | `alg/common/networksimplex/NNodeChangeAwareArrayList.ts` | `E` = `NEdge` | the delegating `ChangeAwareArrayList` | same | instantiated only for `NEdge` (`NNode.java:51,53`), identity `equals`; its header said "identity for ELK's elements" and now names `NEdge` |

Not covered by this section, and the subject of #121: the same hazard through methods the enumeration does not name
(`stream().distinct()`, `Collections.frequency`, Guava `Iterables.contains`, and similar) and on `Set`/`Map` receivers
(329 calls, the AD-10 inventories of `docs/translation-rules-collections.md`).

## 5. The enumeration program

Run once from a scratch directory; not kept in `tools/` (no second user).

```java
// SPDX-License-Identifier: EPL-2.0
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ExpressionTree;
import com.sun.source.tree.MemberSelectTree;
import com.sun.source.tree.MethodInvocationTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.lang.model.element.Element;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.type.TypeMirror;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

/** Usage: java -cp <third-party jars> EqCalls.java <classpath> <source dir>... */
public final class EqCalls {
    private static final Set<String> NAMES = Set.of("contains", "indexOf", "lastIndexOf", "remove", "removeAll",
            "retainAll", "containsAll", "equals", "equal", "hashCode", "hash", "removeFirstOccurrence",
            "removeLastOccurrence", "removeIf", "containsKey", "containsValue", "elementsEqual", "deepEquals");

    public static void main(final String[] args) throws IOException {
        List<Path> files = new ArrayList<>();
        for (int i = 1; i < args.length; i++) {
            try (Stream<Path> walk = Files.walk(Path.of(args[i]))) {
                walk.filter(p -> p.toString().endsWith(".java")).forEach(files::add);
            }
        }
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        StandardJavaFileManager fm = compiler.getStandardFileManager(d -> { }, null, null);
        Iterable<? extends JavaFileObject> units = fm.getJavaFileObjectsFromPaths(files);
        JavacTask task = (JavacTask) compiler.getTask(null, fm, d -> { },
                List.of("-proc:none", "-cp", args[0], "-XDshould-stop.at=FLOW", "-Xmaxerrs", "100000"), null, units);
        Iterable<? extends CompilationUnitTree> trees = task.parse();
        task.analyze();
        Trees t = Trees.instance(task);
        for (CompilationUnitTree unit : trees) {
            new TreePathScanner<Void, Void>() {
                @Override
                public Void visitMethodInvocation(final MethodInvocationTree node, final Void unused) {
                    ExpressionTree select = node.getMethodSelect();
                    String name = select instanceof MemberSelectTree ms ? ms.getIdentifier().toString()
                            : select.toString();
                    if (NAMES.contains(name)) {
                        TreePath path = getCurrentPath();
                        long pos = t.getSourcePositions().getStartPosition(unit, node);
                        long line = unit.getLineMap().getLineNumber(
                                select instanceof MemberSelectTree
                                        ? t.getSourcePositions().getEndPosition(unit,
                                                ((MemberSelectTree) select).getExpression())
                                        : pos);
                        String receiver = "-";
                        if (select instanceof MemberSelectTree ms) {
                            TypeMirror rt = t.getTypeMirror(new TreePath(new TreePath(path, select),
                                    ms.getExpression()));
                            receiver = String.valueOf(rt);
                        }
                        Element el = t.getElement(path);
                        String resolved = el instanceof ExecutableElement ex
                                ? ex.getEnclosingElement() + "#" + ex.getSimpleName() + ex.getParameters().stream()
                                        .map(p -> p.asType().toString()).collect(Collectors.joining(",", "(", ")"))
                                : "?";
                        String argTypes = node.getArguments().stream()
                                .map(a -> String.valueOf(t.getTypeMirror(new TreePath(path, a))))
                                .collect(Collectors.joining(",", "(", ")"));
                        System.out.println(unit.getSourceFile().getName() + ":" + line + "\t" + name + "\t"
                                + receiver + "\t" + resolved + "\t" + argTypes);
                    }
                    return super.visitMethodInvocation(node, unused);
                }
            }.scan(unit, null);
        }
    }
}
```
