// SPDX-License-Identifier: EPL-2.0
import { Exception } from '../lang/Exception.js';

/**
 * Java `java.io.IOException`. `javaName` is the class name `Throwable.toString` prints (T7).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/IOException.html
 */
export class IOException extends Exception {
  readonly javaName: string = 'java.io.IOException';

  constructor(message?: string) {
    super(message);
    this.name = 'IOException';
  }
}
