// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, G6) for the .elkt lexer and value converters: what the generated
// ANTLR InternalElkGraphLexer and the Xtext/ELK converters of org.eclipse.elk.graph.text do at the pinned ELK commit
// (Xtext 2.36.0). This program only CALLS them and records results; it embeds no ELK/Xtext implementation.
// Run: tools/vectors/elkt-vectors.sh <outDir>   (java -cp ... ElktLexerVectors.java <outDir> <tools/vectors dir>)
// Registry: the first statement isolates LayoutMetaDataService (CoreOptions only, G3, as MetaDataVectors.java).
// Inputs: <vectorsDir>/elkt-lexer-cases.txt, one row per line, "#" comments, blank lines ignored:
//   lex <escaped text>                          -> one tokens row
//   conv <converter> <op> <escaped input>       -> one converters row; the input is the rest of the line
//   Escapes decoded by this program: \n \r \t \\ and backslash-u plus four hex digits (any other backslash sequence is a hard error). The
//   input "<null>" (exactly) is Java null; an absent input is the empty string.
// Converters (the first column) and ops:
//   <rule>        any grammar rule name through IValueConverterService (ID INT STRING SIGNED_INT FLOAT QualifiedId
//                 Number PropertyKey StringValue QualifiedIdValue NumberValue BooleanValue ML_COMMENT SL_COMMENT,
//                 plus an unknown name to record the NO_OP fallback).  ops: toValue (node = null), toString.
//   Strings       org.eclipse.xtext.util.Strings, delimiter ".".  ops: convertFromJavaString/unicode|plain,
//                 convertToJavaString/unicode|plain, split/string (String delimiter), split/char (char delimiter).
//   QualifiedName ElkGraphQualifiedNameConverter.  ops: toQualifiedName (input text), toString (input
//                 "qn:seg|seg" = QualifiedName.create(segments); "qn:" = no segments; "<null>" = null).
//   Document      op parse: input "<key>: <value>" is parsed as the document "graph g\n<input>" and the first
//                 property entry of the root is read back (this is the node-dependent PropertyValue branch).
// toString inputs are typed: "<null>", "str:", "int:", "long:", "double:", "float:", "bool:", "enum:<fqcn>.<CONST>",
//   "kvector:x,y", "proxy:<text>" (LayoutOptionProxy), "opt:<optionId>" (registered LayoutOptionData),
//   "prop:<id>" (unregistered Property), "obj:<text>" (a non-String, non-Number, non-Enum object).
// Output <outDir>/graph-text-lexer.json, 2-space indent for the top level, one compact JSON row per line, trailing
// newline (non-ASCII and control characters are written as JSON u-escapes so lone surrogates survive):
//   { elkCommit, xtextVersion, registry: "core",
//     tokens:     [ { input, tokens: [ { type, text, line, hidden } ], lexError } ],
//     converters: [ { converter, op, input, output } | { converter, op, input, error: { cls, msg, value? } } ] }
//   type = InternalElkGraphParser.tokenNames[token type] ("RULE_ID", "'node'", "<invalid>" for the lexer's error
//   token, ...); line = ANTLR getLine(); hidden = channel is HIDDEN (WS, comments, error tokens); lexError = the
//   lexer's reportError fired (message text is not recorded, G5). Converter output: toString -> string|null;
//   toValue/parse -> { class, text } | { class, id } (IProperty) | { segments, text } (QualifiedName) | [string]
//   (split) | null. error.cls is the binary class name, msg getMessage() with identity hashes normalised to
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
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.text.naming.ElkGraphQualifiedNameConverter;
import org.eclipse.elk.graph.text.parser.antlr.internal.InternalElkGraphLexer;
import org.eclipse.elk.graph.text.parser.antlr.internal.InternalElkGraphParser;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.conversion.IValueConverterService;
import org.eclipse.xtext.conversion.ValueConverterWithValueException;
import org.eclipse.xtext.naming.QualifiedName;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.util.Strings;

public class ElktLexerVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String CASES = "elkt-lexer-cases.txt";
    private static final String OUT = "graph-text-lexer.json";
    private static final String NULL_INPUT = "<null>";
    private static final String CLASS = "class", TEXT = "text";

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        Injector injector = new ElkGraphStandaloneSetup().createInjectorAndDoEMFRegistration();
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
                    sb.append((char) Integer.parseInt(raw.substring(i + 1, i + 5), 16));
                    i += 5;
                } else {
                    sb.append(simple(raw.charAt(i++)));
                }
            }
            return sb.toString();
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
            InternalElkGraphLexer lexer = new InternalElkGraphLexer(new ANTLRStringStream(text)) {
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
            m.put("type", InternalElkGraphParser.tokenNames[t.getType()]);
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
            return new KVector(Double.parseDouble(xy[0]), Double.parseDouble(xy[1]));
        }
    }

    // ---- converter rows ----
    static final class Converters {
        private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
        private static final String DELIMITER = ".";
        private final Injector injector;
        private final IValueConverterService service;
        private final ElkGraphQualifiedNameConverter names;

        Converters(Injector injector) {
            this.injector = injector;
            this.service = injector.getInstance(IValueConverterService.class);
            this.names = injector.getInstance(ElkGraphQualifiedNameConverter.class);
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
                case "Strings" -> strings(op, input);
                case "QualifiedName" -> qualifiedName(op, input);
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

        private static Object strings(String op, String input) {
            return switch (op) {
                case "convertFromJavaString/unicode" -> Strings.convertFromJavaString(input, true);
                case "convertFromJavaString/plain" -> Strings.convertFromJavaString(input, false);
                case "convertToJavaString/unicode" -> Strings.convertToJavaString(input, true);
                case "convertToJavaString/plain" -> Strings.convertToJavaString(input, false);
                case "split/string" -> Strings.split(input, DELIMITER);
                case "split/char" -> Strings.split(input, DELIMITER.charAt(0));
                default -> throw new IllegalStateException("bad op: " + op);
            };
        }

        private Object qualifiedName(String op, String input) {
            return switch (op) {
                case "toQualifiedName" -> Describe.value(names.toQualifiedName(input));
                case "toString" -> names.toString(segments(input));
                default -> throw new IllegalStateException("bad op: " + op);
            };
        }

        private static QualifiedName segments(String input) {
            if (input == null) {
                return null;
            }
            String payload = input.substring("qn:".length());
            return QualifiedName.create(payload.isEmpty() ? new String[0] : payload.split("\\|", -1));
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
            if (v instanceof QualifiedName q) {
                m.put("segments", q.getSegments());
                m.put(TEXT, q.toString());
            } else if (v instanceof IProperty<?> p) {
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
                .createResource(URI.createURI("inmemory:/vector.elkt"));
            resource.load(new ByteArrayInputStream(("graph g\n" + property).getBytes(StandardCharsets.UTF_8)), null);
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
