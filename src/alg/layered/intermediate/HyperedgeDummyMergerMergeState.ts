// SPDX-License-Identifier: EPL-2.0

/**
 * The verdict of `HyperedgeDummyMerger.checkMergeAllowed` (the Java private static nested class `MergeState`, M15):
 * whether two long edge dummies may be merged and whether they share their long edge source and target.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HyperedgeDummyMerger.java:169
 */
export class HyperedgeDummyMergerMergeState {
  readonly allowMerge: boolean;
  readonly sameSource: boolean;
  readonly sameTarget: boolean;

  constructor(allowMerge: boolean, sameSource: boolean, sameTarget: boolean) {
    this.allowMerge = allowMerge;
    this.sameSource = sameSource;
    this.sameTarget = sameTarget;
  }
}
