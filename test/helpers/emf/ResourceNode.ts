// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../src/emf/common/util/EList.js';
import type { EClass } from '../../../src/emf/ecore/EClass.js';
import { BasicEObjectImpl } from '../../../src/emf/ecore/impl/BasicEObjectImpl.js';
import type { InternalEObject } from '../../../src/emf/ecore/InternalEObject.js';
import { EObjectContainmentWithInverseEList } from '../../../src/emf/ecore/util/EObjectContainmentWithInverseEList.js';

export const CHILDREN = 0;
export const PARENT = 1;
const NODE_CLASS: EClass = { getName: () => 'ElkNode' };

/** A containment tree node (`children` with opposite `parent`) for resource and proxy tests. */
export class ResourceNode extends BasicEObjectImpl {
  readonly children = new EObjectContainmentWithInverseEList<ResourceNode>(this, CHILDREN, PARENT);

  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return NODE_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.children];
  }

  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case CHILDREN:
        this.children.basicAdd(otherEnd as ResourceNode);
        return;
      case PARENT:
        if (this.eInternalContainer() !== null) {
          this.eBasicRemoveFromContainer();
        }
        this.eBasicSetContainer(otherEnd, featureID);
        return;
      default:
        super.eInverseAdd(otherEnd, featureID);
    }
  }

  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case CHILDREN:
        this.children.basicRemove(otherEnd as ResourceNode);
        return;
      case PARENT:
        this.eBasicSetContainer(null, featureID);
        return;
      default:
        super.eInverseRemove(otherEnd, featureID);
    }
  }

  eBasicRemoveFromContainerFeature(): void {
    (this.eInternalContainer() as InternalEObject).eInverseRemove(this, CHILDREN);
  }

  protected override javaClassName(): string {
    return `ResourceNode(${this.id})`;
  }
}
