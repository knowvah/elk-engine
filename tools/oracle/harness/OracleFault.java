// SPDX-License-Identifier: EPL-2.0

/** A harness-side fault (unknown variant, algorithm or option); reported as oracle-error. */
final class OracleFault extends RuntimeException {

    private static final long serialVersionUID = 1L;

    OracleFault(final String message) {
        super(message);
    }
}
