// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, AD-9, decision D10 of plans/graphviz-dot/decisions.md) for the pure-JDK
// text conversions that the transforms of org.eclipse.elk.alg.graphviz.dot perform (transform/DotExporter.java,
// transform/DotImporter.java, transform/Attributes.java). This program only CALLS JDK APIs and records results; it embeds
// no JDK or ELK implementation. The TS shims are written from the Javadoc and proven against these rows (never from
// OpenJDK source, AD-9).
// Run: tools/vectors/dot-vectors.sh <outDir>   (java -cp ... DotJdkVectors.java <outDir> <tools/vectors dir>)
// The file carries no `oracle` stamp and this program never reads the pin (D7, issue #173: the landed fitness test
// test/architecture/elk-pin.fitness.test.ts freezes the number of recorders that stamp it). The script still refuses
// to run unless the oracle was built from tools/oracle/ELK_COMMIT.
//
// CALL SITES (grep of the pinned sources) and what proves each:
//   java.util.StringTokenizer, two-argument constructor only (returnDelims never passed), members hasMoreTokens() and
//     nextToken() only (countTokens, nextToken(String), hasMoreElements, nextElement are not called):
//       DotExporter:652  new StringTokenizer(bb, ATTRIBUTE_DELIM), then nextToken() four times (no hasMoreTokens)
//       DotExporter:736/739  new StringTokenizer(width|height, ATTRIBUTE_DELIM), then one nextToken()
//       DotExporter:947  new StringTokenizer(pos, "\";") in a hasMoreTokens()/nextToken() loop
//       DotExporter:950  new StringTokenizer(<token of :947>, " \t") in a hasMoreTokens()/nextToken() loop
//     ATTRIBUTE_DELIM = "\", \t\n\r" (DotExporter:103).                                        -> family tokenizer
//   Float.parseFloat (DotImporter:206, 302, 353, 355) and Float.valueOf(String) (DotImporter:250, 253, 270)
//                                                                                             -> family parseFloat
//   String.trim (DotImporter.trimValue:695, before every importer parse)                      -> family trim
//   Boolean.valueOf(String) (DotImporter:256, 262)                                            -> family booleanValueOf
//   "\"" + float + "\"" (DotExporter.createAttribute(String, float):439; the layouter's LayoutDotExporter passes floats)
//     = Float.toString                                                                        -> family floatToString
//   Already proven elsewhere, not recorded again: Double.parseDouble / Double.valueOf (text.json parseDouble),
//   Double.toString and StringBuilder.append(double) (text.json toString), Integer.parseInt (text.json integerValueOf:
//   parseInt and valueOf share one grammar), "\"" + int + "\"" (Integer.toString of an int32), (float) of a double
//   (numeric.json d2f), (int) of a float (lang.json d2i: a float widens to double exactly), float * DPI (numeric.json
//   f32 mul), KVector.parse (ELK code, ported with its own refs).
//
// FILE: 2-space top level, one compact JSON row per line, trailing newline:
//   { jdk, arch, classOnlyMessages, rowCounts: { <family>: n }, rows: [row...] }   (rows grouped by family, in the
//   order below; ids unique). jdk = java.version, arch = os.arch. classOnlyMessages = the families whose exception
//   messages are JDK-version text: the TS side compares the exception class only, the msg is recorded for reference.
//   An exception is { cls, msg }: cls = binary class name, msg = getMessage().
// ROWS:
//   tokenizer      { id: "tokenizer/<set>/<nnn>", family, set, delims, input,
//                    loop:     [token...]   tokens of while (hasMoreTokens()) nextToken() (hasMoreTokens is asked twice
//                                           before each nextToken; a disagreement fails the recording),
//                    after:    { hasMoreTokens: false, nextToken: exception }   the exhausted tokenizer,
//                    nextOnly: [token | { thrown: exception }...]   NEXT_ONLY_CALLS nextToken() calls on a fresh
//                                           tokenizer without hasMoreTokens (the DotExporter:652 protocol) }
//                    sets: attribute = ATTRIBUTE_DELIM, splines = "\";", points = " \t".
//   parseFloat     { id: "parseFloat/<nnn>", family, input, parseFloat: bits | { thrown }, valueOf: bits | { thrown },
//                    viaDouble: bits | { thrown } }   bits = 8 lowercase hex digits of Float.floatToRawIntBits;
//                    viaDouble = (float) Double.parseDouble(input), recorded to show where a double-rounding
//                    implementation differs (it is not a call site). Inputs: the fixed list INPUTS, then MIDPOINT rows
//                    (for each float of MIDPOINT_FLOATS: the exact decimal of the midpoint between it and the next float
//                    up, and that decimal plus and minus one unit in its 60th fractional digit).
//   floatToString  { id: "floatToString/<nnn>", family, bits, text }   Float.toString(Float.intBitsToFloat(bits)) for the
//                    fixed list, then RANDOM_BITS raw bit patterns and RANDOM_VALUES values nextFloat() * 1000 of
//                    new java.util.Random(RANDOM_SEED).
//   trim           { id: "trim/<nnn>", family, input, output }   String.trim.
//   booleanValueOf { id: "booleanValueOf/<nnn>", family, input, output }   Boolean.valueOf(String) (null input = Java
//                    null, written as JSON null).
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;

public class DotJdkVectors {
    private static final String OUT = "graphviz-dot-jdk.json";
    private static final String ID = "id", FAMILY = "family", INPUT = "input", OUTPUT = "output";
    private static final String F_TOKENIZER = "tokenizer", F_PARSE_FLOAT = "parseFloat", F_FLOAT_TO_STRING = "floatToString";
    private static final String F_TRIM = "trim", F_BOOLEAN = "booleanValueOf";
    private static final int NEXT_ONLY_CALLS = 5;
    private static final long RANDOM_SEED = 4242L;
    private static final int RANDOM_BITS = 150, RANDOM_VALUES = 100;
    private static final int MIDPOINT_DIGIT = 60;

    /** Delimiter sets, in the order recorded: name, delimiters (DotExporter:103, :947, :950). */
    private static final String[][] SETS = {
        {"attribute", "\", \t\n\r"},
        {"splines", "\";"},
        {"points", " \t"},
    };

    /** Inputs recorded under every delimiter set. */
    private static final String[] COMMON_TOKENIZER_INPUTS = {
        "", " ", "  ", "\t", "\"", "\"\"", ";", ";;", ",", ",,", "a", "abc", "1.5",
        " a", "a ", " a ", "\ta\t", "a b", "a  b", "a\tb", "a \t b", "a,b", "a,,b", ",a", "a,", ",a,",
        "a;b", "a;;b", ";a", "a;", ";a;", "\"a\"", "\"a b\"", "\"\"a\"\"", "a\"b", "a\nb", "a\rb", "a\r\nb",
        "\n", "\r\n", "x y,z;w\"v", "café naïve", "é,è", "😀 😁",
        "😀,😁", " a ", "a b", "\u0000a\u0000", "a\u000bb", "a\fb",
    };

    /** Inputs of the shapes each call site sees, recorded under the named set only. */
    private static final Map<String, String[]> SITE_INPUTS = Map.of(
        "attribute", new String[] {
            "\"0,0,62,116\"", "0,0,62,116", "\"0,0,62.5,116.25\"", "\"-1.5,2,3e2,4\"", "\"0,0,62\"", "\"0,0\"",
            "\"0, 0, 62, 116\"", "\" 0,0,62,116 \"", "\"0,,0,,62,,116\"", "\"0.5\"", "0.5", "\"0.75\" extra",
            "\"1\n2\r3\t4\"", "\"0,0,62,116,99\"",
        },
        "splines", new String[] {
            "\"e,52,36.1 52,72 52,64 52,55 52,46\"", "\"s,10,10 e,52,36 10,10 20,20 30,30 40,40\"",
            "\"1,2 3,4 5,6 7,8;9,10 11,12 13,14 15,16\"", "\"1,2 3,4;\"", "\";1,2\"", "\"1,2;;3,4\"",
            "1,2 3,4", "\"\"", "\";\"", "\"1,2\" \"3,4\"",
        },
        "points", new String[] {
            "e,52,36.1 52,72 52,64 52,55 52,46", "s,10,10 e,52,36 10,10 20,20", "1,2  3,4", "1,2\t3,4",
            " 1,2 3,4 ", "1,2", "e,1,2", "s,1,2", "e", "s,", "e,", "1,2\n3,4", "1,2,3 4",
        });

    private static final String[] FLOAT_INPUTS = {
        "0", "-0", "+0", "0.0", "-0.0", "1", "-1", "+1", "1.5", "-1.5", "72", "72.0", "0.5", "0.75", "0.5000",
        "1.38889", "0.013888889", "2.4166667", "14.0", "100", "0.1", "0.2", "0.3", "1.1", "2.675", "123456.789",
        "3.0000001", "16777216", "16777217", "16777218", "16777219", "33554435", "16777217.0000001", "1e10", "1E10",
        "1e+10", "1e-10", "1e38", "1e39", "-1e39", "3.4e38", "3.4028234e38", "3.4028235e38", "3.40282356e38",
        "3.4028235677973362e38", "3.4028235677973366e38", "3.402823567797337e38", "3.4028236e38", "1.17549435e-38",
        "1.1754942e-38", "1.17549421e-38", "1.4e-45", "1.401298464324817e-45", "7.006492321624085e-46",
        "7.006492321624086e-46", "1e-45", "7e-46", "1e-50", "4.9e-324", "1e-7", "6.0e-8", "5.9604645e-8",
        "2.98023223876953125e-8", "0.000001", "7.038531e-26", "1.00000017881393432617187499",
        "1.00000017881393432617187501", "1.000000178813934326171875",
        "0.1000000000000000055511151231257827021181583404541015625", "1.0000001", "0.99999994", "1.9999999",
        "NaN", "+NaN", "-NaN", "Infinity", "+Infinity", "-Infinity", "nan", "inf", "INF", "infinity",
        "  1.5  ", "\t72\n", "\u0000 1 \u001f", "1.5f", "1.5F", "1.5d", "1.5D", "1f", "1.0f1", "0x1p-149",
        "0x1.fffffep127", "0x1.ffffffp127", "0x1.000001p0", "0x1.0000018p0", "0X1P0F", "0x1", "", " ", "abc",
        "1,5", "1.0.0", "--1", "+-1", "-", "+", ".", ".5", "5.", "-.5", "+.5e-1", "1.e1", "1e", "1e+", "1.0e", "e5",
        "1_0", "٣", "１２", "1 0", " 1", "1 ", "00001.5", "123456789012345678901234567890",
        "1e1000000000000", "0e99999", "\"1.5\"", "1.5\"", "0,5", "true",
    };

    private static final float[] MIDPOINT_FLOATS = {
        1.0f, 1.0000001f, 1.5f, 72.0f, 0.1f, 0.013888889f, 100.0f, 16777216.0f, 3.0e-39f, Float.MIN_VALUE,
        Float.MAX_VALUE / 2, 1.17549435e-38f,
    };

    private static final int[] FLOAT_BITS = {
        0x00000000, 0x80000000, 0x3f800000, 0xbf800000, 0x3fc00000, 0x3dcccccd, 0x42900000, 0x3c638e39, 0x3fb1c71c,
        0x4b7fffff, 0x4b800000, 0x4b800001, 0x4b189680, 0x4b18967f, 0x3a83126f, 0x3a83126e, 0x3a831270, 0x00000001,
        0x00800000, 0x007fffff, 0x7f7fffff, 0x7fc00000, 0x7f800000, 0xff800000, 0x7f800001, 0xffc00001, 0x3f800001,
        0x3f7fffff, 0x40490fdb, 0x447a0000, 0x461c4000, 0x47c35000, 0x49742400, 0x4e6e6b28, 0x5368d4a5, 0x3089705f,
        0x2edbe6ff, 0x1e3ce508, 0x501502f9, 0x42c80000, 0x3e99999a, 0x3f19999a, 0x3f4ccccd, 0x41200000, 0x40400000,
        0x3eaaaaab, 0x3f2aaaab, 0x4479ffff, 0x358637bd, 0x358637be, 0x3727c5ac, 0x38d1b717, 0x3b03126f, 0x3c23d70a,
    };

    private static final String[] TRIM_INPUTS = {
        "", " ", "a", " a", "a ", " a ", "\ta\t", "\na\r\n", " a b ", "\u0000a\u0000", "\u001fa\u001f", " a",
        "!a!", " a ", " a ", "　a　", "﻿a﻿", "\u007fa\u007f",
        "\u0085a\u0085", "\u000ba\u000c", "  ", "\t\n\r", "\"a\"", " \"a\" ",
    };

    private static final String[] BOOLEAN_INPUTS = {
        null, "", "true", "TRUE", "True", "tRuE", "false", "FALSE", "yes", "1", "0", " true", "true ", "\"true\"",
        "t", "truee", "İrue", "truı", "TRUE\u0000",
    };

    private static final Set<String> CLASS_ONLY = new LinkedHashSet<>(List.of(F_TOKENIZER, F_PARSE_FLOAT));

    public static void main(String[] args) throws IOException {
        Map<String, List<Map<String, Object>>> families = new LinkedHashMap<>();
        families.put(F_TOKENIZER, tokenizerRows());
        families.put(F_PARSE_FLOAT, parseFloatRows());
        families.put(F_FLOAT_TO_STRING, floatToStringRows());
        families.put(F_TRIM, simpleRows(F_TRIM, TRIM_INPUTS, String::trim));
        families.put(F_BOOLEAN, simpleRows(F_BOOLEAN, BOOLEAN_INPUTS, s -> String.valueOf(Boolean.valueOf(s))));
        write(Path.of(args[0], OUT), families);
    }

    // ---- tokenizer ----
    private static List<Map<String, Object>> tokenizerRows() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String[] set : SETS) {
            List<String> inputs = new ArrayList<>(List.of(COMMON_TOKENIZER_INPUTS));
            inputs.addAll(List.of(SITE_INPUTS.get(set[0])));
            int n = 0;
            for (String input : inputs) {
                Map<String, Object> row = row(F_TOKENIZER + "/" + set[0] + "/" + three(++n), F_TOKENIZER);
                row.put("set", set[0]);
                row.put("delims", set[1]);
                row.put(INPUT, input);
                tokenize(row, input, set[1]);
                rows.add(row);
            }
        }
        return rows;
    }

    private static void tokenize(Map<String, Object> row, String input, String delims) {
        StringTokenizer loop = new StringTokenizer(input, delims);
        List<Object> tokens = new ArrayList<>();
        while (loop.hasMoreTokens()) {
            if (!loop.hasMoreTokens()) {
                throw new IllegalStateException("hasMoreTokens is not idempotent on " + input);
            }
            tokens.add(loop.nextToken());
        }
        row.put("loop", tokens);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("hasMoreTokens", loop.hasMoreTokens());
        after.put("nextToken", call(loop::nextToken));
        row.put("after", after);
        StringTokenizer fresh = new StringTokenizer(input, delims);
        List<Object> nextOnly = new ArrayList<>();
        for (int i = 0; i < NEXT_ONLY_CALLS; i++) {
            Object r = call(fresh::nextToken);
            nextOnly.add(r instanceof String ? r : thrown(r));
        }
        row.put("nextOnly", nextOnly);
    }

    // ---- floats ----
    private static List<Map<String, Object>> parseFloatRows() {
        List<String> inputs = new ArrayList<>(List.of(FLOAT_INPUTS));
        for (float f : MIDPOINT_FLOATS) {
            BigDecimal mid = new BigDecimal((double) f).add(new BigDecimal((double) Math.nextUp(f)))
                .divide(BigDecimal.valueOf(2));
            BigDecimal unit = BigDecimal.ONE.movePointLeft(MIDPOINT_DIGIT);
            inputs.add(mid.subtract(unit).toPlainString());
            inputs.add(mid.toPlainString());
            inputs.add(mid.add(unit).toPlainString());
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        int n = 0;
        for (String input : inputs) {
            Map<String, Object> row = row(F_PARSE_FLOAT + "/" + three(++n), F_PARSE_FLOAT);
            row.put(INPUT, input);
            row.put("parseFloat", parseFloatResult(input));
            row.put("valueOf", valueOfResult(input));
            row.put("viaDouble", viaDoubleResult(input));
            rows.add(row);
        }
        return rows;
    }

    // The three conversions stand in their own try: what a malformed text throws (NumberFormatException) is the row's
    // recorded result, not an error of this program.
    /** The float bits of {@code Float.parseFloat(input)}, or { thrown } of its exception. */
    private static Object parseFloatResult(String input) {
        try {
            return bits(Float.parseFloat(input));
        } catch (RuntimeException e) {
            return thrown(exception(e));
        }
    }

    /** The float bits of {@code Float.valueOf(input)}, or { thrown } of its exception. */
    private static Object valueOfResult(String input) {
        try {
            return bits(Float.valueOf(input));
        } catch (RuntimeException e) {
            return thrown(exception(e));
        }
    }

    /** The float bits of {@code (float) Double.parseDouble(input)} (the route parseFloat does not take), or { thrown }. */
    private static Object viaDoubleResult(String input) {
        try {
            return bits((float) Double.parseDouble(input));
        } catch (RuntimeException e) {
            return thrown(exception(e));
        }
    }

    private static String bits(float f) {
        return String.format("%08x", Float.floatToRawIntBits(f));
    }

    private static List<Map<String, Object>> floatToStringRows() {
        List<Integer> all = new ArrayList<>();
        for (int b : FLOAT_BITS) {
            all.add(b);
        }
        Random random = new Random(RANDOM_SEED);
        for (int i = 0; i < RANDOM_BITS; i++) {
            all.add(random.nextInt());
        }
        for (int i = 0; i < RANDOM_VALUES; i++) {
            all.add(Float.floatToRawIntBits(random.nextFloat() * 1000));
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        int n = 0;
        for (int b : all) {
            Map<String, Object> row = row(F_FLOAT_TO_STRING + "/" + three(++n), F_FLOAT_TO_STRING);
            row.put("bits", String.format("%08x", b));
            row.put("text", Float.toString(Float.intBitsToFloat(b)));
            rows.add(row);
        }
        return rows;
    }

    private static List<Map<String, Object>> simpleRows(String family, String[] inputs,
            java.util.function.Function<String, String> f) {
        List<Map<String, Object>> rows = new ArrayList<>();
        int n = 0;
        for (String input : inputs) {
            Map<String, Object> row = row(family + "/" + three(++n), family);
            row.put(INPUT, input);
            row.put(OUTPUT, f.apply(input));
            rows.add(row);
        }
        return rows;
    }

    // ---- helpers ----
    /** The call's result, or { cls, msg } of the exception it threw. */
    private static Object call(Supplier<Object> s) {
        try {
            return s.get();
        } catch (RuntimeException e) {
            return exception(e);
        }
    }

    /** { cls, msg } of an exception: binary class name and getMessage(). */
    private static Map<String, Object> exception(RuntimeException e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("cls", e.getClass().getName());
        m.put("msg", e.getMessage());
        return m;
    }

    private static Map<String, Object> thrown(Object exception) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("thrown", exception);
        return m;
    }

    private static Map<String, Object> row(String id, String family) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(ID, id);
        m.put(FAMILY, family);
        return m;
    }

    private static String three(int n) {
        return String.format("%03d", n);
    }

    private static void write(Path out, Map<String, List<Map<String, Object>>> families) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"jdk\": ");
        Json.string(sb, System.getProperty("java.version"));
        sb.append(",\n  \"arch\": ");
        Json.string(sb, System.getProperty("os.arch"));
        sb.append(",\n  \"classOnlyMessages\": ");
        Json.write(sb, new ArrayList<>(CLASS_ONLY));
        Map<String, Object> counts = new LinkedHashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        families.forEach((family, list) -> {
            counts.put(family, list.size());
            rows.addAll(list);
        });
        sb.append(",\n  \"rowCounts\": ");
        Json.write(sb, counts);
        sb.append(",\n  \"rows\": [\n");
        writeRows(sb, rows);
        sb.append("  ]\n}\n");
        Files.createDirectories(out.getParent());
        Files.writeString(out, sb, StandardCharsets.UTF_8);
    }

    /** One compact row per line; fails on a duplicate id. */
    static void writeRows(StringBuilder sb, List<Map<String, Object>> rows) {
        Set<Object> ids = new HashSet<>();
        for (int i = 0; i < rows.size(); i++) {
            if (!ids.add(rows.get(i).get(ID))) {
                throw new IllegalStateException("duplicate id " + rows.get(i).get(ID));
            }
            sb.append("    ");
            Json.write(sb, rows.get(i));
            sb.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
    }

    // ---- compact JSON writer (non-ASCII and control characters as u-escapes, so lone surrogates survive) ----
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v instanceof String s) {
                string(sb, s);
            } else if (v instanceof Map<?, ?> m) {
                object(sb, m);
            } else if (v instanceof List<?> l) {
                sb.append('[');
                for (int i = 0; i < l.size(); i++) {
                    sb.append(i == 0 ? "" : ",");
                    write(sb, l.get(i));
                }
                sb.append(']');
            } else if (v == null || v instanceof Boolean || v instanceof Integer) {
                sb.append(v);
            } else {
                throw new IllegalStateException("unexpected JSON value " + v.getClass());
            }
        }

        /** Maps are LinkedHashMaps: insertion order is the key order. */
        private static void object(StringBuilder sb, Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(first ? "" : ",");
                first = false;
                string(sb, (String) e.getKey());
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        }

        static void string(StringBuilder sb, String s) {
            sb.append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> sb.append(c < ' ' || c > '~' ? String.format("\\u%04x", (int) c) : String.valueOf(c));
                }
            }
            sb.append('"');
        }
    }
}
