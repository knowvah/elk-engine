// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-9, AD-13) for the pure-JDK classes that
// org.eclipse.elk.core.comments uses: java.awt.geom.Rectangle2D.Double, java.util.regex.Pattern and
// java.lang.Character / String.equalsIgnoreCase. Spec source: the Javadoc only --
// https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html
// https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.Double.html
// https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html
// https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Character.html
// https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#equalsIgnoreCase(java.lang.String)
// This program only CALLS the JDK and records results; it embeds no JDK implementation.
// Encoding: double = 16-hex Double.doubleToRawLongBits (as JavaVectors.hex), strings JSON-escaped
// (everything outside printable ASCII as \\uXXXX), char ranges = inclusive [start, end] code units.
// regex-boundary.json (R2 amendment): the JVM's `\\b` behaviour, measured only by calling Pattern/Matcher.
// A probe is a template over code units plus an index; '%' is replaced by each BMP unit c in turn (lone
// surrogates included), '~' is U+0307 COMBINING DOT ABOVE, every other template char is literal. The probe
// records the inclusive ranges of c for which a word boundary (`\\b`, lookingAt on a zero-width region
// [index, index] with transparent bounds, so the whole text is visible) exists at `index` of the text.
// supplementaryProbes: the same templates with '%' = each code point U+10000..U+10FFFF as a surrogate pair
// (index counts template chars; ranges are code-point ranges).
// toUpperCase / toLowerCase there are [codePoint, mapped] pairs for U+10000..U+10FFFF where the mapping differs.
// Run: java tools/vectors/CoreJdkVectors.java test/golden/refs/java
import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;

public class CoreJdkVectors {
    private static final String JDK = System.getProperty("java.version");
    private static final String FUZZY = "fuzzy", STRICT = "strict";
    private static final double NAN = Double.NaN, INF = Double.POSITIVE_INFINITY;
    private static final int CHAR_COUNT = 65536;

    public static void main(String[] args) throws IOException {
        Path dir = Path.of(args[0]);
        Files.createDirectories(dir);
        write(dir.resolve("awt.json"), awt());
        write(dir.resolve("regex.json"), regex());
        write(dir.resolve("character.json"), character());
        write(dir.resolve("regex-boundary.json"), boundary());
        write(dir.resolve("stream-sum.json"), streamSum());
    }

    // ---- stream-sum.json: AggregatedMatchDecider.sum/avg/max/min, called exactly as the Java does ----
    // Spec: Collectors.summingDouble / averagingDouble / Collections.max / Collections.min Javadoc only.
    // Row: values = inputs in order (hex), sum, avg = results (hex), max, min = result hex or "NoSuchElementException".

    private static Map<String, Object> streamSum() {
        List<double[]> inputs = new ArrayList<>();
        double max = Double.MAX_VALUE, tiny = Double.MIN_VALUE, norm = Double.MIN_NORMAL;
        double[][] fixed = {
            {}, {0.0}, {-0.0}, {1.0}, {0.1}, {NAN}, {INF}, {-INF},
            {0.0, -0.0}, {-0.0, 0.0}, {-0.0, -0.0}, {0.0, 0.0}, {-0.0, -0.0, -0.0}, {-0.0, 0.0, -0.0},
            {1e16, 1, -1e16}, {1e16, -1e16, 1}, {1, 1e16, -1e16}, {1, -1e16, 1e16}, {-1e16, 1e16, 1}, {-1e16, 1, 1e16},
            {1, 1e100, 1, -1e100}, {1e100, 1, 1, -1e100}, {1, 1, 1e100, -1e100}, {1e100, 1, -1e100, 1},
            {1e16, 1, 1, 1, 1, -1e16}, {1e16, 1, 1, 1, 1, 1, 1, 1, 1, -1e16},
            {0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1},
            {1.0 / 3, 1.0 / 3, 1.0 / 3}, {1.0 / 3, 2.0 / 3, 1.0 / 3, 2.0 / 3, 1.0 / 3, 1.0 / 3},
            {1e308, 1e-308, 1.0}, {1e10, 1e-10, 1.0, 1e5, 1e-5}, {1e20, 1.0, 1e-20}, {123456789.0, 0.000001, 3.5},
            {INF, 1.0}, {1.0, INF}, {-INF, 1.0}, {INF, -INF}, {-INF, INF}, {INF, INF}, {-INF, -INF},
            {INF, -INF, 1.0}, {1.0, INF, -INF}, {INF, 1.0, -INF}, {INF, INF, -INF}, {NAN, 1.0}, {1.0, NAN},
            {NAN, INF}, {INF, NAN}, {NAN, NAN}, {INF, 1.0, NAN}, {0.5, 0.25, INF, 0.125},
            {max, max}, {max, max, -max}, {max, -max, max}, {-max, max, max}, {max, max, -max, -max},
            {-max, -max}, {max, 1.0, max}, {max, max, 1.0, -max, -max}, {max, max, max}, {max, max, max, -max},
            {max, max, -max, 1.0}, {max, max, 1.0}, {1.0, max, max, -max},
            {tiny}, {tiny, tiny}, {tiny, -tiny}, {tiny, 1.0}, {1.0, tiny, tiny}, {norm, -tiny}, {norm, tiny, -norm},
            {tiny, tiny, tiny, tiny, tiny, tiny, tiny}, {-tiny, -0.0},
        };
        inputs.addAll(Arrays.asList(fixed));
        double[] pool = {0.1, 0.2, 0.3, 0.7, 1.0 / 3, 2.0 / 3, 0.25, 1.0, 0.0};
        for (int n = 2; n <= 5; n++) {
            for (int start = 0; start + n <= pool.length; start += (n == 5 ? 2 : 1)) {
                permutations(Arrays.copyOfRange(pool, start, start + n), 0, inputs);
            }
        }
        Random rnd = new Random(20261024L);
        double[] mags = {1e-300, 1e-20, 1e-5, 1e-2, 0.5, 1, 3, 1e5, 1e15, 1e16, 1e20, 1e100, 1e300};
        for (int i = 0; i < 400; i++) {
            double[] v = new double[2 + rnd.nextInt(7)];
            for (int j = 0; j < v.length; j++) {
                v[j] = (rnd.nextBoolean() ? -1 : 1) * rnd.nextDouble() * mags[rnd.nextInt(mags.length)];
            }
            inputs.add(v);
        }
        List<Object> rows = new ArrayList<>();
        for (double[] v : inputs) {
            List<Double> values = new ArrayList<>();
            List<Object> hexes = new ArrayList<>();
            for (double d : v) {
                values.add(d);
                hexes.add(hex(d));
            }
            double sum = values.stream().collect(java.util.stream.Collectors.summingDouble((d) -> d));
            double avg = values.stream().collect(java.util.stream.Collectors.averagingDouble((d) -> d));
            Object mx = values.isEmpty() ? "NoSuchElementException" : hex(Collections.max(values));
            Object mn = values.isEmpty() ? "NoSuchElementException" : hex(Collections.min(values));
            rows.add(map("values", hexes, "sum", hex(sum), "avg", hex(avg), "max", mx, "min", mn));
        }
        return map("jdk", JDK, "rows", rows);
    }

    private static void permutations(double[] a, int k, List<double[]> out) {
        if (k == a.length) {
            out.add(a.clone());
            return;
        }
        for (int i = k; i < a.length; i++) {
            double t = a[k]; a[k] = a[i]; a[i] = t;
            permutations(a, k + 1, out);
            t = a[k]; a[k] = a[i]; a[i] = t;
        }
    }

    // ---- Rectangle2D.Double ----

    private static final double[][] RECTS = {
        {0, 0, 10, 10}, {5, 5, 0, 10}, {5, 5, 10, 0}, {0, 0, 0, 0}, {10, 10, -5, -5}, {0, 0, -3, 4},
        {-0.0, -0.0, 0.0, 0.0}, {NAN, 0, 10, 10}, {0, NAN, 10, 10}, {0, 0, NAN, 10}, {0, 0, 10, NAN},
        {0, 0, INF, 10}, {-INF, 0, INF, 10}, {10, 0, 10, 10}, {10, 10, 5, 5}, {2, 2, 3, 3},
        {20, 20, 5, 5}, {5, 5, 10, 10}, {-5, -5, 5, 5}, {0.5, 0.5, 1e-300, 1e-300}, {-4, 2, 8, 6}};
    private static final double[] COMMON = {-1, 0, 5, 10, 11, 15, NAN, INF, -INF};

    private static Map<String, Object> awt() {
        List<Object> rows = new ArrayList<>();
        for (double[] r : RECTS) {
            Rectangle2D.Double rect = rect(r);
            for (double[] p : points(r)) {
                rows.add(row(r, "outcode", List.of(hex(p[0]), hex(p[1])), rect.outcode(p[0], p[1])));
            }
            rows.add(row(r, "isEmpty", List.of(), rect.isEmpty()));
            for (double[] o : RECTS) {
                List<Object> a = List.of(hex(o[0]), hex(o[1]), hex(o[2]), hex(o[3]));
                rows.add(row(r, "intersects4", a, rect.intersects(o[0], o[1], o[2], o[3])));
                rows.add(row(r, "intersectsRect", a, rect.intersects(rect(o))));
            }
        }
        return map("jdk", JDK, "rows", rows);
    }

    private static Rectangle2D.Double rect(double[] r) {
        return new Rectangle2D.Double(r[0], r[1], r[2], r[3]);
    }

    private static List<double[]> points(double[] r) {
        double[] xs = {r[0] - 1, r[0], r[0] + r[2] / 2, r[0] + r[2], r[0] + r[2] + 1};
        double[] ys = {r[1] - 1, r[1], r[1] + r[3] / 2, r[1] + r[3], r[1] + r[3] + 1};
        Map<String, double[]> out = new LinkedHashMap<>();
        for (double x : xs) for (double y : ys) out.put(hex(x) + hex(y), new double[] {x, y});
        for (double x : COMMON) for (double y : COMMON) out.put(hex(x) + hex(y), new double[] {x, y});
        return new ArrayList<>(out.values());
    }

    private static Map<String, Object> row(double[] r, String op, List<Object> args, Object result) {
        return map("rect", List.of(hex(r[0]), hex(r[1]), hex(r[2]), hex(r[3])), "op", op, "args", args,
            "result", result);
    }

    // ---- regex: fuzzyRegexpFor / strictRegexpFor copied verbatim from NodeReferenceMatcher ----

    /** @see org.eclipse.elk.core.comments.NodeReferenceMatcher#fuzzyRegexpFor (NodeReferenceMatcher.java:320-360) */
    private static Pattern fuzzyRegexpFor(final String targetName) {
        String trimmedTargetName = targetName.trim();
        StringBuffer regexp = new StringBuffer(targetName.length() * 2);
        StringBuffer currentSegment = new StringBuffer(targetName.length());

        for (int i = 0; i < trimmedTargetName.length(); i++) {
            char currC = trimmedTargetName.charAt(i);

            if (Character.isUpperCase(currC)) {
                if (i > 0 && Character.isLowerCase(trimmedTargetName.charAt(i - 1))) {
                    regexp.append(Pattern.quote(currentSegment.toString()));
                    currentSegment = new StringBuffer(targetName.length());

                    regexp.append("[\\h\\v]*");
                }

                currentSegment.append(currC);
            } else if (Character.isWhitespace(currC)) {
                if (i > 0 && !Character.isWhitespace(trimmedTargetName.charAt(i - 1))) {
                    regexp.append(Pattern.quote(currentSegment.toString()));
                    currentSegment = new StringBuffer(targetName.length());

                    regexp.append("[\\h\\v]*");
                }
            } else {
                currentSegment.append(currC);
            }
        }

        regexp.append(Pattern.quote(currentSegment.toString()));

        return Pattern.compile("\\b" + regexp.toString() + "\\b",
                Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    }

    /** @see org.eclipse.elk.core.comments.NodeReferenceMatcher#strictRegexpFor (NodeReferenceMatcher.java:376-385) */
    private static Pattern strictRegexpFor(final String targetName) {
        return Pattern.compile("\\b" + Pattern.quote(targetName) + "\\b", Pattern.DOTALL);
    }

    private static final String[] NAMES = {
        "Foo", "foo", "fooBar", "FooBar", "fooBarBaz", "ABc", "aB", "ab", "foo bar", "Foo Bar", "foo   bar",
        "foo \t\n bar", "  foo bar  ", "\tfoo\n", "a b", "a.b", ".*+?()[]{}\\|^$", "a\\Eb", "\\E", "\\Q", "a\\Qb",
        "x\\E.*", "node1", "node_1", "_x", "x9", "9x", "é", "É", "École", "caféBar",
        "straße", "STRASSE", "ſ", "ſs", "K", "kelvin", "Kelvin", "Σίσυφος",
        "σ", "ς", "Привет", "приВет",
        "İstanbul", "i\u0307", "", " ", "   ", "\n"};
    private static final String[] SWEEP_NAMES = {"foo bar", "fooBar", "Foo Bar", "foo", "", "caféBar"};
    private static final String[] H_MEMBERS = {"\t", " ", "\u00A0", "\u1680", "\u180E", "\u2000", "\u2001",
        "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200A", "\u202F",
        "\u205F", "\u3000"};
    private static final String[] V_MEMBERS = {"\n", "\u000b", "\f", "\r", "\u0085", "\u2028", "\u2029", "\r\n"};
    private static final String[] NEAR_MISS = {"\u200B", "\u2060", "\uFEFF", "\u001c", "\u001f", "\u0000", "\u2010"};

    private static Map<String, Object> regex() {
        List<Object> rows = new ArrayList<>();
        for (String name : NAMES) {
            Set<String> texts = new LinkedHashSet<>(texts(name));
            for (String sep : concat(H_MEMBERS, V_MEMBERS, NEAR_MISS)) {
                if (Arrays.asList(SWEEP_NAMES).contains(name)) texts.addAll(separated(name, sep));
            }
            for (String text : texts) {
                add(rows, name, FUZZY, fuzzyRegexpFor(name), text);
                add(rows, name, STRICT, strictRegexpFor(name), text);
            }
        }
        return map("jdk", JDK, "rows", rows);
    }

    private static void add(List<Object> rows, String name, String mode, Pattern p, String text) {
        rows.add(map("name", name, "mode", mode, "regex", p.pattern(), "flags", p.flags(), "text", text,
            "found", p.matcher(text).find()));
    }

    private static List<String> texts(String name) {
        List<String> t = new ArrayList<>();
        String trimmed = name.trim();
        for (String n : new String[] {name, trimmed}) {
            t.addAll(List.of(n, "xx " + n + " yy", "xx " + n, n + " yy", "xx" + n, n + "yy", n + "_", "_" + n,
                n + "1", "1" + n, n + "é", "é" + n, "É" + n, n + "ß", n + ".", "," + n + "!",
                "(" + n + ")", "-" + n + "-", n + " ", " " + n, n.toUpperCase(Locale.ROOT),
                n.toLowerCase(Locale.ROOT), asciiSwap(n), asciiUpper(n), asciiLower(n), "xx " + n.toUpperCase(Locale.ROOT) + " yy",
                "xx " + n.toLowerCase(Locale.ROOT) + " yy", n.replace(" ", "\n"), n.replace(" ", "\r\n"),
                "x\n" + n + "\ny", "x\r\n" + n + "\r\ny", n.replace(" ", " \n ")));
        }
        t.addAll(List.of("", " ", "\n", "foo", "bar", "foobar", "foo bar"));
        return t;
    }

    private static List<String> separated(String name, String sep) {
        String trimmed = name.trim();
        String viaSpaces = trimmed.replace(" ", sep);
        String viaCamel = trimmed.replaceAll("(?<=\\p{Ll})(?=\\p{Lu})", sep.replace("\\", "\\\\"));
        return List.of("a" + sep + name + sep + "b", name + sep, sep + name, viaSpaces,
            viaSpaces.toLowerCase(Locale.ROOT), viaCamel, viaCamel.toLowerCase(Locale.ROOT),
            trimmed.replace(" ", sep + sep));
    }

    private static String asciiUpper(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) b.append(c >= 'a' && c <= 'z' ? (char) (c - 32) : c);
        return b.toString();
    }

    private static String asciiLower(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) b.append(c >= 'A' && c <= 'Z' ? (char) (c + 32) : c);
        return b.toString();
    }

    private static String asciiSwap(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            b.append(c >= 'a' && c <= 'z' ? (char) (c - 32) : c >= 'A' && c <= 'Z' ? (char) (c + 32) : c);
        }
        return b.toString();
    }

    private static String[] concat(String[]... arrays) {
        return Arrays.stream(arrays).flatMap(Arrays::stream).toArray(String[]::new);
    }

    // ---- Character ----

    private static final String[][] EQUALS_PAIRS = {
        {"abc", "ABC"}, {"abc", "abd"}, {"abc", "abcd"}, {"abcd", "abc"}, {"", ""}, {"", "a"}, {"a", ""},
        {"a", "A"}, {"z", "Z"}, {"@", "`"}, {"[", "{"}, {"é", "É"}, {"é", "e"},
        {"ß", "SS"}, {"ß", "ss"}, {"ß", "ẞ"}, {"straße", "STRASSE"},
        {"straße", "STRAẞE"}, {"ſ", "s"}, {"ſ", "S"}, {"s", "S"}, {"ſ", "ſ"},
        {"K", "k"}, {"K", "K"}, {"K", "K"}, {"İ", "i"}, {"İ", "I"},
        {"ı", "I"}, {"ı", "i"}, {"İ", "ı"}, {"İ", "İ"},
        {"σ", "Σ"}, {"ς", "Σ"}, {"σ", "ς"}, {"ς", "ς"},
        {"Σίσυφος", "σίσυφοΣ"},
        {"ǅ", "ǆ"}, {"ǅ", "Ǆ"}, {"Ǆ", "ǆ"}, {"в", "В"},
        {"µ", "Μ"}, {"µ", "μ"}, {"ÿ", "Ÿ"}, {"ẞ", "ß"},
        {"𐐀", "𐐨"}, {"𐐀", "𐐀"}, {"𐐀", "\ud801"}};

    private static Map<String, Object> character() {
        Map<String, Object> root = map("jdk", JDK);
        root.put("isUpperCase", ranges(Character::isUpperCase));
        root.put("isLowerCase", ranges(Character::isLowerCase));
        root.put("isWhitespace", ranges(Character::isWhitespace));
        root.put("toUpperCase", pairs(true));
        root.put("toLowerCase", pairs(false));
        List<Object> eq = new ArrayList<>();
        for (String[] p : EQUALS_PAIRS) {
            eq.add(map("a", p[0], "b", p[1], "result", p[0].equalsIgnoreCase(p[1])));
        }
        root.put("equalsIgnoreCase", eq);
        return root;
    }

    private static List<Object> ranges(java.util.function.IntPredicate pred) {
        List<Object> out = new ArrayList<>();
        int start = -1;
        for (int c = 0; c <= CHAR_COUNT; c++) {
            boolean in = c < CHAR_COUNT && pred.test(c);
            if (in && start < 0) start = c;
            if (!in && start >= 0) {
                out.add(List.of(start, c - 1));
                start = -1;
            }
        }
        return out;
    }

    private static List<Object> pairs(boolean upper) {
        List<Object> out = new ArrayList<>();
        for (int c = 0; c < CHAR_COUNT; c++) {
            int m = upper ? Character.toUpperCase((char) c) : Character.toLowerCase((char) c);
            if (m != c) out.add(List.of(c, m));
        }
        return out;
    }

    // ---- regex-boundary: where `\\b` holds, probed per BMP unit; supplementary case maps ----

    private static final Pattern BOUNDARY = Pattern.compile("\\b");
    private static final char MARK = '\u0307';
    private static final Object[][] BOUNDARY_PROBES = {
        {"a%", 1}, {"%a", 1}, {" %", 1}, {"% ", 1}, {"%", 0}, {"%", 1},
        {"a%%", 1}, {"a%%", 2}, {"a%%", 3}, {" %%", 1}, {" %%", 2}, {" %%", 3},
        {"%~", 1}, {"%~", 2}, {"%~~", 2}, {"%~~", 3}, {"~%", 0}, {"~%", 1}, {"~%", 2},
        {"a%~", 2}, {"a%~", 3}, {" %~", 2}, {" %~", 3}, {"a~%", 2}, {"a~%", 3}, {" ~%", 2}, {" ~%", 3},
        {"a%a", 1}, {"a%a", 2}, {" % ", 1}, {" % ", 2}};

    private static Map<String, Object> boundary() {
        List<Object> probes = new ArrayList<>();
        for (Object[] probe : BOUNDARY_PROBES) {
            String template = (String) probe[0];
            int index = (Integer) probe[1];
            probes.add(map("name", template + "@" + index, "template", template, "index", index,
                "ranges", ranges(c -> boundaryAt(fill(template, (char) c), index))));
        }
        Map<String, Object> root = map("jdk", JDK, "probes", probes);
        root.put("supplementaryToUpperCase", supplementaryPairs(true));
        root.put("supplementaryToLowerCase", supplementaryPairs(false));
        root.put("supplementaryProbes", supplementaryProbes());
        root.put("bmpThenSupplementaryMarkProbes", bmpThenSupplementaryMarkProbes());
        return root;
    }

    /** Same templates, but '%' is each code point U+10000..U+10FFFF as a surrogate pair; index counts template chars. */
    private static List<Object> supplementaryProbes() {
        List<Object> probes = new ArrayList<>();
        for (Object[] probe : BOUNDARY_PROBES) {
            String template = (String) probe[0];
            int index = (Integer) probe[1];
            List<Object> out = new ArrayList<>();
            int start = -1;
            for (int cp = 0x10000; cp <= Character.MAX_CODE_POINT + 1; cp++) {
                boolean in = cp <= Character.MAX_CODE_POINT && boundaryAt(fillCodePoint(template, cp), unitIndex(template, index, 2));
                if (in && start < 0) start = cp;
                if (!in && start >= 0) {
                    out.add(List.of(start, cp - 1));
                    start = -1;
                }
            }
            probes.add(map("name", template + "@" + index, "template", template, "index", index, "ranges", out));
        }
        return probes;
    }

    private static final int SUPPLEMENTARY_MARK = 0x1D167;
    private static final Object[][] SUPPLEMENTARY_MARK_PROBES = {{"%^", 1}, {"%~^", 2}, {"a%^", 2}, {"a%^", 3}};

    /** '%' = each BMP unit, '~' = U+0307, '^' = U+1D167 (a supplementary non-spacing mark) as a surrogate pair. */
    private static List<Object> bmpThenSupplementaryMarkProbes() {
        List<Object> probes = new ArrayList<>();
        for (Object[] probe : SUPPLEMENTARY_MARK_PROBES) {
            String template = (String) probe[0];
            int index = (Integer) probe[1];
            probes.add(map("name", template + "@" + index, "template", template, "index", index, "ranges",
                ranges(c -> boundaryAt(fillMarks(template, (char) c), unitIndex(template, index, 1)))));
        }
        return probes;
    }

    private static String fillMarks(String template, char c) {
        StringBuilder b = new StringBuilder();
        for (char t : template.toCharArray()) {
            if (t == '%') b.append(c);
            else if (t == '^') b.appendCodePoint(SUPPLEMENTARY_MARK);
            else b.append(t == '~' ? MARK : t);
        }
        return b.toString();
    }

    private static String fillCodePoint(String template, int cp) {
        StringBuilder b = new StringBuilder();
        for (char t : template.toCharArray()) {
            if (t == '%') b.appendCodePoint(cp);
            else b.append(t == '~' ? MARK : t);
        }
        return b.toString();
    }

    /** UTF-16 index of template position `index`; '%' is `percentWidth` units, '^' is a pair. */
    private static int unitIndex(String template, int index, int percentWidth) {
        int units = 0;
        for (int i = 0; i < index; i++) units += template.charAt(i) == '%' ? percentWidth : template.charAt(i) == '^' ? 2 : 1;
        return units;
    }

    private static String fill(String template, char c) {
        StringBuilder b = new StringBuilder();
        for (char t : template.toCharArray()) {
            b.append(t == '%' ? c : t == '~' ? MARK : t);
        }
        return b.toString();
    }

    private static boolean boundaryAt(String text, int index) {
        java.util.regex.Matcher m = BOUNDARY.matcher(text);
        m.useTransparentBounds(true);
        m.useAnchoringBounds(false);
        m.region(index, index);
        return m.lookingAt();
    }

    private static List<Object> supplementaryPairs(boolean upper) {
        List<Object> out = new ArrayList<>();
        for (int cp = 0x10000; cp <= Character.MAX_CODE_POINT; cp++) {
            int m = upper ? Character.toUpperCase(cp) : Character.toLowerCase(cp);
            if (m != cp) out.add(List.of(cp, m));
        }
        return out;
    }

    // ---- JSON: top-level keys on lines, list elements one per line, nested values flat ----

    private static void write(Path file, Map<String, Object> root) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        Iterator<Map.Entry<String, Object>> it = root.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Object> e = it.next();
            sb.append("  \"").append(e.getKey()).append("\": ");
            if (e.getValue() instanceof List<?> l && !l.isEmpty()) {
                sb.append("[\n");
                for (int i = 0; i < l.size(); i++) {
                    sb.append("    ").append(render(l.get(i))).append(i + 1 < l.size() ? ",\n" : "\n");
                }
                sb.append("  ]");
            } else {
                sb.append(render(e.getValue()));
            }
            sb.append(it.hasNext() ? ",\n" : "\n");
        }
        Files.writeString(file, sb.append("}\n").toString(), StandardCharsets.UTF_8);
    }

    private static String render(Object o) {
        if (o instanceof Map<?, ?> m) {
            StringJoiner j = new StringJoiner(", ", "{", "}");
            m.forEach((k, v) -> j.add(quote(String.valueOf(k)) + ": " + render(v)));
            return j.toString();
        } else if (o instanceof List<?> l) {
            StringJoiner j = new StringJoiner(", ", "[", "]");
            l.forEach(x -> j.add(render(x)));
            return j.toString();
        }
        return o instanceof String s ? quote(s) : String.valueOf(o);
    }

    private static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"') b.append("\\\"");
            else if (c == '\\') b.append("\\\\");
            else if (c >= 0x20 && c < 0x7f) b.append(c);
            else b.append(String.format("\\u%04x", (int) c));
        }
        return b.append('"').toString();
    }

    private static String hex(double d) {
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    private static Map<String, Object> map(Object... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("map() needs key/value pairs, got " + kv.length + " arguments");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }
}
