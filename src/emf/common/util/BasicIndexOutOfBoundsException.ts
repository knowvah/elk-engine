// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';

/**
 * EMF's index exception (`AbstractEList.BasicIndexOutOfBoundsException` and its `BasicEList`
 * subclass share the simple name). EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common.util.AbstractEList.BasicIndexOutOfBoundsException
 */
export class BasicIndexOutOfBoundsException extends IndexOutOfBoundsException {
  constructor(index: number, size: number) {
    super(`index=${index}, size=${size}`);
    this.name = 'BasicIndexOutOfBoundsException';
  }
}
