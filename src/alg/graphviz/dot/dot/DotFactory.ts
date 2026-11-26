// SPDX-License-Identifier: EPL-2.0
import { type Attribute, AttributeImpl } from './Attribute.js';
import { type AttributeStatement, AttributeStatementImpl } from './AttributeStatement.js';
import { DotPackage } from './DotPackage.js';
import { type EdgeStatement, EdgeStatementImpl } from './EdgeStatement.js';
import { type EdgeTarget, EdgeTargetImpl } from './EdgeTarget.js';
import { type Graph, GraphImpl } from './Graph.js';
import { type GraphvizModel, GraphvizModelImpl } from './GraphvizModel.js';
import { type Node, NodeImpl } from './Node.js';
import { type NodeStatement, NodeStatementImpl } from './NodeStatement.js';
import { type Port, PortImpl } from './Port.js';
import { type Statement, StatementImpl } from './Statement.js';
import { type Subgraph, SubgraphImpl } from './Subgraph.js';

/**
 * The factory of the model: a create method per non-abstract class. Java extends EMF's `EFactory`, whose
 * reflective members are not ported.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/DotFactory.java
 */
export interface DotFactory {
  /** Returns a new object of class '<em>Graphviz Model</em>'. */
  createGraphvizModel(): GraphvizModel;
  /** Returns a new object of class '<em>Graph</em>'. */
  createGraph(): Graph;
  /** Returns a new object of class '<em>Statement</em>'. */
  createStatement(): Statement;
  /** Returns a new object of class '<em>Attribute</em>'. */
  createAttribute(): Attribute;
  /** Returns a new object of class '<em>Node Statement</em>'. */
  createNodeStatement(): NodeStatement;
  /** Returns a new object of class '<em>Node</em>'. */
  createNode(): Node;
  /** Returns a new object of class '<em>Edge Statement</em>'. */
  createEdgeStatement(): EdgeStatement;
  /** Returns a new object of class '<em>Edge Target</em>'. */
  createEdgeTarget(): EdgeTarget;
  /** Returns a new object of class '<em>Attribute Statement</em>'. */
  createAttributeStatement(): AttributeStatement;
  /** Returns a new object of class '<em>Subgraph</em>'. */
  createSubgraph(): Subgraph;
  /** Returns a new object of class '<em>Port</em>'. */
  createPort(): Port;
  /** Returns the package supported by this factory (constants only in the port). */
  getDotPackage(): typeof DotPackage;
}

/**
 * An implementation of the model factory. Not ported: the reflective `create(EClass)`,
 * `createFromString`/`convertToString` and the per-enum `create*FromString`/`convert*ToString` (EMF
 * `EFactory` plumbing with no caller: the enums are read with `get`), and the deprecated static
 * `getPackage()`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java
 */
export class DotFactoryImpl implements DotFactory {
  /**
   * Creates the default factory implementation. EMF first asks `EPackage.Registry` for a registered factory;
   * the port has no registry, so that lookup finds nothing and a new factory is returned, as in Java.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java
   */
  static init(): DotFactory {
    return new DotFactoryImpl();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createGraphvizModel(): GraphvizModel {
    const graphvizModel = new GraphvizModelImpl();
    return graphvizModel;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createGraph(): Graph {
    const graph = new GraphImpl();
    return graph;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createStatement(): Statement {
    const statement = new StatementImpl();
    return statement;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createAttribute(): Attribute {
    const attribute = new AttributeImpl();
    return attribute;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createNodeStatement(): NodeStatement {
    const nodeStatement = new NodeStatementImpl();
    return nodeStatement;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createNode(): Node {
    const node = new NodeImpl();
    return node;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createEdgeStatement(): EdgeStatement {
    const edgeStatement = new EdgeStatementImpl();
    return edgeStatement;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createEdgeTarget(): EdgeTarget {
    const edgeTarget = new EdgeTargetImpl();
    return edgeTarget;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createAttributeStatement(): AttributeStatement {
    const attributeStatement = new AttributeStatementImpl();
    return attributeStatement;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createSubgraph(): Subgraph {
    const subgraph = new SubgraphImpl();
    return subgraph;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  createPort(): Port {
    const port = new PortImpl();
    return port;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/DotFactoryImpl.java */
  getDotPackage(): typeof DotPackage {
    return DotPackage;
  }
}

/**
 * The static side of the interface: `DotFactory.eINSTANCE = DotFactoryImpl.init()`, the singleton factory.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/DotFactory.java
 */
export const DotFactory: { readonly eINSTANCE: DotFactory } = Object.freeze({ eINSTANCE: DotFactoryImpl.init() });
