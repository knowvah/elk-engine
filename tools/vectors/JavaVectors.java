// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-9, AD-13) for the TypeScript
// Java-runtime shims. Spec source: the Javadoc only --
// https://docs.oracle.com/en/java/javase/21/docs/api/ for java.util.Random,
// java.util.Collections, java.lang.Math, java.lang.Double. This program only
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
}
