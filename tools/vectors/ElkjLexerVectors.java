// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, G6) for the .elkj lexer and value converters: what the generated
// ANTLR InternalElkGraphJsonLexer and the Xtext/ELK converters of org.eclipse.elk.graph.json.text do at the pinned ELK commit
// (Xtext 2.36.0). This program only CALLS them and records results; it embeds no ELK/Xtext implementation.
// Run: tools/vectors/elkj-vectors.sh <outDir>   (java -cp ... ElkjLexerVectors.java <outDir> <tools/vectors dir>)
// Registry: the first statement isolates LayoutMetaDataService (CoreOptions only, G3, as MetaDataVectors.java).
// Inputs: <vectorsDir>/elkj-lexer-cases.txt, one row per line, "#" comments, blank lines ignored:
//   lex <escaped text>                          -> one tokens row
//   conv <converter> <op> <escaped input>       -> one converters row; the input is the rest of the line
//   Escapes decoded by this program: \n \r \t \\ and backslash-u plus four hex digits (any other backslash sequence is a hard error). The
//   input "<null>" (exactly) is Java null; an absent input is the empty string.
// Converters (the first column) and ops:
//   <rule>        any grammar/terminal rule name through IValueConverterService (Number PropertyKey StringValue
//                 NumberValue BooleanValue, ID STRING INT SIGNED_INT FLOAT, plus an unknown name to record the NO_OP
//                 fallback).  ops: toValue (node = null), toString.
//   Document      op parse: input "<key>: <value>" is parsed as the document "{layoutOptions: {<input>}}" and the
//                 first property entry of the root is read back (this is the node-dependent PropertyValue branch).
// toString inputs are typed: "<null>", "str:", "int:", "long:", "double:", "float:", "bool:", "enum:<fqcn>.<CONST>",
//   "kvector:x,y", "proxy:<text>" (LayoutOptionProxy), "opt:<optionId>" (registered LayoutOptionData),
//   "prop:<id>" (unregistered Property), "obj:<text>" (a non-String, non-Number, non-Enum object).
// Output <outDir>/graph-json-text-lexer.json, 2-space indent for the top level, one compact JSON row per line, trailing
// newline (non-ASCII and control characters are written as JSON u-escapes so lone surrogates survive):
//   { elkCommit, xtextVersion, registry: "core",
//     tokens:     [ { input, tokens: [ { type, text, line, hidden } ], lexError } ],
//     converters: [ { converter, op, input, output } | { converter, op, input, error: { cls, msg, value? } } ] }
//   type = InternalElkGraphJsonParser.tokenNames[token type] ("RULE_ID", "'\"id\"'", "<invalid>" for the lexer's error
//   token, ...); line = ANTLR getLine(); hidden = channel is HIDDEN (WS, comments, error tokens); lexError = the
//   lexer's reportError fired (message text is not recorded, G5). Converter output: toString -> string|null;
//   toValue/parse -> { class, text } | { class, id } (IProperty) | null. error.cls is the binary class name, msg getMessage() with identity hashes normalised to
//   "@<hash>"; value is the recovered value of a ValueConverterWithValueException. msg of exceptions raised by the
//   JDK itself (StringIndexOutOfBounds, ClassCast) is JDK-version text: compare cls only. Document errors[] also
//   carries ANTLR syntax messages, which are presence-only (G5).
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Pattern;
import org.antlr.runtime.ANTLRStringStream;
import org.antlr.runtime.RecognitionException;
import org.antlr.runtime.Token;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.util.internal.LayoutOptionProxy;
import org.eclipse.elk.graph.ElkGraphPackage;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.elk.graph.json.text.parser.antlr.internal.InternalElkGraphJsonLexer;
import org.eclipse.elk.graph.json.text.parser.antlr.internal.InternalElkGraphJsonParser;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.conversion.IValueConverterService;
import org.eclipse.xtext.conversion.ValueConverterWithValueException;
import org.eclipse.xtext.resource.XtextResourceSet;

public class ElkjLexerVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String CASES = "elkj-lexer-cases.txt";
    private static final String OUT = "graph-json-text-lexer.json";
    private static final String NULL_INPUT = "<null>";
    private static final String CLASS = "class", TEXT = "text";

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        // The grammar imports http://www.eclipse.org/elk/ElkGraph; outside OSGi nothing else initialises the package
        // (the .elkt setup does it as a side effect, the .elkj one does not).
        ElkGraphPackage.eINSTANCE.getName();
        Injector injector = new ElkGraphJsonStandaloneSetup().createInjectorAndDoEMFRegistration();
        Converters converters = new Converters(injector);
        List<Object> tokens = new ArrayList<>(), conv = new ArrayList<>();
        for (String line : Files.readAllLines(Path.of(args[1], CASES), StandardCharsets.UTF_8)) {
            if (!line.isBlank() && !line.startsWith("#")) {
                dispatch(line, converters, tokens, conv);
            }
        }
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n  \"registry\": \"core\",\n");
        rows(out, "tokens", tokens, true);
        rows(out, "converters", conv, false);
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUT), out.append("}\n"), StandardCharsets.UTF_8);
    }

    private static void dispatch(String line, Converters converters, List<Object> tokens, List<Object> conv) {
        String[] w = line.split(" ", 4);
        switch (w[0]) {
            case "lex" -> tokens.add(Lexing.row(Escapes.decode(w.length > 1 ? line.substring(4) : "")));
            case "conv" -> conv.add(converters.row(w[1], w[2], w.length > 3 ? w[3] : ""));
            default -> throw new IllegalStateException("bad cases row: " + line);
        }
    }

    private static void rows(StringBuilder out, String key, List<Object> list, boolean more) {
        out.append("  \"").append(key).append("\": [\n");
        for (int i = 0; i < list.size(); i++) {
            out.append("    ");
            Json.write(out, list.get(i));
            out.append(i + 1 < list.size() ? ",\n" : "\n");
        }
        out.append(more ? "  ],\n" : "  ]\n");
    }

    static Map<String, Object> map() { return new LinkedHashMap<>(); }

    // ---- compact JSON writer ----
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof String s) {
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
            try {
                if (hex.length() == 4) {
                    return (char) Integer.parseInt(hex, 16);
                }
            } catch (NumberFormatException e) {
                throw new IllegalStateException("bad escape \\u" + hex, e);
            }
            throw new IllegalStateException("bad escape \\u" + hex);
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

        static Map<String, Object> row(String text) {
            boolean[] error = {false};
            InternalElkGraphJsonLexer lexer = new InternalElkGraphJsonLexer(new ANTLRStringStream(text)) {
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
                tokens.add(token(t));
            }
            Map<String, Object> m = map();
            m.put("input", text);
            m.put("tokens", tokens);
            m.put("lexError", error[0]);
            return m;
        }

        private static Map<String, Object> token(Token t) {
            Map<String, Object> m = map();
            m.put("type", InternalElkGraphJsonParser.tokenNames[t.getType()]);
            m.put(TEXT, t.getText());
            m.put("line", t.getLine());
            m.put("hidden", t.getChannel() == Token.HIDDEN_CHANNEL);
            return m;
        }
    }

    // ---- typed toString inputs ----
    static final class Typed {
        static Object parse(String input) {
            if (input == null) {
                return null;
            }
            int colon = input.indexOf(':');
            String payload = input.substring(colon + 1);
            try {
                return switch (input.substring(0, colon)) {
                    case "str" -> payload;
                    case "int" -> Integer.valueOf(payload);
                    case "long" -> Long.valueOf(payload);
                    case "double" -> Double.valueOf(payload);
                    case "float" -> Float.valueOf(payload);
                    case "bool" -> Boolean.valueOf(payload);
                    case "obj" -> new StringBuilder(payload);
                    default -> other(input.substring(0, colon), payload);
                };
            } catch (NumberFormatException e) {
                throw new IllegalStateException("bad typed input: " + input, e);
            }
        }

        private static Object other(String type, String payload) {
            return switch (type) {
                case "enum" -> enumConstant(payload);
                case "kvector" -> kvector(payload);
                case "proxy" -> new LayoutOptionProxy(payload);
                case "opt" -> Objects.requireNonNull(LayoutMetaDataService.getInstance().getOptionData(payload), payload);
                case "prop" -> new Property<Object>(payload);
                default -> throw new IllegalStateException("bad typed input type: " + type);
            };
        }

        @SuppressWarnings({"unchecked", "rawtypes"})
        private static Object enumConstant(String payload) {
            int dot = payload.lastIndexOf('.');
            try {
                return Enum.valueOf((Class) Class.forName(payload.substring(0, dot)), payload.substring(dot + 1));
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException(e);
            }
        }

        private static KVector kvector(String payload) {
            String[] xy = payload.split(",");
            if (xy.length != 2) {
                throw new IllegalStateException("bad kvector input: " + payload);
            }
            try {
                return new KVector(Double.parseDouble(xy[0]), Double.parseDouble(xy[1]));
            } catch (NumberFormatException e) {
                throw new IllegalStateException("bad kvector input: " + payload, e);
            }
        }
    }

    // ---- converter rows ----
    static final class Converters {
        private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
        private final Injector injector;
        private final IValueConverterService service;

        Converters(Injector injector) {
            this.injector = injector;
            this.service = injector.getInstance(IValueConverterService.class);
        }

        Map<String, Object> row(String converter, String op, String rawInput) {
            String input = Escapes.input(rawInput);
            Map<String, Object> m = map();
            m.put("converter", converter);
            m.put("op", op);
            m.put("input", input);
            try {
                m.put("output", run(converter, op, input));
            } catch (Exception e) {
                m.put("error", thrown(e));
            }
            return m;
        }

        private Object run(String converter, String op, String input) throws Exception {
            return switch (converter) {
                case "Document" -> Describe.document(injector, input);
                default -> rule(converter, op, input);
            };
        }

        private Object rule(String rule, String op, String input) {
            return switch (op) {
                case "toValue" -> Describe.value(service.toValue(input, rule, null));
                case "toString" -> service.toString(Typed.parse(input), rule);
                default -> throw new IllegalStateException("bad op: " + op);
            };
        }

        private static Map<String, Object> thrown(Exception e) {
            Map<String, Object> m = map();
            m.put("cls", e.getClass().getName());
            m.put("msg", e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>"));
            if (e instanceof ValueConverterWithValueException v) {
                m.put("value", Describe.value(v.getValue()));
            }
            return m;
        }
    }

    // ---- result descriptions ----
    static final class Describe {
        static Object value(Object v) {
            if (v == null) {
                return null;
            }
            Map<String, Object> m = map();
            if (v instanceof IProperty<?> p) {
                m.put(CLASS, v.getClass().getName());
                m.put("id", p.getId());
            } else {
                m.put(CLASS, v.getClass().getName());
                m.put(TEXT, String.valueOf(v));
            }
            return m;
        }

        static Object document(Injector injector, String property) throws IOException {
            Resource resource = injector.getInstance(XtextResourceSet.class)
                .createResource(URI.createURI("inmemory:/vector.elkj"));
            resource.load(new ByteArrayInputStream(("{layoutOptions: {" + property + "}}").getBytes(StandardCharsets.UTF_8)), null);
            Map<String, Object> m = map();
            m.put("errors", errors(resource));
            m.put("entry", resource.getContents().isEmpty() ? null : entry((ElkNode) resource.getContents().get(0)));
            return m;
        }

        private static List<Object> errors(Resource resource) {
            List<Object> errors = new ArrayList<>();
            for (Resource.Diagnostic d : resource.getErrors()) {
                Map<String, Object> e = map();
                e.put("line", d.getLine());
                e.put("msg", d.getMessage());
                errors.add(e);
            }
            return errors;
        }

        private static Object entry(ElkNode root) {
            for (Map.Entry<IProperty<?>, Object> e : root.getProperties()) {
                Map<String, Object> m = map();
                m.put("key", value(e.getKey()));
                m.put("value", value(e.getValue()));
                return m;
            }
            return null;
        }
    }
}
