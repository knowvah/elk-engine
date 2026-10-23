// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the .elkr lexer: what the generated ANTLR InternalGRandomLexer of
// org.eclipse.elk.core.debug.grandom does at the pinned ELK commit (Xtext 2.36.0). This program only CALLS it and records
// results; it embeds no ELK/Xtext implementation.
// Run: tools/vectors/elkr-vectors.sh <outDir>   (java -cp ... ElkrLexerVectors.java <outDir> <tools/vectors dir>)
// Input: <vectorsDir>/elkr-lexer-cases.txt, one row per line, "#" comments, blank lines ignored:
//   lex <id> <escaped text>
//   <id> is an explicit, unique, space-free string (<family>-<n>, or corpus-<file name>); it is the stable row key.
//   The text is the rest of the line after the single space following the id (absent = empty string); it is not trimmed.
//   Escapes decoded by this program: \n \r \t \\ and backslash-u plus four hex digits (any other backslash sequence is
//   a hard error), so the cases file itself is LF-only.
// Output <outDir>/grandom-lexer.json, 2-space indent for the top level, one compact JSON row per line, trailing newline
// (non-ASCII and control characters are written as JSON u-escapes so lone surrogates survive):
//   { elkCommit, xtextVersion, tokens: [ { id, input, tokens: [ { type, text, line, offset, length, hidden } ], lexError } ] }
//   type = InternalGRandomParser.tokenNames[token type] ("RULE_ID", "'trees'", "<invalid>" for the lexer's error token,
//   ...); line = ANTLR getLine(); offset/length = the token's start index and (stop - start + 1) in UTF-16 code units;
//   hidden = channel is HIDDEN (WS, comments, error tokens); lexError = the lexer's reportError fired (message text is
//   not recorded). Recorded as the JVM produces it; nothing is interpreted.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.antlr.runtime.ANTLRStringStream;
import org.antlr.runtime.RecognitionException;
import org.antlr.runtime.Token;
import org.eclipse.elk.core.debug.grandom.parser.antlr.internal.InternalGRandomLexer;
import org.eclipse.elk.core.debug.grandom.parser.antlr.internal.InternalGRandomParser;

public class ElkrLexerVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String CASES = "elkr-lexer-cases.txt";
    private static final String OUT = "grandom-lexer.json";
    private static final String LEX = "lex ";

    public static void main(String[] args) throws IOException {
        List<Object> rows = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (String line : Files.readAllLines(Path.of(args[1], CASES), StandardCharsets.UTF_8)) {
            if (!line.isBlank() && !line.startsWith("#")) {
                rows.add(row(line, ids));
            }
        }
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"tokens\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ");
            Json.write(out, rows.get(i));
            out.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        out.append("  ]\n}\n");
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUT), out, StandardCharsets.UTF_8);
    }

    private static Map<String, Object> row(String line, Set<String> ids) {
        if (!line.startsWith(LEX)) {
            throw new IllegalStateException("bad cases row: " + line);
        }
        int space = line.indexOf(' ', LEX.length());
        String id = space < 0 ? line.substring(LEX.length()) : line.substring(LEX.length(), space);
        if (id.isEmpty() || !ids.add(id)) {
            throw new IllegalStateException("missing or duplicate id: " + line);
        }
        String text = Escapes.decode(space < 0 ? "" : line.substring(space + 1));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.putAll(Lexing.row(text));
        return m;
    }

    // ---- compact JSON writer ----
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof String s) {
                string(sb, s);
            } else if (v instanceof Map<?, ?> m) {
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
                } else if (i < raw.length() && raw.charAt(i) == 'u') {
                    sb.append(unicode(raw, i));
                    i += 5;
                } else {
                    sb.append(simple(raw, i++));
                }
            }
            return sb.toString();
        }

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

        private static char simple(String raw, int at) {
            if (at >= raw.length()) {
                throw new IllegalStateException("dangling backslash: " + raw);
            }
            return switch (raw.charAt(at)) {
                case 'n' -> '\n';
                case 'r' -> '\r';
                case 't' -> '\t';
                case '\\' -> '\\';
                default -> throw new IllegalStateException("bad escape \\" + raw.charAt(at));
            };
        }
    }

    // ---- lexer rows ----
    static final class Lexing {
        private static final int MAX_TOKENS = 10_000;

        static Map<String, Object> row(String text) {
            boolean[] error = {false};
            InternalGRandomLexer lexer = new InternalGRandomLexer(new ANTLRStringStream(text)) {
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
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("input", text);
            m.put("tokens", tokens);
            m.put("lexError", error[0]);
            return m;
        }

        private static Map<String, Object> token(Token t) {
            org.antlr.runtime.CommonToken c = (org.antlr.runtime.CommonToken) t;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", InternalGRandomParser.tokenNames[t.getType()]);
            m.put("text", t.getText());
            m.put("line", t.getLine());
            m.put("offset", c.getStartIndex());
            m.put("length", c.getStopIndex() - c.getStartIndex() + 1);
            m.put("hidden", t.getChannel() == Token.HIDDEN_CHANNEL);
            return m;
        }
    }
}
