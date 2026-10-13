// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, J1) for the Gson subset graph.json relies on: Gson 2.11.0 as run by
// the oracle (ElkGraphJson.java:115-140 reads via TypeAdapter<JsonElement> on a JsonReader; :222-241 writes via
// GsonBuilder.disableHtmlEscaping()[.setPrettyPrinting()].create().toJson(JsonElement); JsonAdapter.xtend supplies the
// JsonObject / JsonArray / JsonPrimitive calls). This program only CALLS Gson and records results; it embeds no Gson
// code and has its own JSON writer, so the recording does not depend on the recorded library.
// Run: tools/vectors/gson-vectors.sh <outDir>  (java -cp <gson jar> GsonVectors.java <outDir> <gsonVersion> <cases>)
// Cases: tools/vectors/gson-cases.txt (sections documented there; escapes decoded; token "lazy:<text>" = LazilyParsedNumber).
// Output: {gsonVersion, jdk, parse, primitive, write, objectOps, arrayOps, equality}; keys sorted, 2-space indent.
// <T> (a JsonElement) = null (JsonNull) | {"num":raw} | {"str":s} | {"bool":b} | {"arr":[T]} | {"obj":[[k,T]]}. A
// number's raw text is getAsNumber().toString(). Every row has "id"; an exception is "throws": {class (simple name),
// message, cause?}. Rows: parse {input, via reader|parseString, lenient, tree|throws, after?} (reader = the adapter
// read with setLenient(true) when lenient, no strictness call when strict; "after" = reader.peek() once the value was
// read; parseString is lenient by its Javadoc; "deep-" rows record {depth} instead of the tree); primitive {value,
// valueType?, op, result (String.valueOf)|throws}; write {tree, numTypes, pretty, text|throws}; objectOps/arrayOps {ops:
// [[name, key-or-index, T?]], results: [T|{javaNull}|{void}|{num}|{bool}|{str}|{keys}|{throws}], tree, keys?, equalsTo?,
// equals?, hashCodesEqual?}; equality {a, b, aTypes, bTypes, equals, hashCodesEqual}.
import com.google.gson.*;
import com.google.gson.stream.JsonReader;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.BiFunction;
import java.util.function.Function;

public class GsonVectors {
    private static final Object VOID = new Object();
    private static final Map<Character, Character> ESCAPES = Map.of('n', '\n', 'r', '\r', 't', '\t', 'b', '\b', 'f', '\f');
    private static final int INDENT = 2, FIRST_PRINTABLE = 0x20, HEX_RADIX = 16, HEX_WIDTH = 4;
    private static final Map<String, Function<JsonElement, Object>> PRIM_OPS = new LinkedHashMap<>();
    private static final Map<String, BiFunction<JsonObject, Object[], Object>> OBJ_OPS = new HashMap<>();
    private static final Map<String, BiFunction<JsonArray, Object[], Object>> ARR_OPS = new HashMap<>();

    static { primitiveOps(); objectOps(); arrayOps(); }

    interface Action { Object get() throws Exception; }
    static Map<String, Object> m(Object... kv) {
        Map<String, Object> map = new TreeMap<>();
        for (int i = 0; i < kv.length; i += 2) map.put((String) kv[i], kv[i + 1]);
        return map;
    }

    static Map<String, Object> thrown(Throwable t) {
        Map<String, Object> map = m("class", t.getClass().getSimpleName(), "message", t.getMessage());
        if (t.getCause() != null) map.put("cause", thrown(t.getCause()));
        return map;
    }

    static void record(Map<String, Object> row, String key, Action action) {
        try {
            row.put(key, action.get());
        } catch (Throwable t) {
            row.put("throws", thrown(t));
        }
    }

    static Collection<JsonElement> children(JsonElement e) {
        if (e.isJsonArray()) return e.getAsJsonArray().asList();
        return e.isJsonObject() ? e.getAsJsonObject().asMap().values() : List.of();
    }

    static int depth(JsonElement e) {
        int deepest = 0;
        for (JsonElement x : children(e)) deepest = Math.max(deepest, depth(x));
        return e.isJsonArray() || e.isJsonObject() ? deepest + 1 : 0;
    }

    /** Deep-nesting rows record only the nesting depth (the full tree would be quadratic in size). */
    static Object shape(Object id, JsonElement e) {
        return id.toString().startsWith("deep-") ? m("depth", depth(e)) : tree(e);
    }

    static Object tree(JsonElement e) {
        if (e == null || e.isJsonNull()) return null;
        if (e.isJsonPrimitive()) {
            JsonPrimitive p = e.getAsJsonPrimitive();
            if (p.isBoolean()) return m("bool", p.getAsBoolean());
            return p.isNumber() ? m("num", p.getAsNumber().toString()) : m("str", p.getAsString());
        }
        List<Object> items = new ArrayList<>();
        if (e.isJsonArray()) {
            for (JsonElement x : e.getAsJsonArray()) items.add(tree(x));
            return m("arr", items);
        }
        for (Map.Entry<String, JsonElement> x : e.getAsJsonObject().entrySet()) {
            items.add(Arrays.asList(x.getKey(), tree(x.getValue())));
        }
        return m("obj", items);
    }

    static void numTypes(JsonElement e, Set<String> out) {
        if (e.isJsonPrimitive() && e.getAsJsonPrimitive().isNumber()) out.add(e.getAsNumber().getClass().getSimpleName());
        for (JsonElement x : children(e)) numTypes(x, out);
    }

    static List<String> numTypes(JsonElement e) {
        Set<String> out = new TreeSet<>(); numTypes(e, out); return new ArrayList<>(out);
    }

    /** Encodes an op argument or result; JsonElement as a tree, VOID as null (callers drop it). */
    static Object enc(Object v) {
        if (v == VOID) return m("void", true);
        if (v == null) return m("javaNull", true);
        if (v instanceof JsonElement) return tree((JsonElement) v);
        if (v instanceof Boolean) return m("bool", v);
        if (v instanceof Number) return m("num", v.toString());
        if (v instanceof Collection) return m("keys", new ArrayList<>((Collection<?>) v));
        return m("str", v.toString());
    }

    static JsonElement parse(String text) { return JsonParser.parseString(text); }
    static JsonObject obj(Object... kv) {
        JsonObject o = new JsonObject();
        for (int i = 0; i < kv.length; i += 2) o.add((String) kv[i], el(kv[i + 1]));
        return o;
    }

    static JsonArray arr(Object... xs) {
        JsonArray a = new JsonArray();
        for (Object x : xs) a.add(el(x));
        return a;
    }

    static JsonElement el(Object x) {
        if (x instanceof JsonElement) return (JsonElement) x;
        if (x instanceof Number) return new JsonPrimitive((Number) x);
        if (x instanceof Boolean) return new JsonPrimitive((Boolean) x);
        return new JsonPrimitive((String) x);
    }

    static final Map<String, Function<String, Object>> KINDS = Map.of("int", Integer::valueOf, "long", Long::valueOf,
        "double", Double::valueOf, "float", Float::valueOf, "short", Short::valueOf, "byte", Byte::valueOf,
        "bigdecimal", java.math.BigDecimal::new, "biginteger", java.math.BigInteger::new,
        "bool", Boolean::valueOf, "str", GsonVectors::unescape);

    /** "kind:text" builds a JsonPrimitive of that Java type; anything else is JSON text parsed by JsonParser. */
    static JsonElement lazy(String text) { return new JsonPrimitive(new com.google.gson.internal.LazilyParsedNumber(text)); }

    static JsonElement typed(String token) {
        if (token.startsWith("lazy:")) return lazy(unescape(token.substring(5)));
        int colon = token.indexOf(':');
        if (colon > 0 && KINDS.containsKey(token.substring(0, colon))) {
            return el(KINDS.get(token.substring(0, colon)).apply(token.substring(colon + 1)));
        }
        return parse(token);
    }

    static List<Object[]> typedRows(String section) {
        List<Object[]> rows = new ArrayList<>();
        for (String[] f : fields(section)) rows.add(new Object[] {f[0], typed(f[1])});
        return rows;
    }

    static Map<String, List<String>> CASES; // sections of gson-cases.txt, set by main

    static Map<String, List<String>> loadCases(Path file) throws IOException {
        Map<String, List<String>> cases = new HashMap<>();
        List<String> current = null;
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            if (line.isEmpty() || line.startsWith("#")) continue;
            if (line.startsWith("[")) {
                current = new ArrayList<>();
                cases.put(line.substring(1, line.length() - 1), current);
            } else current.add(line);
        }
        return cases;
    }

    static List<String[]> fields(String section) {
        List<String[]> rows = new ArrayList<>();
        for (String line : CASES.get(section)) rows.add(line.split("\t", -1));
        return rows;
    }

    static String unescape(String s) {
        if (s.equals("\\e")) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            char n = c == '\\' ? s.charAt(++i) : c;
            if (c == '\\' && n == 'u') {
                b.append((char) Integer.parseInt(s.substring(i + 1, i + 1 + HEX_WIDTH), HEX_RADIX));
                i += HEX_WIDTH;
            } else b.append(c == '\\' ? ESCAPES.getOrDefault(n, n) : n);
        }
        return b.toString();
    }

    static List<Object[]> parseInputs() {
        List<Object[]> rows = new ArrayList<>();
        for (String line : CASES.get("parse")) {
            int tab = line.indexOf('\t');
            rows.add(new Object[] {line.substring(0, tab), unescape(line.substring(tab + 1))});
        }
        for (String n : CASES.get("parseNumbers")) rows.add(new Object[] {"number-" + unescape(n), "[" + unescape(n) + "]"});
        for (int depth : new int[] {100, 255, 256, 300, 1000}) {
            rows.add(new Object[] {"deep-arrays-" + depth, "[".repeat(depth) + "]".repeat(depth)});
            rows.add(new Object[] {"deep-objects-" + depth, "{\"a\":".repeat(depth) + "1" + "}".repeat(depth)});
        }
        return rows;
    }

    static List<Object> parseRows() {
        List<Object> rows = new ArrayList<>();
        for (Object[] in : parseInputs()) {
            String input = (String) in[1];
            rows.add(readerRow((String) in[0], input, false));
            rows.add(readerRow((String) in[0], input, true));
            Map<String, Object> row = m("id", in[0] + "/parseString", "input", input, "via", "parseString",
                "lenient", true);
            record(row, "tree", () -> shape(in[0], JsonParser.parseString(input)));
            rows.add(row);
        }
        return rows;
    }

    static Map<String, Object> readerRow(String id, String input, boolean lenient) {
        Map<String, Object> row = m("id", id + (lenient ? "/reader-lenient" : "/reader-strict"), "input", input,
            "via", "reader", "lenient", lenient);
        TypeAdapter<JsonElement> adapter = new Gson().getAdapter(JsonElement.class);
        JsonReader reader = new JsonReader(new StringReader(input));
        if (lenient) reader.setLenient(true);
        record(row, "tree", () -> shape(id, adapter.read(reader)));
        if (!row.containsKey("throws")) {
            Map<String, Object> peek = m();
            record(peek, "name", () -> reader.peek().name());
            row.put("after", peek.getOrDefault("name", peek.get("throws")));
        }
        return row;
    }

    static void primitiveOps() {
        PRIM_OPS.put("getAsString", e -> e.getAsString()); PRIM_OPS.put("getAsDouble", e -> e.getAsDouble());
        PRIM_OPS.put("getAsInt", e -> e.getAsInt()); PRIM_OPS.put("getAsLong", e -> e.getAsLong());
        PRIM_OPS.put("getAsBoolean", e -> e.getAsBoolean()); PRIM_OPS.put("toString", e -> e.toString());
        PRIM_OPS.put("isNumber", e -> e.getAsJsonPrimitive().isNumber());
        PRIM_OPS.put("isString", e -> e.getAsJsonPrimitive().isString());
        PRIM_OPS.put("isBoolean", e -> e.getAsJsonPrimitive().isBoolean());
        PRIM_OPS.put("getAsNumberIntValue", e -> e.getAsNumber().intValue());
        PRIM_OPS.put("isJsonPrimitive", e -> e.isJsonPrimitive()); PRIM_OPS.put("isJsonNull", e -> e.isJsonNull());
        PRIM_OPS.put("isJsonObject", e -> e.isJsonObject()); PRIM_OPS.put("isJsonArray", e -> e.isJsonArray());
        PRIM_OPS.put("getAsJsonObject", e -> e.getAsJsonObject());
        PRIM_OPS.put("getAsJsonArray", e -> e.getAsJsonArray());
    }

    static List<Object[]> primitiveValues() {
        List<Object[]> rows = typedRows("primitiveValues");
        for (String c : CASES.get("primitiveStrings")) rows.add(new Object[] {"string-" + unescape(c), new JsonPrimitive(unescape(c))});
        for (int n : new int[] {10000, 10001}) rows.add(new Object[] {"lazy-" + n + "-digits", lazy("1".repeat(n))});
        return rows;
    }

    static List<Object> primitiveRows() {
        List<Object> rows = new ArrayList<>();
        for (Object[] v : primitiveValues()) {
            JsonElement value = (JsonElement) v[1];
            for (Map.Entry<String, Function<JsonElement, Object>> op : PRIM_OPS.entrySet()) {
                Map<String, Object> row = m("id", v[0] + "/" + op.getKey(), "value", tree(value), "op", op.getKey());
                if (value.isJsonPrimitive() && value.getAsJsonPrimitive().isNumber()) {
                    row.put("valueType", value.getAsNumber().getClass().getSimpleName());
                }
                record(row, "result", () -> String.valueOf(op.getValue().apply(value)));
                rows.add(row);
            }
        }
        rows.addAll(constructRows());
        return rows;
    }

    static List<Object> constructRows() {
        String[] kinds = {"String", "Number", "Boolean"};
        Action[] ctors = {() -> String.valueOf(new JsonPrimitive((String) null)),
            () -> String.valueOf(new JsonPrimitive((Number) null)),
            () -> String.valueOf(new JsonPrimitive((Boolean) null))};
        List<Object> rows = new ArrayList<>();
        for (int i = 0; i < kinds.length; i++) {
            Map<String, Object> row = m("id", "new-JsonPrimitive-null-" + kinds[i], "value", null, "op", "construct");
            record(row, "result", ctors[i]);
            rows.add(row);
        }
        return rows;
    }

    static List<Object[]> writeCases() {
        List<Object[]> rows = typedRows("writeValues");
        for (String c : CASES.get("writeStrings")) rows.add(new Object[] {"string-" + unescape(c), new JsonPrimitive(unescape(c))});
        rows.add(new Object[] {"key-specials", obj("<k>&=", 1, "a\"b", 2, "\u2028", 3, "\n", 4, "", 5)});
        rows.add(new Object[] {"string-members", obj("a", "<>&='", "b", "\u2028\u2029")});
        rows.add(new Object[] {"number-member", obj("width", 40.0, "height", 12)});
        rows.add(new Object[] {"numbers-in-array", arr(40.0, 1.0E-5, 3, -0.0)});
        return rows;
    }

    static List<Object> writeRows() {
        List<Object> rows = new ArrayList<>();
        for (Object[] c : writeCases()) {
            JsonElement e = (JsonElement) c[1];
            for (boolean pretty : new boolean[] {false, true}) {
                Map<String, Object> row = m("id", c[0] + (pretty ? "/pretty" : "/compact"), "tree", tree(e),
                    "numTypes", numTypes(e), "pretty", pretty);
                GsonBuilder builder = new GsonBuilder().disableHtmlEscaping();
                if (pretty) builder.setPrettyPrinting();
                record(row, "text", () -> builder.create().toJson(e));
                rows.add(row);
            }
        }
        return rows;
    }

    static void objectOps() {
        OBJ_OPS.put("add", (o, a) -> { o.add((String) a[1], (JsonElement) a[2]); return VOID; });
        OBJ_OPS.put("addNullKey", (o, a) -> { o.add(null, (JsonElement) a[2]); return VOID; });
        OBJ_OPS.put("addJavaNull", (o, a) -> { o.add((String) a[1], null); return VOID; });
        OBJ_OPS.put("addPropertyString", (o, a) -> { o.addProperty((String) a[1], (String) a[2]); return VOID; });
        OBJ_OPS.put("addPropertyBoolean", (o, a) -> { o.addProperty((String) a[1], (Boolean) a[2]); return VOID; });
        OBJ_OPS.put("addPropertyDouble", (o, a) -> { o.addProperty((String) a[1], (Double) a[2]); return VOID; });
        OBJ_OPS.put("addPropertyInt", (o, a) -> { o.addProperty((String) a[1], (Integer) a[2]); return VOID; });
        OBJ_OPS.put("remove", (o, a) -> o.remove((String) a[1])); OBJ_OPS.put("has", (o, a) -> o.has((String) a[1]));
        OBJ_OPS.put("get", (o, a) -> o.get((String) a[1])); OBJ_OPS.put("size", (o, a) -> o.size());
        OBJ_OPS.put("isEmpty", (o, a) -> o.isEmpty()); OBJ_OPS.put("keySet", (o, a) -> new ArrayList<>(o.keySet()));
        OBJ_OPS.put("deepCopy", (o, a) -> o.deepCopy());
        OBJ_OPS.put("getAsJsonObject", (o, a) -> o.getAsJsonObject((String) a[1]));
        OBJ_OPS.put("getAsJsonArray", (o, a) -> o.getAsJsonArray((String) a[1]));
        OBJ_OPS.put("getAsJsonPrimitive", (o, a) -> o.getAsJsonPrimitive((String) a[1]));
    }

    static void arrayOps() {
        ARR_OPS.put("add", (r, a) -> { r.add((JsonElement) a[2]); return VOID; });
        ARR_OPS.put("addJavaNull", (r, a) -> { r.add((JsonElement) null); return VOID; });
        ARR_OPS.put("addStringNull", (r, a) -> { r.add((String) null); return VOID; });
        ARR_OPS.put("addString", (r, a) -> { r.add((String) a[2]); return VOID; });
        ARR_OPS.put("addBoolean", (r, a) -> { r.add((Boolean) a[2]); return VOID; });
        ARR_OPS.put("addDouble", (r, a) -> { r.add((Double) a[2]); return VOID; });
        ARR_OPS.put("addInt", (r, a) -> { r.add((Integer) a[2]); return VOID; });
        ARR_OPS.put("addAll", (r, a) -> { r.addAll((JsonArray) a[2]); return VOID; });
        ARR_OPS.put("get", (r, a) -> r.get((Integer) a[1]));
        ARR_OPS.put("set", (r, a) -> r.set((Integer) a[1], (JsonElement) a[2]));
        ARR_OPS.put("remove", (r, a) -> r.remove((Integer) a[1])); ARR_OPS.put("size", (r, a) -> r.size());
        ARR_OPS.put("isEmpty", (r, a) -> r.isEmpty()); ARR_OPS.put("deepCopy", (r, a) -> r.deepCopy());
        ARR_OPS.put("elementAsObject", (r, a) -> r.get((Integer) a[1]).getAsJsonObject());
        ARR_OPS.put("elementAsArray", (r, a) -> r.get((Integer) a[1]).getAsJsonArray());
        ARR_OPS.put("elementAsString", (r, a) -> r.get((Integer) a[1]).getAsString());
        ARR_OPS.put("elementAsDouble", (r, a) -> r.get((Integer) a[1]).getAsDouble());
    }

    static <T> List<Object> execute(T target, List<Object[]> ops, Map<String, BiFunction<T, Object[], Object>> reg) {
        List<Object> results = new ArrayList<>();
        for (Object[] op : ops) {
            Map<String, Object> out = m();
            record(out, "r", () -> reg.get((String) op[0]).apply(target, op));
            results.add(out.containsKey("throws") ? m("throws", out.get("throws")) : enc(out.get("r")));
        }
        return results;
    }

    static List<Object> encodeOps(List<Object[]> ops) {
        List<Object> out = new ArrayList<>();
        for (Object[] op : ops) {
            List<Object> row = new ArrayList<>(Arrays.asList(op[0], op.length > 1 ? op[1] : null));
            if (op.length > 2) row.add(enc(op[2]));
            out.add(row);
        }
        return out;
    }

    static Object opArg(String op, String text) {
        if (op.endsWith("Int")) return Integer.valueOf(text);
        if (op.endsWith("Double")) return Double.valueOf(text);
        if (op.endsWith("Boolean")) return Boolean.valueOf(text);
        if (op.endsWith("String")) return text.equals("~") ? null : text;
        return parse(text);
    }

    /** "name [key-or-index [arg]]"; "~" is a null key; an index is read when {@code indexed}. */
    static Object[] parseOp(String text, boolean indexed) {
        String[] p = text.trim().split(" ", 3);
        Object key = p.length < 2 || p[1].equals("~") ? null : indexed ? (Object) Integer.valueOf(p[1]) : unescape(p[1]);
        if (p.length < 3) return new Object[] {p[0], key};
        return new Object[] {p[0], key, opArg(p[0], unescape(p[2]))};
    }

    static List<Object[]> parseOps(String text, boolean indexed) {
        List<Object[]> ops = new ArrayList<>();
        for (String op : text.split(" ; ")) ops.add(parseOp(op, indexed));
        return ops;
    }

    static Map<String, Object> objectRow(String[] f) {
        List<Object[]> ops = parseOps(f[1], false);
        JsonObject target = new JsonObject();
        Map<String, Object> row = m("id", f[0], "ops", encodeOps(ops), "results", execute(target, ops, OBJ_OPS));
        row.put("keys", new ArrayList<>(target.keySet()));
        row.put("tree", tree(target));
        if (f.length > 2) {
            JsonObject other = new JsonObject();
            execute(other, parseOps(f[2], false), OBJ_OPS);
            row.put("equalsTo", tree(other));
            row.put("equals", target.equals(other));
            row.put("hashCodesEqual", target.hashCode() == other.hashCode());
        }
        return row;
    }

    static Map<String, Object> arrayRow(String[] f) {
        List<Object[]> ops = parseOps(f[1], true);
        JsonArray target = new JsonArray();
        Map<String, Object> row = m("id", f[0], "ops", encodeOps(ops), "results", execute(target, ops, ARR_OPS));
        row.put("tree", tree(target));
        return row;
    }

    static List<Object> rowsOf(String section, boolean object) {
        List<Object> rows = new ArrayList<>();
        for (String[] f : fields(section)) rows.add(object ? objectRow(f) : arrayRow(f));
        return rows;
    }

    static List<Object> equalityRows() {
        List<Object> rows = new ArrayList<>();
        for (String[] f : fields("equality")) {
            JsonElement a = typed(f[1]), b = typed(f[2]);
            rows.add(m("id", f[0], "a", tree(a), "b", tree(b), "aTypes", numTypes(a), "bTypes", numTypes(b),
                "equals", a.equals(b), "hashCodesEqual", a.hashCode() == b.hashCode()));
        }
        return rows;
    }

    static boolean loneSurrogate(String s, int i) {
        char c = s.charAt(i);
        if (Character.isHighSurrogate(c)) return i + 1 >= s.length() || !Character.isLowSurrogate(s.charAt(i + 1));
        return Character.isLowSurrogate(c) && (i == 0 || !Character.isHighSurrogate(s.charAt(i - 1)));
    }

    static void appendString(StringBuilder b, String s) {
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < FIRST_PRINTABLE || c == '\u2028' || c == '\u2029' || loneSurrogate(s, i)) {
                b.append("\\u").append(String.format("%04x", (int) c));
            } else b.append(c);
        }
        b.append('"');
    }

    static void newline(StringBuilder b, int depth) {
        b.append('\n').append(" ".repeat(depth * INDENT));
    }

    @SuppressWarnings("unchecked")
    static void write(StringBuilder b, Object v, int depth) {
        if (v == null || v instanceof Boolean || v instanceof Integer) b.append(v);
        else if (v instanceof String) appendString(b, (String) v);
        else if (v instanceof Map) writeMap(b, (Map<String, Object>) v, depth);
        else writeList(b, (List<Object>) v, depth);
    }

    static void writeMap(StringBuilder b, Map<String, Object> map, int depth) {
        if (map.isEmpty()) { b.append("{}"); return; }
        b.append('{');
        boolean first = true;
        for (Map.Entry<String, Object> e : new TreeMap<>(map).entrySet()) {
            if (!first) b.append(',');
            first = false;
            newline(b, depth + 1);
            appendString(b, e.getKey());
            b.append(": ");
            write(b, e.getValue(), depth + 1);
        }
        newline(b, depth);
        b.append('}');
    }

    static void writeList(StringBuilder b, List<Object> list, int depth) {
        if (list.isEmpty()) { b.append("[]"); return; }
        b.append('[');
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) b.append(',');
            newline(b, depth + 1);
            write(b, list.get(i), depth + 1);
        }
        newline(b, depth);
        b.append(']');
    }

    public static void main(String[] args) throws IOException {
        CASES = loadCases(Path.of(args[2]));
        Map<String, Object> root = m("gsonVersion", args[1], "jdk", System.getProperty("java.version"),
            "parse", parseRows(), "primitive", primitiveRows(), "write", writeRows(),
            "objectOps", rowsOf("objectOps", true), "arrayOps", rowsOf("arrayOps", false), "equality", equalityRows());
        StringBuilder b = new StringBuilder();
        write(b, root, 0);
        b.append('\n');
        Files.createDirectories(Path.of(args[0]));
        Files.write(Path.of(args[0], "gson.json"), b.toString().getBytes(StandardCharsets.UTF_8));
    }
}
