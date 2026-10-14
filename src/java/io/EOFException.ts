// SPDX-License-Identifier: EPL-2.0
import { IOException } from './IOException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/EOFException.html */
export class EOFException extends IOException {
  override readonly javaName: string = 'java.io.EOFException';

  constructor(message?: string) {
    super(message);
    this.name = 'EOFException';
  }
}
