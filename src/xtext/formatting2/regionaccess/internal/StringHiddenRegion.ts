// SPDX-License-Identifier: EPL-2.0
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import { AbstractHiddenRegion } from './AbstractHiddenRegion.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/StringHiddenRegion.java */
export class StringHiddenRegion extends AbstractHiddenRegion {
  private undefined = true;

  constructor(access: ITextRegionAccess) {
    super(access);
  }

  isUndefined(): boolean {
    return this.undefined;
  }

  /** Java protected `setUndefined`: only `acceptComment`/`acceptWhitespace` call it (not reached, see above). */
  setUndefined(undefined: boolean): void {
    this.undefined = undefined;
  }
}
