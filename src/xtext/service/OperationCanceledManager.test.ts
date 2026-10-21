// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { OperationCanceledException } from '../../equinox/core/runtime/OperationCanceledException.js';
import { NULL_CANCEL_INDICATOR } from '../util/CancelIndicator.js';
import { OperationCanceledError } from './OperationCanceledError.js';
import { checkCanceled, propagateAsErrorIfCancelException } from './OperationCanceledManager.js';

describe('cancellation helpers', () => {
  it('never cancels with the null indicator and cancels with a canceled one', () => {
    expect(NULL_CANCEL_INDICATOR.isCanceled()).toBe(false);
    expect(() => checkCanceled(NULL_CANCEL_INDICATOR)).not.toThrow();
    expect(() => checkCanceled({ isCanceled: () => true })).toThrow(OperationCanceledException);
  });

  it('rethrows a cancellation as an error carrying the exception, and ignores other exceptions', () => {
    const cancel = new OperationCanceledException('stop');
    try {
      propagateAsErrorIfCancelException(cancel);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(OperationCanceledError);
      expect((e as OperationCanceledError).cause).toBe(cancel);
      expect((e as OperationCanceledError).name).toBe('OperationCanceledError');
    }
    expect(propagateAsErrorIfCancelException(new Error('other'))).toBeUndefined();
    expect(cancel.message).toBe('stop');
  });
});
