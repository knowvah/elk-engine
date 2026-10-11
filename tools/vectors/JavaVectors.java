// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-9, AD-13) for the TypeScript
// Java-runtime shims. Spec source: the Javadoc only --
// https://docs.oracle.com/en/java/javase/21/docs/api/ for java.util.Random,
// java.util.Collections, java.lang.Math, java.lang.Double, java.lang.Integer,
// java.lang.String, java.lang.Float, java.lang.Long. This program only
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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Supplier;

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
}
