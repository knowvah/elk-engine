// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D4 and D6 of plans/graphviz-dot/decisions.md) for the Graphviz DOT
// lexer and value converters: what the generated ANTLR InternalGraphvizDotLexer and the value converters bound for
// GraphvizDot.xtext (org.eclipse.elk.alg.graphviz.dot, Xtext 2.36.0) do at the pinned ELK commit. This program only
// CALLS them and records results; it embeds no ELK/Xtext implementation.
// Run: tools/vectors/dot-vectors.sh <outDir>   (java -cp ... DotLexerVectors.java <outDir> <tools/vectors dir>)
// The file carries no `oracle` stamp and this program never reads the pin (D7, issue #173: the landed fitness test
// test/architecture/elk-pin.fitness.test.ts freezes the number of recorders that stamp it). The script still refuses
// to run unless the oracle was built from tools/oracle/ELK_COMMIT.
// Setup: new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration(). The lexer is the class the injector
//   binds as the runtime lexer (Lexer @Named(LexerBindings.RUNTIME); its class name is recorded as runtimeLexer, and
//   the recording fails unless it is InternalGraphvizDotLexer), instantiated here as a subclass that notes reportError.
// Inputs: <vectorsDir>/dot-lexer-cases.txt, one row per line, "#" comments and blank lines ignored:
//   lex <family> <escaped text>       -> one tokens row, id "<family>/<nnn>" (nnn = 1-based index within the family)
//   conv <rule> <op> <escaped input>  -> one converters row, id "conv/<rule>/<op>/<nnn>"; the input is the rest of the
//                                        line, "<null>" (exactly) is Java null, an absent input is the empty string.
//   Escapes decoded by this program: \n \r \t \\ and backslash-u plus four hex digits (any other backslash sequence is
//   a hard error).
// Converter ops: toValue (IValueConverterService.toValue(input, rule, null)) and toString (IValueConverterService
//   .toString(typed input, rule)). toString inputs are typed: "<null>", "str:<text>", "int:<n>", "double:<d>".
// Output <outDir>/graphviz-dot-lexer.json, 2-space indent for the top level, one compact JSON row per line, trailing
// newline (non-ASCII and control characters are written as JSON u-escapes so lone surrogates survive):
//   { jdk, arch, xtextVersion, runtimeLexer, hiddenTokens, classOnlyMessages, rowCounts: { <family>: n },
//     tokens:     [ { id, family, input, tokens: [ { type, text, line, column, start, stop, channel, grammarHidden } ],
//                     lexError } ],
//     converters: [ { id, family: "conv", rule, op, input, output } | { id, family, rule, op, input,
//                     error: { cls, msg, value? } } ] }
//   type = InternalGraphvizDotParser.tokenNames[token type] ("RULE_ID", "'node'", "<invalid>" for the error token Xtext's
//   Lexer.nextToken returns when a rule fails, ...); line = getLine() (1-based); column = getCharPositionInLine();
//   start/stop = CommonToken.getStartIndex()/getStopIndex() (UTF-16 offsets, stop inclusive); channel = getChannel() of
//   the raw lexer (0 default, 99 hidden: the raw lexer puts only error tokens on 99, the parser's token stream hides
//   the grammar's hidden rules); grammarHidden = the type is one of hiddenTokens, the rules GraphvizDot.xtext names in
//   hidden(...) as token names. lexError = reportError fired at least once (message text is not recorded, G5).
//   Converter output: toString -> string|null; toValue -> { class, text } | null. error.cls is the binary class
//   name, msg getMessage() with identity hashes normalised to "@<hash>"; value is the recovered value of a
//   ValueConverterWithValueException. classOnlyMessages = the error classes raised by the JDK itself, whose msg is
//   JDK-version text: the TS side compares their cls only.
import com.google.inject.Injector;
import com.google.inject.Key;
import com.google.inject.name.Names;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.antlr.runtime.ANTLRStringStream;
import org.antlr.runtime.CommonToken;
import org.antlr.runtime.RecognitionException;
import org.antlr.runtime.Token;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.parser.antlr.internal.InternalGraphvizDotLexer;
import org.eclipse.elk.alg.graphviz.dot.parser.antlr.internal.InternalGraphvizDotParser;
import org.eclipse.elk.alg.graphviz.dot.services.GraphvizDotGrammarAccess;
import org.eclipse.xtext.AbstractRule;
import org.eclipse.xtext.conversion.IValueConverterService;
import org.eclipse.xtext.conversion.ValueConverterWithValueException;
import org.eclipse.xtext.parser.antlr.Lexer;
import org.eclipse.xtext.parser.antlr.LexerBindings;

public class DotLexerVectors {
    private static final String CASES = "dot-lexer-cases.txt";
    private static final String OUT = "graphviz-dot-lexer.json";
    private static final String NULL_INPUT = "<null>";
    private static final String ID = "id", FAMILY = "family", CONV = "conv";

    public static void main(String[] args) throws IOException {
        Injector injector = new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration();
        String runtimeLexer = injector.getInstance(Key.get(Lexer.class, Names.named(LexerBindings.RUNTIME)))
            .getClass().getName();
        if (!runtimeLexer.equals(InternalGraphvizDotLexer.class.getName())) {
            throw new IllegalStateException("runtime lexer is " + runtimeLexer);
        }
        List<String> hidden = new ArrayList<>();
        for (AbstractRule r : injector.getInstance(GraphvizDotGrammarAccess.class).getGrammar().getHiddenTokens()) {
            hidden.add("RULE_" + r.getName());
        }
        Converters converters = new Converters(injector.getInstance(IValueConverterService.class));
        Rows rows = new Rows();
        for (String line : Files.readAllLines(Path.of(args[1], CASES), StandardCharsets.UTF_8)) {
            if (!line.isBlank() && !line.startsWith("#")) {
                dispatch(line, converters, hidden, rows);
            }
        }
        StringBuilder out = new StringBuilder("{\n");
        header(out, "jdk", System.getProperty("java.version"));
        header(out, "arch", System.getProperty("os.arch"));
        header(out, "xtextVersion", xtextVersion());
        header(out, "runtimeLexer", runtimeLexer);
        header(out, "hiddenTokens", hidden);
        header(out, "classOnlyMessages", List.of(ClassCastException.class.getName()));
        header(out, "rowCounts", rows.counts);
        list(out, "tokens", rows.tokens, true);
        list(out, "converters", rows.conv, false);
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUT), out.append("}\n"), StandardCharsets.UTF_8);
    }

    /** Rows of both kinds and the per-family counters that number them. */
    static final class Rows {
        final List<Object> tokens = new ArrayList<>(), conv = new ArrayList<>();
        final Map<String, Object> counts = new LinkedHashMap<>();
        final Map<String, Integer> perKey = new HashMap<>();
        final Set<String> ids = new HashSet<>();

        int nextOf(String key) {
            return perKey.merge(key, 1, Integer::sum);
        }

        int next(String family) {
            int n = (Integer) counts.getOrDefault(family, 0) + 1;
            counts.put(family, n);
            return n;
        }

        String id(String id) {
            if (!ids.add(id)) {
                throw new IllegalStateException("duplicate id " + id);
            }
            return id;
        }
    }

    private static void dispatch(String line, Converters converters, List<String> hidden, Rows rows) {
        String[] w = line.split(" ", 4);
        switch (w[0]) {
            case "lex" -> {
                String text = w.length > 2 ? line.substring(5 + w[1].length()) : "";
                String id = rows.id(w[1] + "/" + String.format("%03d", rows.next(w[1])));
                rows.tokens.add(Lexing.row(id, w[1], Escapes.decode(text), hidden));
            }
            case CONV -> {
                String key = CONV + "/" + w[1] + "/" + w[2];
                rows.next(CONV);
                String id = rows.id(key + "/" + String.format("%03d", rows.nextOf(key)));
                rows.conv.add(converters.row(id, w[1], w[2], w.length > 3 ? w[3] : ""));
            }
            default -> throw new IllegalStateException("bad cases row: " + line);
        }
    }

    private static void header(StringBuilder out, String key, Object value) {
        out.append("  \"").append(key).append("\": ");
        Json.write(out, value);
        out.append(",\n");
    }

    private static void list(StringBuilder out, String key, List<Object> list, boolean more) {
        out.append("  \"").append(key).append("\": [\n");
        for (int i = 0; i < list.size(); i++) {
            out.append("    ");
            Json.write(out, list.get(i));
            out.append(i + 1 < list.size() ? ",\n" : "\n");
        }
        out.append(more ? "  ],\n" : "  ]\n");
    }

    /** The version directory of the Xtext bundle jar on the classpath, e.g. 2.36.0. */
    static String xtextVersion() {
        String location = Lexer.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    static Map<String, Object> map() { return new LinkedHashMap<>(); }

    // ---- compact JSON writer ----
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
            } else {
                sb.append(v);
            }
        }

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

    // ---- escape decoding of the cases file ----
    static final class Escapes {
        static String decode(String raw) {
            StringBuilder sb = new StringBuilder();
            int i = 0;
            while (i < raw.length()) {
                char c = raw.charAt(i++);
                if (c != '\\') {
                    sb.append(c);
                } else if (raw.charAt(i) == 'u') {
                    sb.append(unicode(raw, i));
                    i += 5;
                } else {
                    sb.append(simple(raw.charAt(i++)));
                }
            }
            return sb.toString();
        }

        /** The char of the escape {@code \\uXXXX} whose 'u' is at {@code u}; a malformed one is a hard error. */
        private static char unicode(String raw, int u) {
            String hex = raw.substring(u + 1, Math.min(u + 5, raw.length()));
            if (hex.length() != 4 || !hex.matches("[0-9a-fA-F]{4}")) {
                throw new IllegalStateException("bad escape \\u" + hex);
            }
            try {
                return (char) Integer.parseInt(hex, 16);
            } catch (NumberFormatException e) {
                throw new IllegalStateException("bad escape \\u" + hex, e);
            }
        }

        private static char simple(char e) {
            return switch (e) {
                case 'n' -> '\n';
                case 'r' -> '\r';
                case 't' -> '\t';
                case '\\' -> '\\';
                default -> throw new IllegalStateException("bad escape \\" + e);
            };
        }

        static String input(String raw) { return raw.equals(NULL_INPUT) ? null : decode(raw); }
    }

    // ---- lexer rows ----
    static final class Lexing {
        private static final int MAX_TOKENS = 10_000;

        static Map<String, Object> row(String id, String family, String text, List<String> hidden) {
            boolean[] error = {false};
            InternalGraphvizDotLexer lexer = new InternalGraphvizDotLexer(new ANTLRStringStream(text)) {
                @Override
                public void reportError(RecognitionException e) {
                    error[0] = true;
                    super.reportError(e);
                }
            };
            List<Object> tokens = new ArrayList<>();
            for (Token t = lexer.nextToken(); t.getType() != Token.EOF; t = lexer.nextToken()) {
                if (tokens.size() >= MAX_TOKENS) {
                    throw new IllegalStateException("lexer did not terminate on: " + text);
                }
                tokens.add(token(t, hidden));
            }
            Map<String, Object> m = map();
            m.put(ID, id);
            m.put(FAMILY, family);
            m.put("input", text);
            m.put("tokens", tokens);
            m.put("lexError", error[0]);
            return m;
        }

        private static Map<String, Object> token(Token t, List<String> hidden) {
            Map<String, Object> m = map();
            String type = InternalGraphvizDotParser.tokenNames[t.getType()];
            m.put("type", type);
            m.put("text", t.getText());
            m.put("line", t.getLine());
            m.put("column", t.getCharPositionInLine());
            CommonToken c = (CommonToken) t;
            m.put("start", c.getStartIndex());
            m.put("stop", c.getStopIndex());
            m.put("channel", t.getChannel());
            m.put("grammarHidden", hidden.contains(type));
            return m;
        }
    }

    // ---- converter rows ----
    static final class Converters {
        private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
        private final IValueConverterService service;

        Converters(IValueConverterService service) {
            this.service = service;
        }

        Map<String, Object> row(String id, String rule, String op, String rawInput) {
            String input = Escapes.input(rawInput);
            Map<String, Object> m = map();
            m.put(ID, id);
            m.put(FAMILY, CONV);
            m.put("rule", rule);
            m.put("op", op);
            m.put("input", input);
            try {
                m.put("output", run(rule, op, input));
            } catch (Exception e) {
                m.put("error", thrown(e));
            }
            return m;
        }

        private Object run(String rule, String op, String input) {
            return switch (op) {
                case "toValue" -> value(service.toValue(input, rule, null));
                case "toString" -> service.toString(typed(input), rule);
                default -> throw new IllegalStateException("bad op: " + op);
            };
        }

        private static Object typed(String input) {
            if (input == null) {
                return null;
            }
            int colon = input.indexOf(':');
            String payload = input.substring(colon + 1);
            try {
                return switch (input.substring(0, colon)) {
                    case "str" -> payload;
                    case "int" -> Integer.valueOf(payload);
                    case "double" -> Double.valueOf(payload);
                    default -> throw new IllegalStateException("bad typed input: " + input);
                };
            } catch (NumberFormatException e) {
                throw new IllegalStateException("bad typed input: " + input, e);
            }
        }

        static Object value(Object v) {
            if (v == null) {
                return null;
            }
            Map<String, Object> m = map();
            m.put("class", v.getClass().getName());
            m.put("text", String.valueOf(v));
            return m;
        }

        private static Map<String, Object> thrown(Exception e) {
            Map<String, Object> m = map();
            m.put("cls", e.getClass().getName());
            m.put("msg", e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>"));
            if (e instanceof ValueConverterWithValueException v) {
                m.put("value", value(v.getValue()));
            }
            return m;
        }
    }
}
