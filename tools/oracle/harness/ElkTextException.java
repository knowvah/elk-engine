// SPDX-License-Identifier: EPL-2.0

/** A syntax or linking error reported by the Xtext resource for an .elkt model. */
final class ElkTextException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    ElkTextException(final String message) {
        super(message);
    }
}
