// SPDX-License-Identifier: EPL-2.0

/** The model cannot reproduce what the generated Java registers: the cause is in the `.melk` input or the tables. */
export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelError';
  }
}

/**
 * A value needs real behaviour of a class that is not ported yet (mission stop condition 9). Extend the tables in
 * `model-ported.ts` once the class exists under `src/`.
 */
export class UnportedClassError extends ModelError {
  readonly className: string;

  constructor(className: string, what: string) {
    super(`${what} needs the class '${className}', which is not ported to src/ (stop condition 9)`);
    this.name = 'UnportedClassError';
    this.className = className;
  }
}
