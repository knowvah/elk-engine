// SPDX-License-Identifier: EPL-2.0
import java.util.List;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * One parsed case.
 *
 * @param id the case id
 * @param input the model file
 * @param mode {@code layout} or {@code parse}
 * @param algorithm the full algorithm id to retarget to, or null
 * @param variant the key in variants.json, or null
 */
record CaseSpec(String id, String input, String mode, String algorithm, String variant) {

    static final String MODE_LAYOUT = "layout";
    static final String MODE_PARSE = "parse";

    private static final String ALGORITHM = "algorithm";
    private static final String VARIANT = "variant";

    /** Parses a case-file line; throws if it is not a valid case. */
    static CaseSpec parse(final String line) {
        JsonObject json = JsonParser.parseString(line).getAsJsonObject();
        for (String key : List.of("id", "input", "mode")) {
            requireString(json, key);
        }
        String mode = json.get("mode").getAsString();
        if (!MODE_LAYOUT.equals(mode) && !MODE_PARSE.equals(mode)) {
            throw new IllegalArgumentException("unknown mode '" + mode + "'");
        }
        return new CaseSpec(json.get("id").getAsString(), json.get("input").getAsString(), mode,
                optionalString(json, ALGORITHM), optionalString(json, VARIANT));
    }

    private static void requireString(final JsonObject json, final String key) {
        if (!json.has(key) || !json.get(key).isJsonPrimitive()) {
            throw new IllegalArgumentException("case lacks string field '" + key + "'");
        }
    }

    private static String optionalString(final JsonObject json, final String key) {
        if (!json.has(key) || json.get(key).isJsonNull()) {
            return null;
        }
        requireString(json, key);
        return json.get(key).getAsString();
    }
}
