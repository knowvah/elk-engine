// SPDX-License-Identifier: EPL-2.0

/**
 * The token types and converter rule names of the grammar that the shared `ParseSession` helpers
 * (`identifier`, `number`) refer to.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface SessionVocabulary {
  readonly idToken: string;
  readonly signedIntToken: string;
  readonly floatToken: string;
  readonly idRule: string;
  readonly numberRule: string;
}
