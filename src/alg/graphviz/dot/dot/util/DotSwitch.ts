// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../../emf/ecore/EObject.js';
import type { Attribute } from '../Attribute.js';
import type { AttributeStatement } from '../AttributeStatement.js';
import { DotPackage, isDotEClass } from '../DotPackage.js';
import type { EdgeStatement } from '../EdgeStatement.js';
import type { EdgeTarget } from '../EdgeTarget.js';
import type { Graph } from '../Graph.js';
import type { GraphvizModel } from '../GraphvizModel.js';
import type { Node } from '../Node.js';
import type { NodeStatement } from '../NodeStatement.js';
import type { Port } from '../Port.js';
import type { Statement } from '../Statement.js';
import type { Subgraph } from '../Subgraph.js';

/**
 * The Switch for the model's inheritance hierarchy. It supports the call `doSwitch(object)` to invoke the
 * `caseXXX` method for each class of the model, starting with the actual class of the object and proceeding
 * up the inheritance hierarchy until a non-null result is returned, which is the result of the switch.
 *
 * Java extends EMF's `Switch<T>`; its `doSwitch(EObject)` and `defaultCase` are folded in here. The static
 * `modelPackage` field and the constructor that sets it are not ported: `isSwitchFor(ePackage)` becomes
 * `isDotEClass(eClass)`, and an object of another package goes straight to `defaultCase` (EMF walks the
 * supertypes of a foreign class, none of which is in this package). The generated `doSwitch(int, EObject)` is
 * `doSwitchClassifierID` (translation rule 6.5) and is split in two along the root classes and the statement
 * kinds to keep each `switch` under the complexity limit; the cases and their order are the generated ones.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/util/DotSwitch.java
 * @see org.eclipse.emf.ecore.util.Switch
 */
export class DotSwitch<T> {
  /**
   * Calls `caseXXX` for each class of the model until one returns a non-null result; it yields that result.
   *
   * @see org.eclipse.emf.ecore.util.Switch#doSwitch(EObject)
   */
  doSwitch(theEObject: EObject): T | null {
    const eClass = theEObject.eClass();
    return isDotEClass(eClass)
      ? this.doSwitchClassifierID(eClass.getClassifierID(), theEObject)
      : this.defaultCase(theEObject);
  }

  /**
   * The generated `doSwitch(int classifierID, EObject theEObject)`: the root classes here, the statement
   * kinds in {@link doSwitchStatementKind}.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/util/DotSwitch.java
   */
  protected doSwitchClassifierID(classifierID: number, theEObject: EObject): T | null {
    switch (classifierID) {
      case DotPackage.GRAPHVIZ_MODEL:
        return this.#orDefault(this.caseGraphvizModel(theEObject as GraphvizModel), theEObject);
      case DotPackage.GRAPH:
        return this.#orDefault(this.caseGraph(theEObject as Graph), theEObject);
      case DotPackage.STATEMENT:
        return this.#orDefault(this.caseStatement(theEObject as Statement), theEObject);
      case DotPackage.NODE:
        return this.#orDefault(this.caseNode(theEObject as Node), theEObject);
      case DotPackage.EDGE_TARGET:
        return this.#orDefault(this.caseEdgeTarget(theEObject as EdgeTarget), theEObject);
      case DotPackage.PORT:
        return this.#orDefault(this.casePort(theEObject as Port), theEObject);
      default:
        return this.#doSwitchStatementKind(classifierID, theEObject);
    }
  }

  /** The statement-kind cases of the generated `doSwitch(int, EObject)`: own case, `caseStatement`, default. */
  #doSwitchStatementKind(classifierID: number, theEObject: EObject): T | null {
    switch (classifierID) {
      case DotPackage.ATTRIBUTE:
        return this.#orStatement(this.caseAttribute(theEObject as Attribute), theEObject as Statement);
      case DotPackage.NODE_STATEMENT:
        return this.#orStatement(this.caseNodeStatement(theEObject as NodeStatement), theEObject as Statement);
      case DotPackage.EDGE_STATEMENT:
        return this.#orStatement(this.caseEdgeStatement(theEObject as EdgeStatement), theEObject as Statement);
      case DotPackage.ATTRIBUTE_STATEMENT:
        return this.#orStatement(
          this.caseAttributeStatement(theEObject as AttributeStatement),
          theEObject as Statement,
        );
      case DotPackage.SUBGRAPH:
        return this.#orStatement(this.caseSubgraph(theEObject as Subgraph), theEObject as Statement);
      default:
        return this.defaultCase(theEObject);
    }
  }

  /** `if (result == null) result = caseStatement(statement); if (result == null) result = defaultCase(theEObject);` */
  #orStatement(result: T | null, theEObject: Statement): T | null {
    return this.#orDefault(result === null ? this.caseStatement(theEObject) : result, theEObject);
  }

  /** `if (result == null) result = defaultCase(theEObject);` */
  #orDefault(result: T | null, theEObject: EObject): T | null {
    return result === null ? this.defaultCase(theEObject) : result;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Graphviz Model</em>'. */
  caseGraphvizModel(_object: GraphvizModel): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Graph</em>'. */
  caseGraph(_object: Graph): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Statement</em>'. */
  caseStatement(_object: Statement): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Attribute</em>'. */
  caseAttribute(_object: Attribute): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Node Statement</em>'. */
  caseNodeStatement(_object: NodeStatement): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Node</em>'. */
  caseNode(_object: Node): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Edge Statement</em>'. */
  caseEdgeStatement(_object: EdgeStatement): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Edge Target</em>'. */
  caseEdgeTarget(_object: EdgeTarget): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Attribute Statement</em>'. */
  caseAttributeStatement(_object: AttributeStatement): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Subgraph</em>'. */
  caseSubgraph(_object: Subgraph): T | null {
    return null;
  }

  /** Returns the result of interpreting the object as an instance of '<em>Port</em>'. */
  casePort(_object: Port): T | null {
    return null;
  }

  /**
   * Returns the result of interpreting the object as an instance of '<em>EObject</em>': the last case
   * anyway, returning null.
   *
   * @see org.eclipse.emf.ecore.util.Switch#defaultCase(EObject)
   */
  defaultCase(_object: EObject): T | null {
    return null;
  }
}
