// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-9, AD-13) for the TypeScript
// Java-runtime shims. Spec source: the Javadoc only --
// https://docs.oracle.com/en/java/javase/21/docs/api/ for java.util.Random,
// java.util.Collections, java.lang.Math, java.lang.Double, java.lang.Integer,
// java.lang.String, java.lang.Float, java.lang.Long, java.util.HashMap,
// java.util.HashSet, java.util.PriorityQueue, java.lang.Comparable. This program only
// CALLS the JDK and records results; it embeds no JDK implementation.
// Encoding: double/float = 16-hex Double.doubleToRawLongBits (floats widened
// first), long = decimal string, int = JSON number.
// Run: java tools/vectors/JavaVectors.java test/golden/refs/java
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Random;
import java.util.Set;
import java.util.function.IntFunction;
import java.util.function.Supplier;
import java.util.stream.Collectors;

public class JavaVectors {
    private static final String JDK = System.getProperty("java.version");
    private static final long[] SEEDS = {0L, 1L, -1L, 42L, Long.MAX_VALUE, Long.MIN_VALUE, 0x5DEECE66DL};
    private static final String[] SCRIPT = {
        "i", "b:1", "b:2", "b:3", "L", "d", "f", "z", "g", "g", "g", "g", "b:7", "b:16",
        "b:100", "b:1073741824", "b:2147483647", "s:0", "s:1", "s:2", "s:10", "i", "d", "f",
        "z", "L", "g", "b:3", "z", "f", "d", "i"};
    private static final int[] INTS = {0, 1, -1, Integer.MIN_VALUE, Integer.MAX_VALUE, 7, -7, 3, -3};
    private static final int[] SHIFTS = {0, 1, 31, 32, 33, -1};
    private static final String[] OPS = {"add", "sub", "mul", "div", "rem", "neg", "shl", "shr", "ushr"};
    private static final double TWO31 = 2147483648.0;
    private static final double TWO53 = 9007199254740992.0;
    private static final double[] DOUBLES = {
        0.0, -0.0, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY,
        0.49999999999999994, -0.49999999999999994, 0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 1.0, -1.0,
        TWO31, -TWO31, TWO31 - 1, -(TWO31 - 1), TWO31 + 0.5, -TWO31 + 0.5, -(TWO31 + 0.5),
        TWO53, -TWO53, 9.223372036854775807E18, -9.223372036854775808E18,
        Double.MIN_VALUE, -Double.MIN_VALUE, Double.MAX_VALUE, -Double.MAX_VALUE, 1e-300, -1e-300};
    private static final float[] FLOATS = {
        0.0f, -0.0f, Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY,
        0.49999997f, 0.5f, -0.5f, 1.5f, 2.5f, -2.5f, 16777216f, 8388609f, 2147483648f,
        -2147483648f, Float.MIN_VALUE, Float.MAX_VALUE, -Float.MAX_VALUE};

    public static void main(String[] args) throws IOException {
        Path dir = Path.of(args[0]);
        Files.createDirectories(dir);
        write(dir.resolve("random.json"), randomVectors());
        write(dir.resolve("lang.json"), langVectors());
        write(dir.resolve("numeric.json"), numericVectors());
        write(dir.resolve("hash.json"), hashVectors());
        write(dir.resolve("text.json"), textVectors());
        write(dir.resolve("random-setseed.json"), setSeedVectors());
        write(dir.resolve("collections.json"), collectionsVectors());
    }

    private static void write(Path file, Object tree) throws IOException {
        StringBuilder sb = new StringBuilder();
        json(sb, tree, 0);
        sb.append('\n');
        Files.writeString(file, sb.toString(), StandardCharsets.UTF_8);
    }

    private static String hex(double d) {
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    private static List<Object> row(Object... items) {
        return new ArrayList<>(Arrays.asList(items));
    }

    // ---- random.json ----

    private static Object randomVectors() {
        List<Object> cases = new ArrayList<>();
        for (long seed : SEEDS) {
            Random rnd = new Random(seed);
            List<Object> calls = new ArrayList<>();
            for (String op : SCRIPT) {
                calls.add(call(rnd, op));
            }
            cases.add(map("seed", Long.toString(seed), "calls", calls));
        }
        return map("jdk", JDK, "cases", cases);
    }

    private static Map<String, Object> call(Random rnd, String op) {
        if (op.startsWith("b:")) {
            int bound = Integer.parseInt(op.substring(2));
            return map("method", "nextIntBound", "arg", bound, "value", rnd.nextInt(bound));
        }
        if (op.startsWith("s:")) {
            return shuffle(rnd, Integer.parseInt(op.substring(2)));
        }
        return switch (op) {
            case "i" -> map("method", "nextInt", "value", rnd.nextInt());
            case "L" -> map("method", "nextLong", "value", Long.toString(rnd.nextLong()));
            case "d" -> map("method", "nextDouble", "value", hex(rnd.nextDouble()));
            case "f" -> map("method", "nextFloat", "value", hex(rnd.nextFloat()));
            case "z" -> map("method", "nextBoolean", "value", rnd.nextBoolean());
            case "g" -> map("method", "nextGaussian", "value", hex(rnd.nextGaussian()));
            default -> throw new IllegalArgumentException(op);
        };
    }

    private static Map<String, Object> shuffle(Random rnd, int n) {
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            list.add(i);
        }
        List<Object> arg = new ArrayList<>(list);
        Collections.shuffle(list, rnd);
        return map("method", "shuffle", "arg", arg, "value", new ArrayList<Object>(list));
    }

    // ---- lang.json ----

    private static Object langVectors() {
        double[] all = withRandomDoubles();
        return map("jdk", JDK,
            "round", roundRows(all),
            "roundFloat", roundFloatRows(),
            "floorDiv", floorRows(true),
            "floorMod", floorRows(false),
            "d2i", d2iRows(all),
            "d2l", d2lRows(all),
            "i32", i32Rows(),
            "doubleCompare", compareRows());
    }

    private static double[] withRandomDoubles() {
        Random rnd = new Random(20240601L);
        double[] all = Arrays.copyOf(DOUBLES, DOUBLES.length + 20);
        for (int i = 0; i < 20; i++) {
            all[DOUBLES.length + i] = (i % 2 == 0) ? (rnd.nextDouble() - 0.5) * 1e4 : rnd.nextGaussian() * 1e10;
        }
        return all;
    }

    private static List<Object> roundRows(double[] xs) {
        List<Object> rows = new ArrayList<>();
        for (double x : xs) {
            rows.add(row(hex(x), Long.toString(Math.round(x))));
        }
        return rows;
    }

    private static List<Object> roundFloatRows() {
        List<Object> rows = new ArrayList<>();
        Random rnd = new Random(7L);
        List<Float> fs = new ArrayList<>();
        for (float f : FLOATS) {
            fs.add(f);
        }
        for (int i = 0; i < 10; i++) {
            fs.add((rnd.nextFloat() - 0.5f) * 1000f);
        }
        for (float f : fs) {
            rows.add(row(hex(f), Math.round(f)));
        }
        return rows;
    }

    private static List<Object> floorRows(boolean div) {
        List<Object> rows = new ArrayList<>();
        for (int a : INTS) {
            for (int b : INTS) {
                if (b != 0) {
                    rows.add(row(a, b, div ? Math.floorDiv(a, b) : Math.floorMod(a, b)));
                }
            }
        }
        return rows;
    }

    private static List<Object> d2iRows(double[] xs) {
        List<Object> rows = new ArrayList<>();
        for (double x : xs) {
            rows.add(row(hex(x), (int) x));
        }
        return rows;
    }

    private static List<Object> d2lRows(double[] xs) {
        List<Object> rows = new ArrayList<>();
        for (double x : xs) {
            rows.add(row(hex(x), Long.toString((long) x)));
        }
        return rows;
    }

    private static List<Object> compareRows() {
        List<Object> rows = new ArrayList<>();
        for (double a : DOUBLES) {
            for (double b : DOUBLES) {
                rows.add(row(hex(a), hex(b), Integer.signum(Double.compare(a, b))));
            }
        }
        return rows;
    }

    private static List<Object> i32Rows() {
        List<Object> rows = new ArrayList<>();
        for (String op : OPS) {
            boolean shift = op.startsWith("sh") || op.equals("ushr");
            int[] bs = shift ? SHIFTS : op.equals("neg") ? new int[] {0} : INTS;
            for (int a : INTS) {
                for (int b : bs) {
                    if (b == 0 && (op.equals("div") || op.equals("rem"))) {
                        continue;
                    }
                    rows.add(map("op", op, "a", a, "b", b, "r", apply(op, a, b)));
                }
            }
        }
        return rows;
    }

    private static int apply(String op, int a, int b) {
        return switch (op) {
            case "add" -> a + b;
            case "sub" -> a - b;
            case "mul" -> a * b;
            case "div" -> a / b;
            case "rem" -> a % b;
            case "neg" -> -a;
            case "shl" -> a << b;
            case "shr" -> a >> b;
            case "ushr" -> a >>> b;
            default -> throw new IllegalArgumentException(op);
        };
    }

    // ---- JSON writer ----

    private static boolean scalar(Object o) {
        return !(o instanceof Map) && !(o instanceof List);
    }

    private static void json(StringBuilder sb, Object o, int depth) {
        if (o instanceof Map<?, ?> m) {
            object(sb, m, depth);
        } else if (o instanceof List<?> l) {
            array(sb, l, depth);
        } else if (o instanceof String s) {
            sb.append('"').append(s).append('"');
        } else {
            sb.append(o);
        }
    }

    private static void object(StringBuilder sb, Map<?, ?> m, int depth) {
        sb.append("{\n");
        int i = 0;
        for (Map.Entry<?, ?> e : m.entrySet()) {
            sb.append("  ".repeat(depth + 1)).append('"').append(e.getKey()).append("\": ");
            json(sb, e.getValue(), depth + 1);
            sb.append(++i < m.size() ? ",\n" : "\n");
        }
        sb.append("  ".repeat(depth)).append('}');
    }

    private static void array(StringBuilder sb, List<?> l, int depth) {
        boolean inline = l.stream().allMatch(JavaVectors::scalar);
        sb.append(inline ? "[" : "[\n");
        for (int i = 0; i < l.size(); i++) {
            if (!inline) {
                sb.append("  ".repeat(depth + 1));
            }
            json(sb, l.get(i), depth + 1);
            sb.append(i + 1 < l.size() ? (inline ? ", " : ",\n") : (inline ? "" : "\n"));
        }
        sb.append(inline || l.isEmpty() ? "" : "  ".repeat(depth)).append(']');
    }

    // ---- shared helpers for numeric/hash/text/random-setseed ----

    private static final long TOSTRING_SEED = 4541515L;
    private static final long STRING_SEED = 20241011L;
    private static final int TOSTRING_RANDOM_COUNT = 6000;
    private static final int MIN_POW10 = -323;
    private static final int MAX_POW10 = 308;
    private static int zeroInt = 0;
    private static long zeroLong = 0L;

    private static String esc(String s) {
        if (s == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') {
                sb.append('\\').append(c);
            } else if (c < 0x20 || c > 0x7e) {
                sb.append(String.format("\\u%04x", (int) c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private static Object outcome(Supplier<Object> action) {
        try {
            return action.get();
        } catch (RuntimeException e) {
            return map("throws", e.getClass().getSimpleName(), "message", esc(e.getMessage()));
        }
    }

    private static String dec(long v) {
        return Long.toString(v);
    }

    // ---- numeric.json ----

    private static final long[] LONGS = {
        0L, 1L, -1L, 2L, -2L, 7L, -7L, 2147483647L, -2147483648L, 2147483648L, -2147483649L,
        4294967295L, 4294967296L, -4294967296L, 4294967297L, -4294967297L,
        9007199254740991L, 9007199254740992L, 9007199254740993L, -9007199254740993L,
        1000000000000000000L, 3037000500L, Long.MAX_VALUE, Long.MIN_VALUE,
        Long.MAX_VALUE - 1, Long.MIN_VALUE + 1};
    private static final long[] LONG_SHIFTS = {0L, 1L, 63L, 64L, 65L, -1L, 32L, 127L, -64L};
    private static final String[] I64_OPS = {"mul", "add", "sub", "div", "rem", "neg", "shl", "shr", "ushr"};
    private static final String[] F32_OPS = {"add", "sub", "mul", "div"};
    private static final float[] F32S = {
        0.0f, -0.0f, Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY,
        1.0f, -1.0f, 3.0f, 7.0f, 0.1f, 0.2f, 0.3f, 1.0f / 3.0f, 16777216f, 16777215f,
        123456.79f, 1.4e-45f, 1e-40f, Float.MIN_NORMAL, Float.MIN_VALUE, Float.MAX_VALUE,
        -Float.MAX_VALUE, 1e38f, 3e38f, 0.49999997f, 8388609f};
    private static final double[] D2F_EXTRA = {
        1e39, -1e39, 3.4028235677973366E38, 3.402823567797337E38, 3.4028234663852886E38,
        1e-46, 7.006492321624085E-46, 7.006492321624087E-46, 1.4012984643248171E-45,
        2.1019476964872256E-45, 16777217.0, 16777219.0, 16777218.0, 0.1, 1.0 / 3.0, 1e-40,
        1.1754943508222875E-38, 1.1754942807573643E-38, 1e300, -1e-300};

    private static Object numericVectors() {
        return map("jdk", JDK,
            "l2i", l2iRows(),
            "f32", f32Rows(),
            "d2f", d2fRows(),
            "log10", log10Rows(),
            "divZero", divZeroRows(),
            "i64", i64Rows());
    }

    private static List<Object> l2iRows() {
        List<Object> rows = new ArrayList<>();
        for (long l : LONGS) {
            rows.add(row(dec(l), (int) l));
        }
        for (double x : withRandomDoubles()) {
            long l = Math.round(x);
            rows.add(row(dec(l), (int) l));
        }
        return rows;
    }

    private static float applyF32(String op, float a, float b) {
        return switch (op) {
            case "add" -> a + b;
            case "sub" -> a - b;
            case "mul" -> a * b;
            case "div" -> a / b;
            default -> throw new IllegalArgumentException(op);
        };
    }

    private static List<Object> f32Rows() {
        List<Object> rows = new ArrayList<>();
        for (String op : F32_OPS) {
            for (float a : F32S) {
                for (float b : F32S) {
                    rows.add(row(op, hex(a), hex(b), hex(applyF32(op, a, b))));
                }
            }
        }
        return rows;
    }

    private static List<Object> d2fRows() {
        List<Object> rows = new ArrayList<>();
        List<Double> xs = new ArrayList<>();
        for (double x : withRandomDoubles()) {
            xs.add(x);
        }
        for (double x : D2F_EXTRA) {
            xs.add(x);
        }
        for (double x : xs) {
            rows.add(row(hex(x), hex((float) x)));
        }
        return rows;
    }

    private static List<Object> log10Rows() {
        List<Object> rows = new ArrayList<>();
        for (int n = MIN_POW10; n <= MAX_POW10; n++) {
            double x = Double.parseDouble("1e" + n);
            rows.add(row(hex(x), hex(Math.log10(x))));
        }
        for (int n = MIN_POW10; n <= MAX_POW10; n++) {
            double x = Math.pow(10, n);
            rows.add(row(hex(x), hex(Math.log10(x))));
        }
        return rows;
    }

    private static List<Object> divZeroRows() {
        List<Object> rows = new ArrayList<>();
        for (int a : new int[] {0, 1, -1, 7, Integer.MIN_VALUE}) {
            rows.add(row("int/", a, outcome(() -> a / zeroInt)));
            rows.add(row("int%", a, outcome(() -> a % zeroInt)));
            rows.add(row("floorDiv(int)", a, outcome(() -> Math.floorDiv(a, zeroInt))));
            rows.add(row("floorMod(int)", a, outcome(() -> Math.floorMod(a, zeroInt))));
        }
        for (long a : new long[] {0L, 1L, -1L, 7L, Long.MIN_VALUE}) {
            rows.add(row("long/", dec(a), outcome(() -> a / zeroLong)));
            rows.add(row("long%", dec(a), outcome(() -> a % zeroLong)));
            rows.add(row("floorDiv(long)", dec(a), outcome(() -> Math.floorDiv(a, zeroLong))));
            rows.add(row("floorMod(long)", dec(a), outcome(() -> Math.floorMod(a, zeroLong))));
        }
        return rows;
    }

    private static long applyI64(String op, long a, long b) {
        return switch (op) {
            case "mul" -> a * b;
            case "add" -> a + b;
            case "sub" -> a - b;
            case "div" -> a / b;
            case "rem" -> a % b;
            case "neg" -> -a;
            case "shl" -> a << (int) b;
            case "shr" -> a >> (int) b;
            case "ushr" -> a >>> (int) b;
            default -> throw new IllegalArgumentException(op);
        };
    }

    private static long[] i64Operands(String op) {
        if (op.startsWith("sh") || op.equals("ushr")) {
            return LONG_SHIFTS;
        }
        return op.equals("neg") ? new long[] {0L} : LONGS;
    }

    private static List<Object> i64Rows() {
        List<Object> rows = new ArrayList<>();
        for (String op : I64_OPS) {
            for (long a : LONGS) {
                for (long b : i64Operands(op)) {
                    if (b == 0 && (op.equals("div") || op.equals("rem"))) {
                        continue;
                    }
                    rows.add(row(op, dec(a), dec(b), dec(applyI64(op, a, b))));
                }
            }
        }
        return rows;
    }

    // ---- hash.json ----

    private static final long[] SPECIAL_BITS = {
        0x7ff8000000000001L, 0x7ff0000000000001L, 0xfff8000000000000L, 0x7fffffffffffffffL,
        0xffffffffffffffffL, 0x7ff8dead0000beefL, 0xfff0000000000001L, 1L, 2L,
        0x000fffffffffffffL, 0x0010000000000000L, 0x8000000000000001L, 0x800fffffffffffffL};
    private static final String[] HASH_STRINGS = {
        "", "a", "ab", "abc", "Hello, World!", "é", "日本語", "😀",
        "a😀b", "\uD800", "\uDC00", "\uDE00\uD83D", "\u0000", "￿", " ", "\t\n",
        "org.eclipse.elk.algorithm", "org.eclipse.elk.layered", "elk.direction",
        "The quick brown fox jumps over the lazy dog", "x".repeat(100), "Zz".repeat(37),
        "polygenelubricants", "Aa", "BB", "AaAa", "BBBB", "AaBB", "BBAa"};
    private static final double[] KV_DOUBLES = {
        0.0, -0.0, 1.0, -1.0, 0.5, 100.0, 1e10, Double.NaN, Double.POSITIVE_INFINITY,
        Double.MIN_VALUE, Double.MAX_VALUE, 3.14, -2.5, 42.0, 1e-300, 12345.678};

    private static Object hashVectors() {
        return map("jdk", JDK,
            "stringHash", stringHashRows(),
            "doubleHash", doubleHashRows(),
            "doubleToLongBits", doubleToLongBitsRows(),
            "integerReverse", integerReverseRows(),
            "kvectorHash", kvectorHashRows());
    }

    private static List<String> hashStrings() {
        List<String> ss = new ArrayList<>(Arrays.asList(HASH_STRINGS));
        Random rnd = new Random(STRING_SEED);
        for (int i = 0; i < 200; i++) {
            StringBuilder sb = new StringBuilder();
            int len = rnd.nextInt(41);
            for (int j = 0; j < len; j++) {
                sb.append((char) rnd.nextInt(0x10000));
            }
            ss.add(sb.toString());
        }
        return ss;
    }

    private static List<Object> stringHashRows() {
        List<Object> rows = new ArrayList<>();
        for (String s : hashStrings()) {
            rows.add(row(esc(s), s.hashCode()));
        }
        return rows;
    }

    private static List<Double> hashDoubles() {
        List<Double> ds = new ArrayList<>();
        for (double d : withRandomDoubles()) {
            ds.add(d);
        }
        for (long bits : SPECIAL_BITS) {
            ds.add(Double.longBitsToDouble(bits));
        }
        return ds;
    }

    private static List<Object> doubleHashRows() {
        List<Object> rows = new ArrayList<>();
        for (double d : hashDoubles()) {
            rows.add(row(hex(d), Double.valueOf(d).hashCode()));
        }
        return rows;
    }

    private static List<Object> doubleToLongBitsRows() {
        List<Object> rows = new ArrayList<>();
        for (double d : hashDoubles()) {
            rows.add(row(hex(d), dec(Double.doubleToLongBits(d))));
        }
        return rows;
    }

    private static List<Object> integerReverseRows() {
        List<Object> rows = new ArrayList<>();
        List<Integer> is = new ArrayList<>();
        for (int i : INTS) {
            is.add(i);
        }
        for (int i : new int[] {0x0F0F0F0F, 0x12345678, 0x80000000, 2, 256, 65536, 255}) {
            is.add(i);
        }
        Random rnd = new Random(STRING_SEED);
        for (int i = 0; i < 20; i++) {
            is.add(rnd.nextInt());
        }
        for (int i : is) {
            rows.add(row(i, Integer.reverse(i)));
        }
        return rows;
    }

    private static List<Object> kvectorHashRows() {
        List<Object> rows = new ArrayList<>();
        for (double x : KV_DOUBLES) {
            for (double y : KV_DOUBLES) {
                int h = Double.valueOf(x).hashCode() + Integer.reverse(Double.valueOf(y).hashCode());
                rows.add(row(hex(x), hex(y), h));
            }
        }
        return rows;
    }

    // ---- text.json ----

    private static final String[] PARSE_INPUTS = {
        "0", "-0", "+0", "1", "1.5", "-1.5", "+1.5", "1e10", "1E10", "1e+10", "1e-10", "  1.5  ",
        "\t1\n", "\u0000 1 \u0001", "\u001f1.0", " 1", "1 ", "1.0f", "1.0F", "1.0d", "1.0D",
        "1f", "1d", "1.0f ", "1.0f1", "0x1.8p1", "0X1P-1074", "0x1p1024", "0x1.fffffffffffffp1023",
        "0x.8p1", "0x1p1", "0x1", "0x1.8", "0x1p1f", "0x1p-1D", "-0x1p-1", "0xAp0", "0xg", "0x",
        "0x1P", "0xp1", "0x.p1", "0x1p+1", "NaN", "+NaN", "-NaN", "Infinity", "+Infinity",
        "-Infinity", "nan", "infinity", "NaNf", "Infinityd", "INF", "inf", "1e", "1e+", "1e-", "",
        " ", "1_0", ".5", "5.", ".", ".e1", "+", "-", "+-1", "--1", "1e400", "-1e400", "1e-400",
        "4.9e-324", "2.4703282292062327e-324", "2.4703282292062328e-324", "1.7976931348623157e308",
        "1.7976931348623159e308", "٣", "١٢", "１２", "1,5", "1 0", "0.1",
        "9007199254740993", "123456789012345678901234567890", "1e1000000000000", "0e99999",
        "00001.5", "1.0e", "e5", "1ee5", "1.0.0", "0.1e1d", "1.e1", "-.5", "+.5e-1"};
    private static final String[] INTEGER_INPUTS = {
        "0", "-0", "+0", "+1", "-1", "1", "2147483647", "-2147483648", "2147483648", "-2147483649",
        "1.0", " 1", "1 ", "", " ", "+", "-", "+-1", "0x10", "010", "1_0", "٣", "٣٣",
        "１２", "99999999999", "00012", "-00", "1e3", "abc", "\u0000", "2147483647 ",
        "-2147483648 ", "0000000000000000000000000000001"};

    private static Object textVectors() {
        return map("jdk", JDK,
            "toStringSeed", dec(TOSTRING_SEED),
            "toString", toStringRows(),
            "parseDouble", parseDoubleRows(),
            "integerValueOf", integerValueOfRows());
    }

    private static void addSubnormalsAndBoundaries(List<Double> ds) {
        for (double d : withRandomDoubles()) {
            ds.add(d);
        }
        for (long i = 1; i <= 40; i++) {
            ds.add(Double.longBitsToDouble(i));
            ds.add(-Double.longBitsToDouble(i));
        }
        for (long bits : SPECIAL_BITS) {
            ds.add(Double.longBitsToDouble(bits));
        }
        for (double base : new double[] {1e-3, 1e7}) {
            ds.add(Math.nextDown(Math.nextDown(base)));
            ds.add(Math.nextDown(base));
            ds.add(base);
            ds.add(Math.nextUp(base));
            ds.add(Math.nextUp(Math.nextUp(base)));
        }
        for (double d : new double[] {9.999999999999999E-4, 1.0E-4, 9999999.0, 9999999.999999998,
            10000001.0, 123456.789, 1234567.0, 12345678.9, 0.00123, 100.0, 1.0E22, 1.0E21, 2.0E-3,
            Double.MIN_VALUE, Double.MIN_NORMAL}) {
            ds.add(d);
        }
    }

    private static void addPowers(List<Double> ds) {
        for (int n = MIN_POW10; n <= MAX_POW10; n++) {
            ds.add(Double.parseDouble("1e" + n));
        }
        for (int n = -1074; n <= 1023; n++) {
            ds.add(Math.scalb(1.0, n));
        }
    }

    private static void addShortDecimals(List<Double> ds) {
        for (int k = 1; k <= 99; k++) {
            for (int e = -30; e <= 30; e++) {
                ds.add(Double.parseDouble(k + "e" + e));
            }
        }
    }

    private static void addRandomBits(List<Double> ds) {
        Random rnd = new Random(TOSTRING_SEED);
        for (int i = 0; i < TOSTRING_RANDOM_COUNT; i++) {
            ds.add(Double.longBitsToDouble(rnd.nextLong()));
        }
    }

    private static List<Object> toStringRows() {
        List<Double> ds = new ArrayList<>();
        addSubnormalsAndBoundaries(ds);
        addPowers(ds);
        addShortDecimals(ds);
        addRandomBits(ds);
        List<Object> rows = new ArrayList<>();
        for (double d : ds) {
            rows.add(row(hex(d), Double.toString(d)));
        }
        return rows;
    }

    private static List<Object> parseDoubleRows() {
        List<Object> rows = new ArrayList<>();
        for (String s : PARSE_INPUTS) {
            rows.add(row(esc(s), outcome(() -> hex(Double.parseDouble(s)))));
        }
        return rows;
    }

    private static List<Object> integerValueOfRows() {
        List<Object> rows = new ArrayList<>();
        for (String s : INTEGER_INPUTS) {
            rows.add(row(esc(s), outcome(() -> Integer.valueOf(s))));
        }
        return rows;
    }

    // ---- random-setseed.json ----

    private static final long[] SETSEED_SEEDS = {0L, 1L, -1L, 42L};
    private static final String[] SETSEED_SCRIPT = {
        "i", "b:10", "L", "d", "f", "z", "g", "setSeed:99", "g", "g", "i", "b:1000", "d",
        "setSeed:-5", "L", "f", "z", "g", "setSeed:0", "g", "i", "setSeed:9223372036854775807",
        "d", "g", "g"};

    private static Object setSeedVectors() {
        List<Object> cases = new ArrayList<>();
        for (long seed : SETSEED_SEEDS) {
            Random rnd = new Random(seed);
            List<Object> calls = new ArrayList<>();
            for (String op : SETSEED_SCRIPT) {
                calls.add(callSeed(rnd, op));
            }
            cases.add(map("seed", dec(seed), "calls", calls));
        }
        return map("jdk", JDK, "script", new ArrayList<Object>(Arrays.asList(SETSEED_SCRIPT)), "cases", cases);
    }

    private static Map<String, Object> callSeed(Random rnd, String op) {
        if (op.startsWith("setSeed:")) {
            long next = Long.parseLong(op.substring(8));
            rnd.setSeed(next);
            return map("method", "setSeed", "arg", dec(next));
        }
        return call(rnd, op);
    }

    // ---- collections.json ----
    // Records HashMap/HashSet/PriorityQueue iteration order for black-box modelling. KV and the
    // Collider classes mimic ELK's KVector hashCode/equals shape (ELK code, not JDK code).

    private static final long COLLECTIONS_SEED = 20250713L;
    private static final int[] RECORD_SIZES = {
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 24, 25, 48, 49, 96, 97,
        192, 193, 384, 385, 768, 769, 1000, 1024, 1536, 1537};
    private static final Set<Integer> RECORD_SET =
        Arrays.stream(RECORD_SIZES).boxed().collect(Collectors.toSet());
    private static final int SEQ_MAX = 1537;
    private static final int SEQ_SHORT = 1000;
    private static final int SEQ_MID = 400;
    private static final int SHRINK_KEYS = 400;
    private static final int VALUE_MOD = 10;
    private static final int LOW_MASK = 0x3FF;
    private static final int LOW_VALUE = 5;
    private static final int CAP_KEYS = 100;
    private static final int COPY_EXTRAS = 20;
    private static final int COPY_BUDGET = 1300;
    private static final int COLLIDER_KEYS = 16;
    private static final int COLLIDER_SHRINK_TO = 3;
    private static final int COLLIDER_MIX_STEPS = 60;
    private static final int RAND_SCRIPTS = 200;
    private static final int RAND_MIN_OPS = 10;
    private static final int RAND_MAX_OPS = 24;
    private static final int RAND_ORDER_BUDGET = 12;
    private static final int RAND_ADDALL_MAX = 10;
    private static final int PQ_MAX_OPS = 60;
    private static final int PQ_KEY_RANGE = 4;
    private static final int[] RAND_RANGES = {8, 20, 40, 100, 300};
    private static final int[] RAND_CAPS = {0, 1, 16, 64, 256};
    private static final int[] CTOR_CAPS = {0, 1, 2, 3, 7, 16, 17, 64, 1000, 1 << 20};
    private static final int[] SRC_SIZES = {0, 1, 12, 13, 100, 1000};
    private static final float[] LOAD_FACTORS = {0.5f, 0.75f, 1.0f, 2.0f};
    private static final String[] KINDS = {"string", "integer", "double", "kvector", "collider"};
    private static final String[][] VARIANTS = {
        {"seq", "collide", "lowbits", "mixed"}, {"seq", "neg", "stride", "large"},
        {"int", "frac", "special", "bits"}, {"grid", "frac", "special", "bits"}};
    private static final String[] HASH_SCENARIOS = {"same", "high", "groups", "rand"};
    private static final String[] COLLIDER_PATTERNS = {"fwd", "rev", "shuf", "mix"};
    private static final int[] SPECIAL_INTS = {
        Integer.MIN_VALUE, Integer.MAX_VALUE, 0, -1, Integer.MIN_VALUE + 1, Integer.MAX_VALUE - 1};
    private static final double[] SPECIAL_DOUBLES = {
        -0.0, 0.0, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.MIN_VALUE,
        -Double.MIN_VALUE, Double.MAX_VALUE, -Double.MAX_VALUE, Double.MIN_NORMAL, 1.0, -1.0};
    private static final double[] SPECIAL_KV = {
        0.0, -0.0, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY,
        Double.MIN_VALUE, 1.0, -1.0};
    private static final Map<String, List<Object>> POOLS = new HashMap<>();
    private static final Comparator<Elem> BY_KEY = Comparator.comparingInt(e -> e.key);
    private static final Elem ABSENT = new Elem(-1, 0);
    private static final Rec BY_SIZE = new Rec(true, 0);
    private static final Rec ALWAYS = new Rec(false, Integer.MAX_VALUE / 2);

    private enum Which { BOTH, MAP_ONLY, SET_ONLY }

    private record Rec(boolean bySize, int budget) { }

    private record Op(String op, Object key, List<Object> keys) { }

    private record KeySet(String kind, String cls) { }

    private record Raw(String text) {
        @Override
        public String toString() {
            return text;
        }
    }

    private record Plan(String name, KeySet keys, Init init, List<Op> ops, Rec rec, Which which) {
        Plan only(Which w) {
            return new Plan(name, keys, init, ops, rec, w);
        }
    }

    private static final class KV {
        final double x;
        final double y;

        KV(double x, double y) {
            this.x = x;
            this.y = y;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof KV k && x == k.x && y == k.y;
        }

        @Override
        public int hashCode() {
            return Double.valueOf(x).hashCode() + Integer.reverse(Double.valueOf(y).hashCode());
        }
    }

    private abstract static class Collider {
        final int id;
        final int hash;

        Collider(int id, int hash) {
            this.id = id;
            this.hash = hash;
        }

        @Override
        public boolean equals(Object o) {
            return o != null && o.getClass() == getClass() && ((Collider) o).id == id;
        }

        @Override
        public int hashCode() {
            return hash;
        }
    }

    private static final class ColliderPlain extends Collider {
        ColliderPlain(int id, int hash) {
            super(id, hash);
        }
    }

    private static final class ColliderComparable extends Collider
        implements Comparable<ColliderComparable> {
        ColliderComparable(int id, int hash) {
            super(id, hash);
        }

        @Override
        public int compareTo(ColliderComparable o) {
            return Integer.compare(id, o.id);
        }
    }

    private static final class Elem implements Comparable<Elem> {
        final int id;
        final int key;

        Elem(int id, int key) {
            this.id = id;
            this.key = key;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Elem e && e.id == id;
        }

        @Override
        public int hashCode() {
            return id;
        }

        @Override
        public int compareTo(Elem o) {
            return Integer.compare(key, o.key);
        }
    }

    // ---- encoding and compact rendering ----

    private static Object enc(Object k) {
        if (k instanceof String s) {
            return esc(s);
        }
        if (k instanceof Double d) {
            return hex(d);
        }
        if (k instanceof KV v) {
            return row(hex(v.x), hex(v.y));
        }
        if (k instanceof Collider c) {
            return map("id", c.id, "hash", c.hash);
        }
        if (k instanceof Elem e) {
            return map("id", e.id, "key", e.key);
        }
        return k;
    }

    private static List<Object> encAll(Collection<?> ks) {
        List<Object> out = new ArrayList<>();
        for (Object k : ks) {
            out.add(enc(k));
        }
        return out;
    }

    private static String inline(Object o) {
        StringBuilder sb = new StringBuilder();
        inlineTo(sb, o);
        return sb.toString();
    }

    private static void inlineTo(StringBuilder sb, Object o) {
        if (o instanceof Map<?, ?> m) {
            inlineMap(sb, m);
        } else if (o instanceof List<?> l) {
            inlineList(sb, l);
        } else if (o instanceof String s) {
            sb.append('"').append(s).append('"');
        } else {
            sb.append(o);
        }
    }

    private static void inlineMap(StringBuilder sb, Map<?, ?> m) {
        sb.append('{');
        int i = 0;
        for (Map.Entry<?, ?> e : m.entrySet()) {
            sb.append(i++ > 0 ? "," : "").append('"').append(e.getKey()).append("\":");
            inlineTo(sb, e.getValue());
        }
        sb.append('}');
    }

    private static void inlineList(StringBuilder sb, List<?> l) {
        sb.append('[');
        for (int i = 0; i < l.size(); i++) {
            sb.append(i > 0 ? "," : "");
            inlineTo(sb, l.get(i));
        }
        sb.append(']');
    }

    private static Raw raw(Object o) {
        return new Raw("\n" + inline(o));
    }

    // ---- targets and runner ----

    private static Map<String, Object> step(String op, List<Object> args, Object result) {
        return map("op", op, "args", args, "result", result);
    }

    private static Map<String, Object> bare(String op, List<Object> args) {
        return map("op", op, "args", args);
    }

    private interface Target {
        Map<String, Object> apply(Op op, int seq);

        int size();

        List<Object> order();
    }

    private static final class MapTarget implements Target {
        private final Map<Object, Integer> m;

        MapTarget(Map<Object, Integer> m) {
            this.m = m;
        }

        @Override
        public Map<String, Object> apply(Op op, int seq) {
            Object k = op.key();
            int val = seq % VALUE_MOD;
            return switch (op.op()) {
                case "add" -> step("put", row(enc(k), val), m.put(k, val));
                case "remove" -> step("remove", row(enc(k)), m.remove(k));
                case "get" -> step("get", row(enc(k)), m.get(k));
                case "has" -> step("containsKey", row(enc(k)), m.containsKey(k));
                case "clear" -> {
                    m.clear();
                    yield bare("clear", row());
                }
                case "addAll" -> putAll(op, seq);
                default -> step("size", row(), m.size());
            };
        }

        private Map<String, Object> putAll(Op op, int seq) {
            Map<Object, Integer> src = new LinkedHashMap<>();
            for (int i = 0; i < op.keys().size(); i++) {
                src.put(op.keys().get(i), (seq + i) % VALUE_MOD);
            }
            List<Object> args = new ArrayList<>();
            for (Map.Entry<Object, Integer> e : src.entrySet()) {
                args.add(row(enc(e.getKey()), e.getValue()));
            }
            m.putAll(src);
            return bare("putAll", args);
        }

        @Override
        public int size() {
            return m.size();
        }

        @Override
        public List<Object> order() {
            return encAll(m.keySet());
        }
    }

    private static final class SetTarget implements Target {
        private final Set<Object> s;

        SetTarget(Set<Object> s) {
            this.s = s;
        }

        @Override
        public Map<String, Object> apply(Op op, int seq) {
            Object k = op.key();
            return switch (op.op()) {
                case "add" -> step("add", row(enc(k)), s.add(k));
                case "remove" -> step("remove", row(enc(k)), s.remove(k));
                case "get", "has" -> step("contains", row(enc(k)), s.contains(k));
                case "clear" -> {
                    s.clear();
                    yield bare("clear", row());
                }
                case "addAll" -> step("addAll", encAll(op.keys()), s.addAll(op.keys()));
                default -> step("size", row(), s.size());
            };
        }

        @Override
        public int size() {
            return s.size();
        }

        @Override
        public List<Object> order() {
            return encAll(s);
        }
    }

    private static boolean wantOrder(Rec rec, int size, int used) {
        return rec.bySize() ? RECORD_SET.contains(size) : used + size <= rec.budget();
    }

    private static Map<String, Object> head(String name, KeySet ks, Map<String, Object> init) {
        Map<String, Object> h = map("name", name, "keyKind", ks.kind());
        if (ks.cls() != null) {
            h.put("keyClass", ks.cls());
        }
        h.put("init", new Raw(inline(init)));
        return h;
    }

    private static Map<String, Object> runTarget(Map<String, Object> head, Target t, List<Op> ops, Rec rec) {
        List<Object> steps = new ArrayList<>();
        Map<String, Object> first = t.apply(new Op("size", null, null), 0);
        first.put("order", t.order());
        steps.add(raw(first));
        int used = t.size();
        for (int i = 0; i < ops.size(); i++) {
            Map<String, Object> st = t.apply(ops.get(i), i + 1);
            if (i == ops.size() - 1 || wantOrder(rec, t.size(), used)) {
                st.put("order", t.order());
                used += t.size();
            }
            steps.add(raw(st));
        }
        head.put("steps", steps);
        return head;
    }

    private static Map<String, Object> runPlan(Plan p, boolean asMap) {
        Target t = asMap ? new MapTarget(p.init().newMap()) : new SetTarget(p.init().newSet());
        return runTarget(head(p.name(), p.keys(), p.init().desc(asMap)), t, p.ops(), p.rec());
    }

    // ---- constructors ----

    private record Init(String shape, int capacity, float lf, List<Object> source, String srcType) {
        static Init defaults() {
            return new Init("default", 0, 0f, List.of(), "");
        }

        static Init cap(int capacity) {
            return new Init("cap", capacity, 0f, List.of(), "");
        }

        static Init capLf(int capacity, float lf) {
            return new Init("caplf", capacity, lf, List.of(), "");
        }

        static Init copy(List<Object> source, String srcType) {
            return new Init("copy", 0, 0f, source, srcType);
        }

        Map<Object, Integer> sourceMap() {
            Map<Object, Integer> sm = srcType.equals("HashMap") ? new HashMap<>() : new LinkedHashMap<>();
            for (int i = 0; i < source.size(); i++) {
                sm.put(source.get(i), i % VALUE_MOD);
            }
            return sm;
        }

        Map<Object, Integer> newMap() {
            return switch (shape) {
                case "default" -> new HashMap<>();
                case "cap" -> new HashMap<>(capacity);
                case "caplf" -> new HashMap<>(capacity, lf);
                default -> new HashMap<>(sourceMap());
            };
        }

        Set<Object> newSet() {
            return switch (shape) {
                case "default" -> new HashSet<>();
                case "cap" -> new HashSet<>(capacity);
                default -> new HashSet<>(new ArrayList<>(source));
            };
        }

        Map<String, Object> desc(boolean asMap) {
            String t = asMap ? "HashMap" : "HashSet";
            return switch (shape) {
                case "default" -> map("ctor", t + "()");
                case "cap" -> map("ctor", t + "(int)", "capacity", capacity);
                case "caplf" -> map("ctor", t + "(int,float)", "capacity", capacity, "loadFactor", hex(lf));
                default -> asMap
                    ? map("ctor", "HashMap(Map)", "sourceType", srcType,
                        "sourceOrder", encAll(sourceMap().keySet()))
                    : map("ctor", "HashSet(Collection)", "sourceType", "ArrayList",
                        "sourceOrder", encAll(source));
            };
        }
    }

    // ---- key pools ----

    private static List<Object> pool(int kind, int variant) {
        String key = kind + "/" + variant;
        List<Object> p = POOLS.get(key);
        if (p == null) {
            p = buildPool(kind, variant);
            POOLS.put(key, p);
        }
        return p;
    }

    private static List<Object> buildPool(int kind, int variant) {
        if (kind == 0 && variant == 2) {
            return lowbitsStrings();
        }
        Random rnd = new Random(COLLECTIONS_SEED + 100L * kind + variant);
        IntFunction<Object> gen = switch (kind) {
            case 0 -> stringGen(variant);
            case 1 -> intGen(variant);
            case 2 -> doubleGen(variant, rnd);
            default -> kvGen(variant, rnd);
        };
        LinkedHashSet<Object> keys = new LinkedHashSet<>();
        for (int i = 0; keys.size() < SEQ_MAX; i++) {
            keys.add(gen.apply(i));
        }
        return new ArrayList<>(keys);
    }

    private static IntFunction<Object> stringGen(int variant) {
        return switch (variant) {
            case 0 -> i -> "key" + i;
            case 1 -> JavaVectors::collideString;
            default -> JavaVectors::mixedString;
        };
    }

    private static String collideString(int i) {
        StringBuilder sb = new StringBuilder();
        for (int b = 10; b >= 0; b--) {
            sb.append(((i >> b) & 1) == 0 ? "Aa" : "BB");
        }
        return sb.toString();
    }

    private static String mixedString(int i) {
        return switch (i % 6) {
            case 0 -> i == 0 ? "" : "long-" + i + "-".repeat(1 + i % 9);
            case 1 -> "café" + i + "☃";
            case 2 -> Integer.toString(i);
            case 3 -> "k".repeat(1 + i % 40) + i;
            case 4 -> "quote\"back\\slash" + i;
            default -> "😀" + i;
        };
    }

    private static List<Object> lowbitsStrings() {
        List<Object> out = new ArrayList<>();
        for (int c = 0; out.size() < SEQ_MAX; c++) {
            String s = "w" + c;
            if ((s.hashCode() & LOW_MASK) == LOW_VALUE) {
                out.add(s);
            }
        }
        return out;
    }

    private static IntFunction<Object> intGen(int variant) {
        return switch (variant) {
            case 0 -> i -> i;
            case 1 -> i -> -1 - i;
            case 2 -> i -> i << 16;
            default -> i -> i < SPECIAL_INTS.length ? SPECIAL_INTS[i] : i * 0x9E3779B1;
        };
    }

    private static double bitsDouble(Random rnd) {
        double d = Double.longBitsToDouble(rnd.nextLong());
        return Double.isNaN(d) ? Double.NaN : d;
    }

    private static double specialDouble(int i) {
        if (i < SPECIAL_DOUBLES.length) {
            return SPECIAL_DOUBLES[i];
        }
        return Double.longBitsToDouble(((i & 1) == 0 ? 0L : Long.MIN_VALUE) | (long) (i + 1));
    }

    private static IntFunction<Object> doubleGen(int variant, Random rnd) {
        return switch (variant) {
            case 0 -> i -> (double) i;
            case 1 -> i -> i * 0.1;
            case 2 -> JavaVectors::specialDouble;
            default -> i -> bitsDouble(rnd);
        };
    }

    private static KV specialKv(int i, Random rnd) {
        if (i < SPECIAL_KV.length * SPECIAL_KV.length) {
            return new KV(SPECIAL_KV[i / SPECIAL_KV.length], SPECIAL_KV[i % SPECIAL_KV.length]);
        }
        return new KV(bitsDouble(rnd), bitsDouble(rnd));
    }

    private static IntFunction<Object> kvGen(int variant, Random rnd) {
        return switch (variant) {
            case 0 -> i -> new KV(i % 40, i / 40);
            case 1 -> i -> new KV(i * 0.5, -i * 0.25);
            case 2 -> i -> specialKv(i, rnd);
            default -> i -> new KV(bitsDouble(rnd), bitsDouble(rnd));
        };
    }

    private static List<Object> shuffled(List<Object> l, long salt) {
        List<Object> copy = new ArrayList<>(l);
        Collections.shuffle(copy, new Random(COLLECTIONS_SEED + salt));
        return copy;
    }

    // ---- op builders ----

    private static Op op(String name, Object key) {
        return new Op(name, key, null);
    }

    private static List<Op> addOps(List<Object> keys) {
        List<Op> ops = new ArrayList<>();
        for (Object k : keys) {
            ops.add(op("add", k));
        }
        return ops;
    }

    private static List<Op> removeOps(List<Object> keys) {
        List<Op> ops = new ArrayList<>();
        for (Object k : keys) {
            ops.add(op("remove", k));
        }
        return ops;
    }

    private static KeySet keySet(int kind) {
        return new KeySet(KINDS[kind], null);
    }

    private static Plan plan(String name, KeySet ks, Init init, List<Op> ops, Rec rec) {
        return new Plan(name, ks, init, ops, rec, Which.BOTH);
    }

    // ---- plans ----

    private static Object collectionsVectors() {
        List<Plan> plans = new ArrayList<>();
        addSeqPlans(plans);
        addShrinkPlans(plans);
        addClearPlans(plans);
        addCapPlans(plans);
        addCapLfPlans(plans);
        addCopyPlans(plans);
        addDupPlans(plans);
        addPutAllPlans(plans);
        addColliderPlans(plans);
        addRandomPlans(plans);
        List<Object> maps = new ArrayList<>();
        List<Object> sets = new ArrayList<>();
        for (Plan p : plans) {
            if (p.which() != Which.SET_ONLY) {
                maps.add(runPlan(p, true));
            }
            if (p.which() != Which.MAP_ONLY) {
                sets.add(runPlan(p, false));
            }
        }
        return map("jdk", JDK, "seed", dec(COLLECTIONS_SEED), "hashMap", maps, "hashSet", sets,
            "priorityQueue", pqScripts());
    }

    private static void addSeqPlans(List<Plan> all) {
        for (int kind = 0; kind < 4; kind++) {
            for (int v = 0; v < 4; v++) {
                List<Object> keys = pool(kind, v).subList(0, v == 0 ? SEQ_MAX : (v == 1 ? SEQ_SHORT : SEQ_MID));
                all.add(plan("seq-" + KINDS[kind] + "-" + VARIANTS[kind][v], keySet(kind),
                    Init.defaults(), addOps(keys), BY_SIZE));
            }
        }
    }

    private static void addShrinkPlans(List<Plan> all) {
        for (int kind = 0; kind < 4; kind++) {
            List<Object> keys = pool(kind, 1).subList(0, SHRINK_KEYS);
            List<Op> ops = addOps(keys);
            ops.addAll(removeOps(shuffled(keys, kind)));
            all.add(plan("shrink-" + KINDS[kind] + "-" + VARIANTS[kind][1], keySet(kind),
                Init.defaults(), ops, BY_SIZE));
        }
    }

    private static void addClearPlans(List<Plan> all) {
        for (int kind = 0; kind < 4; kind++) {
            List<Object> keys = pool(kind, 3);
            List<Op> ops = addOps(keys.subList(0, CAP_KEYS));
            ops.add(op("clear", null));
            ops.addAll(addOps(keys.subList(0, 30)));
            ops.add(op("clear", null));
            ops.addAll(addOps(keys.subList(0, 5)));
            ops.addAll(removeOps(List.of(keys.get(1), keys.get(3))));
            ops.addAll(addOps(keys.subList(5, 9)));
            all.add(plan("clear-reuse-" + KINDS[kind], keySet(kind), Init.defaults(), ops, BY_SIZE));
        }
    }

    private static void addCapPlans(List<Plan> all) {
        for (int kind : new int[] {0, 1, 3}) {
            for (int cap : CTOR_CAPS) {
                List<Object> keys = pool(kind, 3).subList(0, CAP_KEYS);
                all.add(plan("ctor-cap-" + KINDS[kind] + "-" + cap, keySet(kind), Init.cap(cap),
                    addOps(keys), BY_SIZE));
            }
        }
    }

    private static void addCapLfPlans(List<Plan> all) {
        for (int kind = 0; kind < 2; kind++) {
            for (int cap : new int[] {0, 16, 64}) {
                for (float lf : LOAD_FACTORS) {
                    List<Object> keys = pool(kind, 3).subList(0, CAP_KEYS);
                    all.add(plan("ctor-caplf-" + KINDS[kind] + "-" + cap + "-" + lf, keySet(kind),
                        Init.capLf(cap, lf), addOps(keys), BY_SIZE).only(Which.MAP_ONLY));
                }
            }
        }
    }

    private static void addCopyPlans(List<Plan> all) {
        for (int kind : new int[] {0, 1, 3}) {
            for (int size : SRC_SIZES) {
                List<Object> base = pool(kind, 3);
                List<Object> src = shuffled(base.subList(0, size), 31L * kind + size);
                List<Op> extras = addOps(base.subList(size, size + COPY_EXTRAS));
                String stem = "ctor-copy-" + KINDS[kind] + "-" + size;
                all.add(plan(stem + "-hashsrc", keySet(kind), Init.copy(src, "HashMap"), extras,
                    new Rec(false, COPY_BUDGET)).only(Which.MAP_ONLY));
                all.add(plan(stem + "-ordered", keySet(kind), Init.copy(src, "LinkedHashMap"), extras,
                    new Rec(false, COPY_BUDGET)));
            }
        }
    }

    private static void addDupPlans(List<Plan> all) {
        int[][] shapes = {{13, 1}, {26, 13}, {100, 25}, {1000, 10}};
        for (int kind = 0; kind < 2; kind++) {
            for (int[] sh : shapes) {
                List<Object> base = pool(kind, 3);
                List<Object> src = new ArrayList<>();
                for (int i = 0; i < sh[0]; i++) {
                    src.add(base.get(i % sh[1]));
                }
                List<Op> extras = addOps(base.subList(sh[1], sh[1] + COPY_EXTRAS));
                all.add(plan("ctor-collection-dups-" + KINDS[kind] + "-" + sh[0] + "-" + sh[1],
                    keySet(kind), Init.copy(src, "ArrayList"), extras,
                    new Rec(false, COPY_BUDGET)).only(Which.SET_ONLY));
            }
        }
    }

    private static void addPutAllPlans(List<Plan> all) {
        for (int kind = 0; kind < 2; kind++) {
            for (int size : SRC_SIZES) {
                List<Object> base = pool(kind, 3);
                List<Object> src = shuffled(base.subList(0, size), 17L * kind + size);
                List<Op> extras = addOps(base.subList(size, size + COPY_EXTRAS));
                List<Op> empty = new ArrayList<>(List.of(new Op("addAll", null, src)));
                empty.addAll(extras);
                String stem = KINDS[kind] + "-" + size;
                all.add(plan("putall-empty-" + stem, keySet(kind), Init.defaults(), empty,
                    new Rec(false, COPY_BUDGET)));
                List<Op> nonEmpty = addOps(base.subList(1200, 1205));
                nonEmpty.add(new Op("addAll", null, src));
                nonEmpty.addAll(extras);
                all.add(plan("putall-nonempty-" + stem, keySet(kind), Init.defaults(), nonEmpty,
                    new Rec(false, COPY_BUDGET)));
            }
        }
    }

    // ---- colliders ----

    private static int colliderHash(String scenario, int id, Random rnd) {
        return switch (scenario) {
            case "same" -> 0x2468;
            case "high" -> 0x1234 + (id << 16);
            case "groups" -> 0xABC0 + ((id % 3) << 16);
            default -> rnd.nextInt();
        };
    }

    private static List<Object> colliders(boolean comparable, String scenario, int n, Random rnd) {
        List<Object> out = new ArrayList<>();
        for (int id = 0; id < n; id++) {
            int h = colliderHash(scenario, id, rnd);
            out.add(comparable ? new ColliderComparable(id, h) : new ColliderPlain(id, h));
        }
        return out;
    }

    private static List<Op> mixOps(List<Object> ks, Random rnd) {
        List<Op> ops = new ArrayList<>();
        boolean[] in = new boolean[ks.size()];
        for (int i = 0; i < COLLIDER_MIX_STEPS; i++) {
            int j = rnd.nextInt(ks.size());
            ops.add(op(in[j] ? "remove" : "add", ks.get(j)));
            in[j] = !in[j];
        }
        for (int j = 0; j < in.length; j++) {
            ops.add(op(in[j] ? "remove" : "add", ks.get(j)));
            ops.add(op("add", ks.get(j)));
        }
        ops.addAll(removeOps(ks.subList(0, ks.size() - COLLIDER_SHRINK_TO)));
        return ops;
    }

    private static List<Op> colliderOps(String pattern, List<Object> ks, Random rnd) {
        int keep = ks.size() - COLLIDER_SHRINK_TO;
        if (pattern.equals("mix")) {
            return mixOps(ks, rnd);
        }
        List<Op> ops = addOps(ks);
        if (pattern.equals("rev")) {
            List<Object> rev = new ArrayList<>(ks);
            Collections.reverse(rev);
            ops.addAll(removeOps(rev.subList(0, keep)));
        } else if (pattern.equals("shuf")) {
            ops.addAll(removeOps(shuffled(ks, ks.size()).subList(0, keep)));
        } else {
            ops.addAll(removeOps(ks.subList(0, keep)));
        }
        return ops;
    }

    private static void addColliderPlan(List<Plan> all, boolean comparable, String sc, String pat, int cap) {
        Random rnd = new Random(COLLECTIONS_SEED + sc.hashCode() + pat.hashCode());
        List<Object> ks = colliders(comparable, sc, COLLIDER_KEYS, rnd);
        String cls = comparable ? "ColliderComparable" : "ColliderPlain";
        Init init = cap < 0 ? Init.defaults() : Init.cap(cap);
        String name = "collider-" + cls + "-" + sc + "-" + pat + "-cap" + (cap < 0 ? "def" : cap);
        all.add(plan(name, new KeySet("collider", cls), init, colliderOps(pat, ks, rnd), ALWAYS));
    }

    private static void addColliderPlans(List<Plan> all) {
        for (boolean comparable : new boolean[] {true, false}) {
            for (String sc : HASH_SCENARIOS) {
                for (String pat : COLLIDER_PATTERNS) {
                    addColliderPlan(all, comparable, sc, pat, 64);
                    addColliderPlan(all, comparable, sc, pat, -1);
                }
            }
            addColliderPlan(all, comparable, "same", "shuf", 1024);
            addColliderPlan(all, comparable, "high", "fwd", 128);
        }
    }

    // ---- random scripts ----

    private static List<Object> randomPool(int kind, int i, int range, Random rnd) {
        if (kind < 4) {
            return pool(kind, rnd.nextInt(VARIANTS[kind].length)).subList(0, range);
        }
        return colliders(i % 2 == 0, HASH_SCENARIOS[rnd.nextInt(HASH_SCENARIOS.length)], range, rnd);
    }

    private static Op randomOp(List<Object> pool, Random rnd) {
        int roll = rnd.nextInt(100);
        Object key = pool.get(rnd.nextInt(pool.size()));
        if (roll < 35) {
            return op("add", key);
        } else if (roll < 55) {
            return op("remove", key);
        } else if (roll < 70) {
            return op("get", key);
        } else if (roll < 80) {
            return op("has", key);
        } else if (roll < 82) {
            return op("clear", null);
        } else if (roll < 92) {
            List<Object> ks = new ArrayList<>();
            for (int n = 1 + rnd.nextInt(RAND_ADDALL_MAX); n > 0; n--) {
                ks.add(pool.get(rnd.nextInt(pool.size())));
            }
            return new Op("addAll", null, ks);
        }
        return roll < 96 ? op("size", null) : op("add", key);
    }

    private static void addRandomPlans(List<Plan> all) {
        for (int kind = 0; kind < KINDS.length; kind++) {
            Random rnd = new Random(COLLECTIONS_SEED);
            for (int i = 0; i < RAND_SCRIPTS; i++) {
                int range = RAND_RANGES[rnd.nextInt(RAND_RANGES.length)];
                List<Object> pool = randomPool(kind, i, range, rnd);
                Init init = rnd.nextBoolean() ? Init.defaults() : Init.cap(RAND_CAPS[rnd.nextInt(RAND_CAPS.length)]);
                List<Op> ops = new ArrayList<>();
                int len = RAND_MIN_OPS + rnd.nextInt(RAND_MAX_OPS - RAND_MIN_OPS + 1);
                for (int n = 0; n < len; n++) {
                    ops.add(randomOp(pool, rnd));
                }
                String cls = kind < 4 ? null : (i % 2 == 0 ? "ColliderComparable" : "ColliderPlain");
                all.add(plan("rand-" + KINDS[kind] + "-" + i, new KeySet(KINDS[kind], cls), init, ops,
                    new Rec(false, RAND_ORDER_BUDGET)));
            }
        }
    }

    // ---- priority queue ----

    private record PqInit(String shape, int capacity, List<Object> source) {
        PriorityQueue<Elem> newQueue() {
            return switch (shape) {
                case "cmp" -> new PriorityQueue<>(BY_KEY);
                case "capcmp" -> new PriorityQueue<>(capacity, BY_KEY);
                default -> {
                    List<Elem> src = new ArrayList<>();
                    for (Object o : source) {
                        src.add((Elem) o);
                    }
                    yield new PriorityQueue<>(src);
                }
            };
        }

        Map<String, Object> desc() {
            return switch (shape) {
                case "cmp" -> map("ctor", "PriorityQueue(Comparator)", "comparator", "byKey");
                case "capcmp" -> map("ctor", "PriorityQueue(int,Comparator)", "capacity", capacity,
                    "comparator", "byKey");
                default -> map("ctor", "PriorityQueue(Collection)", "sourceType", "ArrayList",
                    "ordering", "natural", "sourceOrder", encAll(source));
            };
        }
    }

    private static final class PqTarget implements Target {
        private final PriorityQueue<Elem> q;

        PqTarget(PriorityQueue<Elem> q) {
            this.q = q;
        }

        @Override
        public Map<String, Object> apply(Op op, int seq) {
            return switch (op.op()) {
                case "add" -> step("add", row(enc(op.key())), q.add((Elem) op.key()));
                case "offer" -> step("offer", row(enc(op.key())), q.offer((Elem) op.key()));
                case "addAll" -> addAll(op);
                case "poll" -> step("poll", row(), enc(q.poll()));
                case "peek" -> step("peek", row(), enc(q.peek()));
                default -> applyOther(op);
            };
        }

        @SuppressWarnings("unchecked")
        private Map<String, Object> addAll(Op op) {
            List<Elem> es = new ArrayList<>();
            for (Object o : op.keys()) {
                es.add((Elem) o);
            }
            return step("addAll", encAll(es), q.addAll(es));
        }

        private Map<String, Object> applyOther(Op op) {
            return switch (op.op()) {
                case "removeAt" -> {
                    Elem e = target((Integer) op.key());
                    yield step("remove", row(enc(e)), q.remove(e));
                }
                case "isEmpty" -> step("isEmpty", row(), q.isEmpty());
                case "clear" -> {
                    q.clear();
                    yield bare("clear", row());
                }
                default -> step("size", row(), q.size());
            };
        }

        private Elem target(int idx) {
            Object[] a = q.toArray();
            if (a.length == 0) {
                return ABSENT;
            }
            return (Elem) a[idx < 0 ? a.length - 1 : idx % a.length];
        }

        @Override
        public int size() {
            return q.size();
        }

        @Override
        public List<Object> order() {
            return encAll(Arrays.asList(q.toArray()));
        }
    }

    private static Elem newElem(Random rnd, int[] ids) {
        return new Elem(ids[0]++, rnd.nextInt(PQ_KEY_RANGE));
    }

    private static List<Object> newElems(int n, Random rnd, int[] ids) {
        List<Object> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            out.add(newElem(rnd, ids));
        }
        return out;
    }

    private static Op removeAt(int idx) {
        return new Op("removeAt", idx, null);
    }

    private static List<Op> pqTieOps(Random rnd, int[] ids) {
        List<Op> ops = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            ops.add(op(i % 2 == 0 ? "add" : "offer", newElem(rnd, ids)));
        }
        for (int idx : new int[] {10, -1, 1, 5, -1, 0}) {
            ops.add(removeAt(idx));
        }
        for (int i = 0; i < 6; i++) {
            ops.add(op("poll", null));
        }
        ops.addAll(pqTieOpsLate(rnd, ids));
        return ops;
    }

    private static List<Op> pqTieOpsLate(Random rnd, int[] ids) {
        List<Op> ops = new ArrayList<>();
        for (Object e : newElems(5, rnd, ids)) {
            ops.add(op("add", e));
        }
        ops.add(new Op("addAll", null, newElems(12, rnd, ids)));
        for (int idx : new int[] {7, 3, -1, 2}) {
            ops.add(removeAt(idx));
        }
        for (String name : new String[] {"peek", "size", "isEmpty"}) {
            ops.add(op(name, null));
        }
        for (int i = 0; i < 25; i++) {
            ops.add(op("poll", null));
        }
        for (String name : new String[] {"poll", "peek", "isEmpty", "size"}) {
            ops.add(op(name, null));
        }
        ops.add(op("add", newElem(rnd, ids)));
        ops.add(op("clear", null));
        return ops;
    }

    private static Map<String, Object> pqScript(String name, PqInit init, List<Op> ops) {
        Map<String, Object> head = head(name, new KeySet("element", null), init.desc());
        return runTarget(head, new PqTarget(init.newQueue()), ops, ALWAYS);
    }

    private static PqInit pqInit(int shape, Random rnd, int[] ids) {
        return switch (shape) {
            case 0 -> new PqInit("cmp", 0, List.of());
            case 1 -> new PqInit("capcmp", 1, List.of());
            case 2 -> new PqInit("capcmp", 50, List.of());
            default -> new PqInit("coll", 0, newElems(13, rnd, ids));
        };
    }

    private static void addPqTieScripts(List<Object> out) {
        String[] shapes = {"cmp", "cap1", "cap50", "coll13"};
        for (int shape = 0; shape < shapes.length; shape++) {
            for (int seed = 0; seed < 6; seed++) {
                Random rnd = new Random(COLLECTIONS_SEED + 7000 + seed * 10L + shape);
                int[] ids = {0};
                PqInit init = pqInit(shape, rnd, ids);
                out.add(pqScript("pq-tie-" + shapes[shape] + "-" + seed, init, pqTieOps(rnd, ids)));
            }
        }
    }

    private static void addPqCollectionScripts(List<Object> out) {
        for (int size : new int[] {0, 1, 2, 5, 13, 50, 200}) {
            Random rnd = new Random(COLLECTIONS_SEED + 8000 + size);
            int[] ids = {0};
            PqInit init = new PqInit("coll", 0, newElems(size, rnd, ids));
            List<Op> ops = new ArrayList<>(List.of(op("peek", null), op("size", null)));
            for (int i = 0; i < 12; i++) {
                ops.add(op("poll", null));
            }
            for (int idx : new int[] {-1, 3, 0}) {
                ops.add(removeAt(idx));
            }
            for (Object e : newElems(4, rnd, ids)) {
                ops.add(op("add", e));
            }
            out.add(pqScript("pq-collection-" + size, init, ops));
        }
    }

    private static Op pqRandomOp(Random rnd, int[] ids) {
        int roll = rnd.nextInt(100);
        if (roll < 25) {
            return op("add", newElem(rnd, ids));
        } else if (roll < 35) {
            return op("offer", newElem(rnd, ids));
        } else if (roll < 43) {
            return new Op("addAll", null, newElems(2 + rnd.nextInt(5), rnd, ids));
        } else if (roll < 63) {
            return op("poll", null);
        } else if (roll < 68) {
            return op("peek", null);
        } else if (roll < 83) {
            return removeAt(rnd.nextInt(4) == 0 ? -1 : rnd.nextInt(10));
        }
        return pqRandomMisc(roll);
    }

    private static Op pqRandomMisc(int roll) {
        if (roll < 87) {
            return op("size", null);
        }
        return op(roll < 90 ? "isEmpty" : "clear", null);
    }

    private static void addPqRandomScripts(List<Object> out) {
        Random rnd = new Random(COLLECTIONS_SEED);
        for (int i = 0; i < RAND_SCRIPTS; i++) {
            int[] ids = {0};
            PqInit init = pqInit(rnd.nextInt(4), rnd, ids);
            List<Op> ops = new ArrayList<>();
            int len = RAND_MIN_OPS + rnd.nextInt(PQ_MAX_OPS - RAND_MIN_OPS + 1);
            for (int n = 0; n < len; n++) {
                ops.add(pqRandomOp(rnd, ids));
            }
            out.add(pqScript("rand-pq-" + i, init, ops));
        }
    }

    private static List<Object> pqScripts() {
        List<Object> out = new ArrayList<>();
        addPqTieScripts(out);
        addPqCollectionScripts(out);
        addPqRandomScripts(out);
        return out;
    }
}
