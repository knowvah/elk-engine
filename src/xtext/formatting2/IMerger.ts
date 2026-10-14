// SPDX-License-Identifier: EPL-2.0

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IMerger.java */
export interface IMerger<T> {
  merge(conflicting: readonly T[]): T | null;
}
