// SPDX-License-Identifier: EPL-2.0
import com.google.gson.JsonObject;

/**
 * One case outcome, printed as a JSON line on stdout.
 *
 * @param id the case id
 * @param status {@code ok}, {@code throws} or {@code oracle-error}
 * @param exceptionClass the exception class name, or null when ok
 * @param message the exception message, or null
 * @param ms the elapsed milliseconds
 */
record CaseResult(String id, String status, String exceptionClass, String message, long ms) {

    static final String OK = "ok";
    static final String THROWS = "throws";
    static final String ORACLE_ERROR = "oracle-error";

    String toJsonLine() {
        JsonObject json = new JsonObject();
        json.addProperty("id", id);
        json.addProperty("status", status);
        if (exceptionClass != null) {
            JsonObject exception = new JsonObject();
            exception.addProperty("class", exceptionClass);
            exception.addProperty("message", message);
            json.add("exception", exception);
        }
        json.addProperty("ms", ms);
        return json.toString();
    }
}
