// SPDX-License-Identifier: EPL-2.0
// Generates the frozen JVM metadata reference (AD-13, C4) for the melk generator: what the oracle's generated
// *Options / *MetaDataProvider classes register at the pinned ELK commit. Exercised: ELK org.eclipse.elk.core --
// ILayoutMetaDataProvider.apply, LayoutMetaDataService (getInstance, registerLayoutMetaDataProviders, getOptionData,
// getCategoryData, getAlgorithmData), LayoutOptionData, LayoutCategoryData, LayoutAlgorithmData, ElkReflect cloning
// of defaults. This program only CALLS ELK and records results; it embeds no ELK implementation. It never calls a
// provider factory's create().
// Run: tools/vectors/metadata-vectors.sh <outDir>  (java -cp ... MetaDataVectors.java <outDir>)
// Output <outDir>/metadata.json, keys sorted (except "fields", which keeps Java declaration order), 2-space indent,
// trailing newline:
//   { elkCommit,
//     providers: { <fully qualified class>: [ call ] },   // calls in the order apply() made them
//     service:   { options: [option], categories: [category], algorithms: [algorithm] } }
//   call = { call: "registerOption"|"registerCategory"|"registerAlgorithm", data: option|category|algorithm }
//        | { call: "addDependency", source, target, value }
//        | { call: "addOptionSupport", algorithm, option, default }
//   option    = { id, group, name, description, type, optionClass, default, lowerBound, upperBound, targets,
//                 visibility, legacyIds }              (+ dependencies: [{target, value}] in the service dump)
//   category  = { id, name, description }              (+ layouters: [algorithm id] in the service dump)
//   algorithm = { id, name, description, category, bundleName, definingBundleId, previewImagePath,
//                 supportedFeatures, validatorClass, factoryClass }
//                                                      (+ knownOptions: [{id, default}] in the service dump)
// Structural scalars are plain JSON: strings, null, enum constants as their name (type, visibility, targets and
// supportedFeatures as arrays of names in EnumSet order), optionClass/validatorClass as the Class simple name,
// factoryClass as the binary class name of the provider factory (read from the InstancePool's private "factory"
// field; create() is never called). default, lowerBound, upperBound, value and every knownOptions default use the
// C4 value encoding ({"t":..}). A bound still at Property.NEGATIVE_INFINITY / POSITIVE_INFINITY (the getters'
// "unset" sentinels, anonymous classes) is recorded as null. A value outside the C4 table aborts with its class.
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.eclipse.elk.core.data.*;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.util.InstancePool;
import org.eclipse.elk.core.util.Pair;
import org.eclipse.elk.graph.properties.Property;

public class MetaDataVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String T = "t", V = "v", C = "c", ID = "id", DEFAULT = "default", VALUE = "value";
    private static final String CALL = "call", DATA = "data", SOURCE = "source", TARGET = "target";
    private static final String INDENT = "  ";
    private static final String[] PROVIDERS = {
        "org.eclipse.elk.core.options.CoreOptions", "org.eclipse.elk.core.options.FixedLayouterOptions",
        "org.eclipse.elk.core.options.BoxLayouterOptions", "org.eclipse.elk.core.options.RandomLayouterOptions",
        "org.eclipse.elk.core.labels.LabelManagementOptions",
        "org.eclipse.elk.alg.common.compaction.options.PolyominoOptions",
        "org.eclipse.elk.alg.disco.options.DisCoMetaDataProvider", "org.eclipse.elk.alg.disco.options.DisCoOptions",
        "org.eclipse.elk.alg.force.options.ForceMetaDataProvider", "org.eclipse.elk.alg.force.options.ForceOptions",
        "org.eclipse.elk.alg.force.options.StressMetaDataProvider", "org.eclipse.elk.alg.force.options.StressOptions",
        "org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider",
        "org.eclipse.elk.alg.layered.options.LayeredOptions",
        "org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider", "org.eclipse.elk.alg.mrtree.options.MrTreeOptions",
        "org.eclipse.elk.alg.radial.options.RadialMetaDataProvider", "org.eclipse.elk.alg.radial.options.RadialOptions",
        "org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider",
        "org.eclipse.elk.alg.rectpacking.options.RectPackingOptions",
        "org.eclipse.elk.alg.spore.options.SporeMetaDataProvider",
        "org.eclipse.elk.alg.spore.options.SporeCompactionOptions",
        "org.eclipse.elk.alg.spore.options.SporeOverlapRemovalOptions",
        "org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider",
        "org.eclipse.elk.alg.topdownpacking.options.TopdownpackingOptions",
        "org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider",
        "org.eclipse.elk.alg.vertiflex.options.VertiFlexOptions"};

    public static void main(String[] args) throws Exception {
        Path dir = Path.of(args[0]);
        Files.createDirectories(dir);
        Map<String, Object> root = new TreeMap<>();
        root.put("elkCommit", ELK_COMMIT);
        root.put("providers", providers());
        root.put("service", service());
        StringBuilder out = new StringBuilder();
        write(out, root, 0);
        Files.writeString(dir.resolve("metadata.json"), out.append('\n'), StandardCharsets.UTF_8);
    }

    // ---- (i) providers ----

    private static Map<String, Object> providers() throws ReflectiveOperationException {
        LayoutMetaDataService.initElkReflect();
        Map<String, Object> result = new TreeMap<>();
        for (String name : PROVIDERS) {
            ILayoutMetaDataProvider provider =
                (ILayoutMetaDataProvider) Class.forName(name).getDeclaredConstructor().newInstance();
            Recorder recorder = new Recorder();
            provider.apply(recorder);
            result.put(name, recorder.calls);
        }
        return result;
    }

    private static final class Recorder implements ILayoutMetaDataProvider.Registry {
        final List<Object> calls = new ArrayList<>();

        public void register(LayoutAlgorithmData d) { calls.add(call("registerAlgorithm", DATA, algorithm(d))); }
        public void register(LayoutOptionData d) { calls.add(call("registerOption", DATA, option(d))); }
        public void register(LayoutCategoryData d) { calls.add(call("registerCategory", DATA, category(d))); }

        public void addDependency(String source, String target, Object value) {
            Map<String, Object> m = call("addDependency", SOURCE, source);
            m.put(TARGET, target);
            m.put(VALUE, encode(value));
            calls.add(m);
        }

        public void addOptionSupport(String algorithm, String option, Object defaultValue) {
            Map<String, Object> m = call("addOptionSupport", "algorithm", algorithm);
            m.put("option", option);
            m.put(DEFAULT, encode(defaultValue));
            calls.add(m);
        }
    }

    private static Map<String, Object> call(String name, String key, Object value) {
        Map<String, Object> m = new TreeMap<>();
        m.put(CALL, name);
        m.put(key, value);
        return m;
    }

    // ---- (ii) service ----

    private static Map<String, Object> service() {
        // A parentless loader finds no META-INF/services entries, so getInstance registers CoreOptions only (C8);
        // the oracle jars on the classpath would otherwise make its ServiceLoader pass register every algorithm.
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions());
        Map<String, Object> result = new TreeMap<>();
        List<Object> options = new ArrayList<>();
        for (LayoutOptionData o : svc.getOptionData()) {
            Map<String, Object> m = option(o);
            m.put("dependencies", dependencies(o));
            options.add(m);
        }
        List<Object> categories = new ArrayList<>();
        for (LayoutCategoryData c : svc.getCategoryData()) {
            Map<String, Object> m = category(c);
            List<Object> ids = new ArrayList<>();
            c.getLayouters().forEach(a -> ids.add(a.getId()));
            m.put("layouters", ids);
            categories.add(m);
        }
        List<Object> algorithms = new ArrayList<>();
        for (LayoutAlgorithmData a : svc.getAlgorithmData()) {
            Map<String, Object> m = algorithm(a);
            m.put("knownOptions", knownOptions(a));
            algorithms.add(m);
        }
        result.put("options", options);
        result.put("categories", categories);
        result.put("algorithms", algorithms);
        return result;
    }

    private static List<Object> dependencies(LayoutOptionData o) {
        List<Object> deps = new ArrayList<>();
        for (Pair<LayoutOptionData, Object> p : o.getDependencies()) {
            Map<String, Object> m = new TreeMap<>();
            m.put(TARGET, p.getFirst().getId());
            m.put(VALUE, encode(p.getSecond()));
            deps.add(m);
        }
        return deps;
    }

    private static List<Object> knownOptions(LayoutAlgorithmData a) {
        List<Object> known = new ArrayList<>();
        for (String id : a.getKnownOptionIds()) {
            Map<String, Object> m = new TreeMap<>();
            m.put(ID, id);
            m.put(DEFAULT, encode(a.getDefaultValue(id)));
            known.add(m);
        }
        return known;
    }

    // ---- metadata records ----

    private static Map<String, Object> option(LayoutOptionData o) {
        Map<String, Object> m = new TreeMap<>();
        m.put(ID, o.getId());
        m.put("group", o.getGroup());
        m.put("name", o.getName());
        m.put("description", o.getDescription());
        m.put("type", names(Collections.singleton(o.getType())).get(0));
        m.put("optionClass", simpleName(o.getOptionClass()));
        m.put(DEFAULT, encode(o.getDefault()));
        m.put("lowerBound", encode(bound(o.getLowerBound())));
        m.put("upperBound", encode(bound(o.getUpperBound())));
        m.put("targets", names(o.getTargets()));
        m.put("visibility", o.getVisibility() == null ? null : o.getVisibility().name());
        m.put("legacyIds", o.getLegacyIds() == null ? null : Arrays.asList(o.getLegacyIds()));
        return m;
    }

    private static Map<String, Object> category(LayoutCategoryData c) {
        Map<String, Object> m = new TreeMap<>();
        m.put(ID, c.getId());
        m.put("name", c.getName());
        m.put("description", c.getDescription());
        return m;
    }

    private static Map<String, Object> algorithm(LayoutAlgorithmData a) {
        Map<String, Object> m = new TreeMap<>();
        m.put(ID, a.getId());
        m.put("name", a.getName());
        m.put("description", a.getDescription());
        m.put("category", a.getCategoryId());
        m.put("bundleName", a.getBundleName());
        m.put("definingBundleId", a.getDefiningBundleId());
        m.put("previewImagePath", a.getPreviewImagePath());
        m.put("supportedFeatures", names(a.getSupportedFeatures()));
        m.put("validatorClass", a.getValidatorClass() == null ? null : simpleName(a.getValidatorClass()));
        m.put("factoryClass", factoryClass(a.getInstancePool()));
        return m;
    }

    private static String factoryClass(InstancePool<?> pool) {
        try {
            Field f = InstancePool.class.getDeclaredField("factory");
            f.setAccessible(true);
            Object factory = f.get(pool);
            return factory == null ? null : factory.getClass().getName();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("cannot read the provider factory class", e);
        }
    }

    private static Object bound(Object b) {
        return b == Property.NEGATIVE_INFINITY || b == Property.POSITIVE_INFINITY ? null : b;
    }

    private static List<Object> names(Collection<? extends Enum<?>> values) {
        List<Object> result = new ArrayList<>();
        for (Enum<?> e : values) {
            result.add(e.name());
        }
        return result;
    }

    // ---- C4 value encoding ----

    private static Object encode(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Boolean) {
            return scalar("bool", v);
        } else if (v instanceof Integer) {
            return scalar("int", v);
        } else if (v instanceof String) {
            return scalar("string", v);
        } else if (v instanceof Double || v instanceof Float) {
            return scalar("double", Double.toString(((Number) v).doubleValue()));
        }
        return encodeComposite(v);
    }

    private static Object encodeComposite(Object v) {
        if (v instanceof Enum<?> e) {
            Map<String, Object> m = tagged("enum", typeName(e.getDeclaringClass()));
            m.put("n", e.name());
            return m;
        } else if (v instanceof EnumSet<?> s) {
            Map<String, Object> m = tagged("set", typeName(enumSetElementClass(s)));
            m.put("items", names(s));
            return m;
        } else if (v instanceof List<?> l) {
            Map<String, Object> m = tagged("list", l.getClass().getSimpleName());
            List<Object> items = new ArrayList<>();
            l.forEach(i -> items.add(encode(i)));
            m.put("items", items);
            return m;
        } else if (v instanceof Class<?> k) {
            return tagged("class", k.getSimpleName());
        }
        return encodeObject(v);
    }

    private static Object encodeObject(Object v) {
        Class<?> k = v.getClass();
        if (k.isAnonymousClass() || k.isArray() || v instanceof Number || v instanceof Map || v instanceof Set
            || v instanceof Character) {
            throw new IllegalStateException("unencodable value of class " + k.getName());
        }
        Map<String, Object> m = tagged("obj", k.getSimpleName());
        m.put("fields", encodeFields(v));
        return m;
    }

    private static Map<String, Object> encodeFields(Object v) {
        Map<String, Object> fields = new LinkedHashMap<>();
        try {
            for (Class<?> c : hierarchy(v.getClass())) {
                for (Field f : c.getDeclaredFields()) {
                    if (!Modifier.isStatic(f.getModifiers()) && !f.isSynthetic()) {
                        f.setAccessible(true);
                        fields.put(f.getName(), encode(f.get(v)));
                    }
                }
            }
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("unencodable value of class " + v.getClass().getName(), e);
        }
        return fields;
    }

    private static List<Class<?>> hierarchy(Class<?> k) {
        LinkedList<Class<?>> chain = new LinkedList<>();
        for (Class<?> c = k; c != null && c != Object.class; c = c.getSuperclass()) {
            chain.addFirst(c);
        }
        return chain;
    }

    // An empty EnumSet cannot name its element class; its complement is the full set, which can.
    private static Class<?> enumSetElementClass(EnumSet<?> s) {
        EnumSet<?> source = s.isEmpty() ? EnumSet.complementOf(s) : s;
        return source.iterator().next().getDeclaringClass();
    }

    private static Map<String, Object> scalar(String type, Object value) {
        Map<String, Object> m = new TreeMap<>();
        m.put(T, type);
        m.put(V, value);
        return m;
    }

    private static Map<String, Object> tagged(String type, String className) {
        Map<String, Object> m = new TreeMap<>();
        m.put(T, type);
        m.put(C, className);
        return m;
    }

    private static String simpleName(Class<?> k) {
        return k.getSimpleName();
    }

    private static String typeName(Class<?> k) {
        return k.getEnclosingClass() == null ? k.getSimpleName() : typeName(k.getEnclosingClass()) + "." + k.getSimpleName();
    }

    // ---- JSON writer ----

    private static void write(StringBuilder out, Object v, int depth) {
        if (v == null) {
            out.append("null");
        } else if (v instanceof String s) {
            quote(out, s);
        } else if (v instanceof Boolean || v instanceof Integer) {
            out.append(v);
        } else if (v instanceof Map<?, ?> m) {
            writeObject(out, m, depth);
        } else if (v instanceof List<?> l) {
            writeArray(out, l, depth);
        } else {
            throw new IllegalStateException("unwritable value of class " + v.getClass().getName());
        }
    }

    private static void writeObject(StringBuilder out, Map<?, ?> m, int depth) {
        if (m.isEmpty()) {
            out.append("{}");
            return;
        }
        out.append("{\n");
        Iterator<? extends Map.Entry<?, ?>> it = m.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<?, ?> e = it.next();
            out.append(INDENT.repeat(depth + 1));
            quote(out, (String) e.getKey());
            out.append(": ");
            write(out, e.getValue(), depth + 1);
            out.append(it.hasNext() ? ",\n" : "\n");
        }
        out.append(INDENT.repeat(depth)).append('}');
    }

    private static void writeArray(StringBuilder out, List<?> l, int depth) {
        if (l.isEmpty()) {
            out.append("[]");
            return;
        }
        out.append("[\n");
        for (int i = 0; i < l.size(); i++) {
            out.append(INDENT.repeat(depth + 1));
            write(out, l.get(i), depth + 1);
            out.append(i < l.size() - 1 ? ",\n" : "\n");
        }
        out.append(INDENT.repeat(depth)).append(']');
    }

    private static void quote(StringBuilder out, String s) {
        out.append('"');
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (ch < ' ') {
                        out.append(String.format("\\u%04x", (int) ch));
                    } else {
                        out.append(ch);
                    }
                }
            }
        }
        out.append('"');
    }
}
