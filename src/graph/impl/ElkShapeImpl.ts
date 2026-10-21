// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkShape } from '../ElkShape.js';
import { ElkGraphElementImpl } from './ElkGraphElementImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Shape</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java
 */
export abstract class ElkShapeImpl extends ElkGraphElementImpl implements ElkShape {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected static readonly HEIGHT_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected height: number = ElkShapeImpl.HEIGHT_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected static readonly WIDTH_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected width: number = ElkShapeImpl.WIDTH_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected static readonly X_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected x: number = ElkShapeImpl.X_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected static readonly Y_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected y: number = ElkShapeImpl.Y_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_SHAPE;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  getHeight(): number {
    return this.height;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setHeight(newHeight: number): void {
    this.height = newHeight;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  getWidth(): number {
    return this.width;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setWidth(newWidth: number): void {
    this.width = newWidth;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  getX(): number {
    return this.x;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setX(newX: number): void {
    this.x = newX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  getY(): number {
    return this.y;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setY(newY: number): void {
    this.y = newY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setDimensions(width: number, height: number): void {
    this.setWidth(width);
    this.setHeight(height);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java */
  setLocation(x: number, y: number): void {
    this.setX(x);
    this.setY(y);
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * `StringBuffer.append(double)` writes Java's `Double.toString`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkShapeImpl.java
   */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return (
      `${super.toString()} (height: ${doubleToString(this.height)}, width: ${doubleToString(this.width)}, ` +
      `x: ${doubleToString(this.x)}, y: ${doubleToString(this.y)})`
    );
  }
}

registerImpl('ElkShape', ElkShapeImpl);
