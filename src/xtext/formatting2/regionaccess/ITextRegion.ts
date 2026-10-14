// SPDX-License-Identifier: EPL-2.0

/**
 * An offset/length pair. Placed in `formatting2/regionaccess` because the T12 write-set is
 * `src/xtext/formatting2/**` (the Xtext type is `org.eclipse.xtext.util.ITextRegion`); only the members
 * the formatter reaches are declared (`contains(int)` and `merge` are not).
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/ITextRegion.java
 */
export interface ITextRegion {
  getOffset(): number;
  getLength(): number;
  contains(other: ITextRegion): boolean;
}
