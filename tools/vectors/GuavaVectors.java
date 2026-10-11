// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM+Guava reference vectors (AD-9, AD-13) for src/guava/{Maps,Sets,HashBiMap,
// *Multimap}. Spec source: the Javadoc only --
// https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ for Maps, Sets,
// BiMap, HashBiMap, Multimap, ListMultimap, SetMultimap, SortedSetMultimap, HashMultimap,
// ArrayListMultimap, LinkedListMultimap, LinkedHashMultimap, TreeMultimap, and
// https://docs.oracle.com/en/java/javase/21/docs/api/ for java.util.HashMap/HashSet. This program
// only CALLS Guava and the JDK and records results; it embeds no Guava or JDK implementation.
// Encoding: int = JSON number, strings JSON-escaped, KVector-style keys = "x,y" (integral
// coordinates; ELK KVector.java:155 hash), thrown exceptions = {throws, message}.
// Run: java -cp "$GUAVA:$FAILUREACCESS" tools/vectors/GuavaVectors.java test/golden/refs/java
import com.google.common.collect.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.function.*;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class GuavaVectors {
    private static final String JDK = System.getProperty("java.version"), GUAVA = "33.3.0-jre";
    private static final long SEED = 20251011L;
    private static final int POOL_SIZE = 200, SWEEP_MAX = 100, SWEEP_HEAD = 8, SWEEP_MID = 24, KEY_SWEEP_MAX = 40;
    private static final int VALS = 40, BIMAP_VALS = 10, RAND_SCRIPTS = 8, RAND_STEPS = 40, MAX_LIST = 3;
    private static final int HELD = 2, GROW = 60, SHRINK = 45, COARSE_KEY = 5000, COARSE_VALUE = 4;
    private static final int KEY_LOW = -5000, KEY_SPAN = 60000, KV_SPAN = 40, FLAT_DEPTH = 3,
        SIZED_HEAD = 14, SIZED_PERIOD = 12, SPARSE_STRIDE = 5;
    private static final int[] RANGES = {8, 20, 40, 100};
    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final String[] KINDS = {"string", "integer", "kvector"}, TREE_KINDS = {"string", "integer"},
        ORDERS = {"natural", "reverse", "coarse"};
    private static final Map<String, List<Object>> POOLS = new HashMap<>();
    private static final BiPredicate<Integer, Integer> ALL = (i, n) -> true, SIZED = (i, n) -> SIZED_HEAD > i
        || i % SIZED_PERIOD >= SIZED_PERIOD - 1 || i % SIZED_PERIOD <= 1 || i == n - 1;
    private static final BiPredicate<Integer, Integer> SPARSE = (i, n) -> i % SPARSE_STRIDE == 0 || i == n - 1;
    private static final String[] MAP_SPEC = ("put kv,".repeat(5) + "remove k,remove k,get k,containsKey k,size,clear").split(",");
    private static final String[] SET_SPEC = ("add k,".repeat(5) + "remove k,remove k,contains k,addEach L,size,clear").split(",");
    private static final String[] BIMAP_SPEC = ("put kv,".repeat(3) + "forcePut kv,forcePut kv,remove k,get k,containsKey k,"
        + "inversePut vk,inversePut vk,inverseForcePut vk,inverseRemove v,inverseGet v,inverseContainsKey v,size,clear").split(",");
    private static final String[] MM_SPEC = ("put kv,".repeat(6) + "remove kv,removeAll k,get k,containsKey k,putAll kM,size,"
        + "clear,holdRead h,holdAdd hv,holdRemove hv").split(",");
    private static final String VIEWS = "hold k0;holdRead k0;put k0 5;holdRead k0;holdAdd k0 6;get k0;"
        + "holdRemove k0 5;holdRead k0;removeAll k0;holdRead k0;put k0 7;holdRead k0;hold k1;put k1 1;"
        + "put k1 2;holdRead k1;clear;holdRead k0;holdRead k1;put k1 3;holdRead k1;holdAdd k0 8;"
        + "holdRead k0;size";
    private static final String REMOVES = "removeAll k3;remove k4 4;remove k4 18;remove k4 99;put k3 99;"
        + "removeAll k0;removeAll k150;put k0 7;remove k1 1;remove k1 15;put k1 40;clear;put k1 1";
    private static final String ORDER = "put k0 0;put k1 1;put k0 2;remove k0 0;put k2 3;put k1 4;"
        + "removeAll k1;put k0 5;put k1 6;put k0 2;put k2 3;removeAll k0;put k0 8;get k2";
    private static final String DUPS = "put k0 1;put k0 1;put k0 2;put k0 1;remove k0 1;remove k0 1;size";
    private static final String BI_DUP = "put k0 1;put k1 2;put k2 1;forcePut k2 1;put k1 1;put k1 2;"
        + "put k0 5;forcePut k0 2;put k1 9;get k0;inverseGet 2";
    private static final String BI_INV = "inversePut 7 k0;inversePut 8 k1;inversePut 7 k1;"
        + "inverseForcePut 7 k1;inverseRemove 8;inversePut 9 k2;inverseContainsKey 9;inverseGet 7;"
        + "put k0 9;size";
    private static final String BI_REM = "put k0 1;put k1 2;put k2 3;remove k1;put k1 2;remove k0;"
        + "put k0 1;clear;put k2 3;put k0 1;size";

    public static void main(String[] args) throws IOException {
        Path dir = Path.of(args[0]);
        Files.createDirectories(dir);
        Map<String, Object> root = map("jdk", JDK, "guava", GUAVA, "seed", SEED);
        root.put("maps", hashScripts(true));
        root.put("sets", hashScripts(false));
        root.put("biMap", biMapScripts());
        root.put("hashMultimap", plainScripts("HashMultimap", HashMultimap::create));
        root.put("arrayListMultimap", arrayListScripts());
        root.put("linkedListMultimap", plainScripts("LinkedListMultimap", LinkedListMultimap::create));
        root.put("linkedHashMultimap", plainScripts("LinkedHashMultimap", LinkedHashMultimap::create));
        root.put("treeMultimap", treeScripts());
        root.put("negativeExpectedSize", map("maps", outcome(() -> Maps.newHashMapWithExpectedSize(-1)),
            "sets", outcome(() -> Sets.newHashSetWithExpectedSize(-1)),
            "arrayListKeys", outcome(() -> ArrayListMultimap.create(-1, 3)),
            "arrayListValuesPerKey", outcome(() -> ArrayListMultimap.create(3, -1))));
        Files.writeString(dir.resolve("guava.json"), render(root, 0) + "\n", StandardCharsets.UTF_8);
    }
    // ---- JSON writer: scripts multi-line, init and step objects on one line ----

    private static String render(Object o, int depth) {
        if (o instanceof Map<?, ?> m) {
            List<String> parts = m.entrySet().stream()
                .map(e -> "\"" + e.getKey() + "\": " + render(e.getValue(), depth + 1)).toList();
            return join(parts, "{", "}", FLAT_DEPTH > depth, depth);
        } else if (o instanceof List<?> l) {
            boolean multi = FLAT_DEPTH >= depth && l.stream().anyMatch(Map.class::isInstance);
            return join(l.stream().map(x -> render(x, depth + 1)).toList(), "[", "]", multi, depth);
        }
        return o instanceof String s ? "\"" + s + "\"" : String.valueOf(o);
    }

    private static String join(List<String> parts, String open, String close, boolean lines, int depth) {
        String pad = "  ".repeat(depth + 1);
        return lines ? open + "\n" + pad + String.join(",\n" + pad, parts) + "\n" + "  ".repeat(depth) + close
            : open + String.join(", ", parts) + close;
    }

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }
    private static Object outcome(Supplier<Object> action) {
        try {
            return action.get();
        } catch (RuntimeException e) {
            return map("throws", e.getClass().getSimpleName(), "message", e.getMessage());
        }
    }
    // ---- keys: KVector-style hash (ELK KVector.java:155), unique hash codes per pool ----

    private record KV(double x, double y) {
        @Override
        public int hashCode() {
            return Double.valueOf(x).hashCode() + Integer.reverse(Double.valueOf(y).hashCode());
        }

        @Override
        public String toString() {
            return (long) x + "," + (long) y;
        }
    }
    private static Object newKey(String kind, Random r) {
        return switch (kind) {
            case "string" -> r.ints(3 + r.nextInt(4), 0, ALPHABET.length())
                .mapToObj(c -> String.valueOf(ALPHABET.charAt(c))).reduce("", String::concat);
            case "integer" -> r.nextInt(KEY_SPAN) + KEY_LOW;
            default -> new KV(r.nextInt(KV_SPAN), r.nextInt(KV_SPAN));
        };
    }

    /** Pools hold unique hash codes: equal-hash non-Comparable keys would tie by identity hash. */
    private static List<Object> pool(String kind) {
        return POOLS.computeIfAbsent(kind, k -> {
            Random r = new Random(SEED + k.hashCode());
            Map<Integer, Object> byHash = new LinkedHashMap<>();
            while (byHash.size() < POOL_SIZE) {
                Object key = newKey(k, r);
                byHash.putIfAbsent(key.hashCode(), key);
            }
            return new ArrayList<>(byHash.values());
        });
    }
    private static Object key(String kind, int i) {
        return pool(kind).get(i);
    }
    private static List<Object> keys(String kind, int from, int to) {
        return new ArrayList<>(pool(kind).subList(from, to));
    }

    private static Object tok(Object o) {
        if (o instanceof KV k) {
            return k.toString();
        } else if (o instanceof Map<?, ?> m) {
            Map<String, Object> r = new LinkedHashMap<>();
            m.forEach((k, v) -> r.put((String) k, tok(v)));
            return r;
        } else if (o instanceof Collection<?> c) {
            return c.stream().map(GuavaVectors::tok).toList();
        }
        return o;
    }
    // ---- steps, systems under test, script runner ----
    private record Step(String op, List<Object> args) { }
    private record Plan(String name, List<Step> steps, BiPredicate<Integer, Integer> rec) { }
    private static Step st(String op, Object... args) {
        return new Step(op, Arrays.asList(args));
    }

    /** Script text "op arg...;op arg...": kN is pool key N, any other argument an int. */
    private static List<Step> dsl(String kind, String text) {
        List<Step> out = new ArrayList<>();
        for (String line : text.split(";")) {
            String[] w = line.split(" ");
            Object[] args = Arrays.stream(w).skip(1).map(a -> a.startsWith("k")
                ? key(kind, Integer.parseInt(a.substring(1))) : (Object) Integer.parseInt(a)).toArray();
            out.add(st(w[0], args));
        }
        return out;
    }
    @SuppressWarnings("unchecked")
    private static List<Object> list(List<Object> a, int i) {
        return (List<Object>) a.get(i);
    }
    private static Object run(Runnable r) {
        r.run();
        return null;
    }
    private static Object each(List<Object> a, Consumer<Object> f, IntSupplier size) {
        list(a, 0).forEach(f);
        return size.getAsInt();
    }

    private static final class Sut {
        final Map<String, Function<List<Object>, Object>> ops = new HashMap<>();
        final Function<Boolean, Map<String, Object>> state;

        Sut(Function<Boolean, Map<String, Object>> state) {
            this.state = state;
        }

        Sut op(String name, Function<List<Object>, Object> f) {
            ops.put(name, f);
            return this;
        }
    }

    private static Map<String, Object> script(String name, String kind, Map<String, Object> init, Sut sut,
                                              Plan plan) {
        List<Object> steps = new ArrayList<>();
        int n = plan.steps().size();
        for (int i = 0; i < n; i++) {
            Step s = plan.steps().get(i);
            Object result = outcome(() -> tok(sut.ops.get(s.op()).apply(s.args())));
            Map<String, Object> step = map("op", s.op(), "args", tok(s.args()), "result", result);
            if (plan.rec().test(i, n)) {
                step.put("order", tok(sut.state.apply(i == n - 1)));
            }
            steps.add(step);
        }
        return map("name", name, "keyKind", kind, "init", tok(init), "steps", steps);
    }

    /** Draws step arguments: k key, h held key, v value, L key list, M value list. */
    private record Gen(String kind, int range, int vals) {
        Object arg(char c, Random r) {
            return switch (c) {
                case 'k' -> key(kind, r.nextInt(range));
                case 'h' -> key(kind, r.nextInt(HELD));
                case 'v' -> r.nextInt(vals);
                case 'L', 'M' -> IntStream.rangeClosed(0, r.nextInt(MAX_LIST))
                    .mapToObj(i -> arg(c == 'L' ? 'k' : 'v', r)).toList();
                default -> throw new IllegalArgumentException("arg " + c);
            };
        }

        List<Step> plan(String[] spec, Random r) {
            List<Step> out = new ArrayList<>();
            for (int i = 0; i < RAND_STEPS; i++) {
                String[] parts = spec[r.nextInt(spec.length)].split(" ");
                List<Object> args = new ArrayList<>();
                for (char c : parts.length > 1 ? parts[1].toCharArray() : new char[0]) {
                    args.add(arg(c, r));
                }
                out.add(new Step(parts[0], args));
            }
            return out;
        }
    }
    private static List<Plan> randomPlans(String kind, String[] spec, int vals) {
        List<Plan> out = new ArrayList<>();
        for (int j = 0; j < RAND_SCRIPTS; j++) {
            Gen g = new Gen(kind, RANGES[j % RANGES.length], vals);
            out.add(new Plan("rand-" + j, g.plan(spec, new Random(SEED + (kind + j).hashCode())), SPARSE));
        }
        return out;
    }
    // ---- maps and sets ----
    private static Sut mapSut(Map<Object, Object> m) {
        return new Sut(full -> map("keys", new ArrayList<>(m.keySet())))
            .op("put", a -> m.put(a.get(0), a.get(1))).op("get", a -> m.get(a.get(0)))
            .op("remove", a -> m.remove(a.get(0))).op("containsKey", a -> m.containsKey(a.get(0)))
            .op("size", a -> m.size()).op("clear", a -> run(m::clear))
            .op("putEach", a -> each(a, k -> m.put(k, 1), m::size));
    }
    private static Sut setSut(Set<Object> s) {
        return new Sut(full -> map("keys", new ArrayList<>(s)))
            .op("add", a -> s.add(a.get(0))).op("remove", a -> s.remove(a.get(0)))
            .op("contains", a -> s.contains(a.get(0))).op("size", a -> s.size())
            .op("clear", a -> run(s::clear)).op("addEach", a -> each(a, s::add, s::size));
    }
    private static List<Step> growShrink(Function<Object, Step> add, Function<Object, Step> rem, String kind) {
        List<Step> p = new ArrayList<>();
        IntStream.range(0, GROW).forEach(i -> p.add(add.apply(key(kind, i))));
        IntStream.range(0, SHRINK).filter(i -> i % 3 == 0).forEach(i -> p.add(rem.apply(key(kind, i))));
        IntStream.range(GROW, GROW + 6).forEach(i -> p.add(add.apply(key(kind, i))));
        p.add(st("clear"));
        IntStream.range(100, 104).forEach(i -> p.add(add.apply(key(kind, i))));
        return p;
    }
    /** Puts keys 0..n one batch at a time, recording at sizes SWEEP_HEAD, SWEEP_MID, n and n + 1 (>= 4). */
    private static Plan sweepPlan(String each, String kind, int n) {
        List<Step> p = new ArrayList<>();
        int prev = 0;
        for (int to : new TreeSet<>(List.of(Math.min(n, SWEEP_HEAD), Math.min(n, SWEEP_MID), n, Math.max(n + 1, 4)))) {
            if (to > prev) {
                p.add(st(each, keys(kind, prev, to)));
                prev = to;
            }
        }
        return new Plan("sweep", p, ALL);
    }

    @SuppressWarnings("unchecked")
    private static Set<Object> newSet(Map<String, Object> init) {
        List<Object> items = (List<Object>) init.getOrDefault("items", List.of());
        return switch ((String) init.get("factory")) {
            case "newHashSet()" -> Sets.newHashSet();
            case "newHashSet(E...)" -> Sets.newHashSet(items.toArray());
            case "newHashSetWithExpectedSize(int)" -> Sets.newHashSetWithExpectedSize((Integer) init.get("n"));
            default -> "collection".equals(init.get("source"))
                ? Sets.newHashSet(items) : Sets.newHashSet((Iterable<Object>) () -> items.iterator());
        };
    }
    private static Sut newSut(Map<String, Object> init) {
        return switch ((String) init.get("factory")) {
            case "newHashMap()" -> mapSut(Maps.newHashMap());
            case "newHashMapWithExpectedSize(int)" -> mapSut(Maps.newHashMapWithExpectedSize((Integer) init.get("n")));
            default -> setSut(newSet(init));
        };
    }
    private static Map<String, Object> setScript(String name, String kind, Map<String, Object> init, Plan p) {
        return script(name, kind, init, newSut(init), p);
    }
    private static Map<String, Object> ctorScript(String kind, String name, String factory, String source,
                                                  List<Object> items) {
        Map<String, Object> init = map("factory", factory, "source", source, "items", items);
        Plan p = new Plan("copy", List.of(st("size"), st("addEach", keys(kind, 150, 154))), ALL);
        return setScript(kind + "-" + name, kind, init, p);
    }

    private static List<Object> setCtorScripts(String kind) {
        List<Object> out = new ArrayList<>();
        for (int n : IntStream.concat(IntStream.rangeClosed(0, 30), IntStream.of(50, SWEEP_MAX)).toArray()) {
            out.add(ctorScript(kind, "varargs-" + n, "newHashSet(E...)", "array", keys(kind, 0, n)));
        }
        for (String source : new String[] {"collection", "iterable"}) {
            for (int n : new int[] {0, 1, 2, 5, 11, 12, 13, 16, 17, 24, 25, 36, 37, 48, 49, 100}) {
                out.add(ctorScript(kind, source + "-" + n, "newHashSet(Iterable)", source, keys(kind, 0, n)));
            }
            for (int m : new int[] {3, 7, 13, 30}) {
                List<Object> twice = keys(kind, 0, m);
                twice.addAll(keys(kind, 0, m));
                out.add(ctorScript(kind, source + "-dups-" + m, "newHashSet(Iterable)", source, twice));
            }
        }
        return out;
    }

    /** Maps.newHashMap* or Sets.newHashSet* scripts: capacity sweep, grow/shrink sequence, random ops. */
    private static List<Object> hashScripts(boolean isMap) {
        String put = isMap ? "put" : "add", factory = isMap ? "newHashMap" : "newHashSet";
        List<Object> out = new ArrayList<>();
        Map<String, Object> init = map("factory", factory + "()");
        for (String kind : KINDS) {
            for (int n = 0; n <= SWEEP_MAX; n++) {
                Map<String, Object> in = map("factory", factory + "WithExpectedSize(int)", "n", n);
                out.add(setScript(kind + "-expected-" + n, kind, in, sweepPlan(put + "Each", kind, n)));
            }
            Function<Object, Step> add = k -> isMap ? st(put, k, 1) : st(put, k);
            out.add(setScript(kind + "-default-seq", kind, init, new Plan("seq", growShrink(add, k -> st("remove", k), kind), SIZED)));
            for (Plan p : randomPlans(kind, isMap ? MAP_SPEC : SET_SPEC, VALS)) {
                out.add(setScript(kind + "-default-" + p.name(), kind, init, p));
            }
            out.addAll(isMap ? List.of() : setCtorScripts(kind));
        }
        return out;
    }
    // ---- HashBiMap ----

    private static Sut biMapSut(BiMap<Object, Object> b) {
        BiMap<Object, Object> inv = b.inverse();
        return new Sut(full -> map("keys", new ArrayList<>(b.keySet()), "values", new ArrayList<>(b.values()),
            "inverseKeys", new ArrayList<>(inv.keySet())))
            .op("put", a -> b.put(a.get(0), a.get(1))).op("forcePut", a -> b.forcePut(a.get(0), a.get(1)))
            .op("remove", a -> b.remove(a.get(0))).op("get", a -> b.get(a.get(0)))
            .op("containsKey", a -> b.containsKey(a.get(0))).op("size", a -> b.size())
            .op("inversePut", a -> inv.put(a.get(0), a.get(1)))
            .op("inverseForcePut", a -> inv.forcePut(a.get(0), a.get(1)))
            .op("inverseRemove", a -> inv.remove(a.get(0))).op("inverseGet", a -> inv.get(a.get(0)))
            .op("inverseContainsKey", a -> inv.containsKey(a.get(0))).op("clear", a -> run(b::clear));
    }

    private static List<Object> biMapScripts() {
        List<Object> out = new ArrayList<>();
        Map<String, Object> init = map("factory", "HashBiMap.create()");
        for (String kind : KINDS) {
            List<Plan> plans = new ArrayList<>(List.of(new Plan("seq", seq(kind, GROW, GROW), SIZED),
                new Plan("duplicate-value", dsl(kind, BI_DUP), ALL), new Plan("inverse", dsl(kind, BI_INV), ALL),
                new Plan("remove-reinsert", dsl(kind, BI_REM), ALL)));
            plans.addAll(randomPlans(kind, BIMAP_SPEC, BIMAP_VALS));
            plans.forEach(p -> out.add(script(kind + "-" + p.name(), kind, init, biMapSut(HashBiMap.create()), p)));
        }
        return out;
    }
    // ---- multimaps ----

    private static Sut multimapSut(Multimap<Object, Object> mm) {
        Map<Object, Collection<Object>> held = new HashMap<>();
        return new Sut(full -> multimapState(mm, full))
            .op("put", a -> mm.put(a.get(0), a.get(1))).op("remove", a -> mm.remove(a.get(0), a.get(1)))
            .op("removeAll", a -> new ArrayList<>(mm.removeAll(a.get(0))))
            .op("get", a -> new ArrayList<>(mm.get(a.get(0)))).op("containsKey", a -> mm.containsKey(a.get(0)))
            .op("putAll", a -> mm.putAll(a.get(0), list(a, 1))).op("size", a -> mm.size())
            .op("clear", a -> run(mm::clear)).op("putEach", a -> each(a, k -> mm.put(k, 0), mm::size))
            .op("hold", a -> run(() -> held.put(a.get(0), mm.get(a.get(0))))).op("holdRead", a -> new ArrayList<>(held.get(a.get(0))))
            .op("holdAdd", a -> held.get(a.get(0)).add(a.get(1)))
            .op("holdRemove", a -> held.get(a.get(0)).remove(a.get(1)));
    }

    private static Map<String, Object> multimapState(Multimap<Object, Object> mm, boolean full) {
        List<Object> entries = new ArrayList<>();
        mm.entries().forEach(e -> entries.add(Arrays.asList(e.getKey(), e.getValue())));
        Map<String, Object> state = map("keySet", new ArrayList<>(mm.keySet()), "entries", entries);
        if (full) {
            state.putAll(map("keys", new ArrayList<>(mm.keys()), "values", new ArrayList<>(mm.values()),
                "size", mm.size()));
        }
        return state;
    }

    /** put key (i mod keys), value i, for i below n. */
    private static List<Step> seq(String kind, int keys, int n) {
        return IntStream.range(0, n).mapToObj(i -> st("put", key(kind, i % keys), i)).toList();
    }

    private static List<Step> concat(List<Step> head, List<Step> tail) {
        return Stream.concat(head.stream(), tail.stream()).toList();
    }
    private static List<Plan> multimapPlans(String kind) {
        List<Step> growth = IntStream.range(0, GROW).mapToObj(i -> st("put", key(kind, i % 3), i * 7 % 31)).toList();
        List<Step> removes = concat(seq(kind, 14, 28), dsl(kind, REMOVES));
        List<Plan> out = new ArrayList<>(List.of(new Plan("seq-small", seq(kind, 6, 18), ALL),
            new Plan("seq-mid", seq(kind, 30, 60), SPARSE), new Plan("seq-big", seq(kind, 60, 70), SPARSE),
            new Plan("growth", growth, SIZED), new Plan("views", dsl(kind, VIEWS), ALL),
            new Plan("removes", removes, SPARSE), new Plan("order", dsl(kind, ORDER), ALL),
            new Plan("dup-puts", dsl(kind, DUPS), ALL)));
        for (Plan p : randomPlans(kind, MM_SPEC, VALS)) {
            out.add(new Plan(p.name(), concat(dsl(kind, "hold k0;hold k1"), p.steps()), p.rec()));
        }
        return out;
    }

    private static List<Object> multimapScripts(String tag, Map<String, Object> init,
                                                Supplier<Multimap<Object, Object>> factory, String[] kinds) {
        List<Object> out = new ArrayList<>();
        for (String kind : kinds) {
            for (Plan p : multimapPlans(kind)) {
                out.add(script(tag + "-" + kind + "-" + p.name(), kind, init, multimapSut(factory.get()), p));
            }
        }
        return out;
    }
    private static List<Object> plainScripts(String tag, Supplier<Multimap<Object, Object>> factory) {
        return multimapScripts(tag, map("factory", tag + ".create()"), factory, KINDS);
    }

    private static List<Object> arrayListScripts() {
        List<Object> out = plainScripts("ArrayListMultimap", ArrayListMultimap::create);
        int[] perKey = {0, 100, 50};
        for (String kind : KINDS) {
            for (int n = 0; n <= KEY_SWEEP_MAX; n++) {
                int vpk = n < perKey.length ? perKey[n] : 3;
                Map<String, Object> in = map("factory", "ArrayListMultimap.create(int,int)", "expectedKeys", n,
                    "expectedValuesPerKey", vpk);
                out.add(script(kind + "-create-" + n, kind, in, multimapSut(ArrayListMultimap.create(n, vpk)),
                    sweepPlan("putEach", kind, n)));
            }
        }
        return out;
    }
    // ---- TreeMultimap: comparator names natural | reverse | coarse (equal within a class) ----

    @SuppressWarnings("unchecked")
    private static Comparator<Object> order(String name, boolean keys) {
        ToIntFunction<Object> cls = keys
            ? o -> o instanceof String s ? s.length() : Math.floorDiv((Integer) o, COARSE_KEY)
            : o -> Math.floorDiv((Integer) o, COARSE_VALUE);
        Comparator<Object> natural = (a, b) -> ((Comparable<Object>) a).compareTo(b);
        return switch (name) {
            case "natural" -> natural;
            case "reverse" -> natural.reversed();
            default -> Comparator.comparingInt(cls);
        };
    }

    private static List<Object> treeScripts() {
        List<Object> out = new ArrayList<>();
        for (String keyOrder : ORDERS) {
            for (String valueOrder : ORDERS) {
                Map<String, Object> init = map("factory", "TreeMultimap.create(Comparator,Comparator)",
                    "keyOrder", keyOrder, "valueOrder", valueOrder);
                Supplier<Multimap<Object, Object>> f =
                    () -> TreeMultimap.create(order(keyOrder, true), order(valueOrder, false));
                out.addAll(multimapScripts("TreeMultimap-" + keyOrder + "-" + valueOrder, init, f, TREE_KINDS));
            }
        }
        return out;
    }
}
