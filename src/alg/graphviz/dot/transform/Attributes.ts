// SPDX-License-Identifier: EPL-2.0

/**
 * Definition of Graphviz attributes. The hidden default constructor becomes a private constructor.
 *
 * @author msp
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/Attributes.java
 */
export class Attributes {
  /** Hidden default constructor to avoid instantiation. */
  private constructor() {}

  /** Bounding box. */
  static readonly BOUNDINGBOX: string = 'bb';

  /** Comment. */
  static readonly COMMENT: string = 'comment';

  /** If true, allow edges between clusters. */
  static readonly COMPOUND: string = 'compound';

  /** If true, use edge concentrators. This merges multiedges into a single edge and causes partially parallel edges to share part of their paths. */
  static readonly CONCENTRATE: string = 'concentrate';

  /** Multiplicative scale factor used to alter the MinQuit (default = 8) and MaxIter (default = 24) parameters used during crossing minimization. */
  static readonly CROSSMIN_LIMIT: string = 'mclimit';

  /** Factor damping force motions. On each iteration, a nodes movement is limited to this factor of its potential motion. */
  static readonly DAMPING: string = 'Damping';

  /** Set edge type for drawing arrowheads. */
  static readonly EDGEDIR: string = 'dir';

  /** Preferred edge length, in inches (fdp, neato only). */
  static readonly EDGELEN: string = 'len';

  /** Terminating condition. If the length squared of all energy gradients are < epsilon, the algorithm stops. */
  static readonly EPSILON: string = 'epsilon';

  /** If true, the node size is specified by the values of the width and height attributes only and is not expanded to contain the text label. */
  static readonly FIXEDSIZE: string = 'fixedsize';

  /** Font used for text. */
  static readonly FONTNAME: string = 'fontname';

  /** Font size, in points, used for text. */
  static readonly FONTSIZE: string = 'fontsize';

  /** Text label to be placed near head of edge. */
  static readonly HEADLABEL: string = 'headlabel';

  /** Head label position, in points. */
  static readonly HEADLP: string = 'head_lp';

  /** Height of node, in inches. */
  static readonly HEIGHT: string = 'height';

  /** Text label attached to objects. */
  static readonly LABEL: string = 'label';

  /** This, along with labeldistance, determine where the headlabel (taillabel) are placed with respect to the head (tail) in polar coordinates. */
  static readonly LABELANGLE: string = 'labelangle';

  /** Multiplicative scaling factor adjusting the distance that the head label (tail label) is from the head (tail) node. */
  static readonly LABELDISTANCE: string = 'labeldistance';

  /** Label position, in points. */
  static readonly LABELPOS: string = 'lp';

  /** Specifies the name of the layout algorithm to use, such as "dot" or "neato". */
  static readonly LAYOUT: string = 'layout';

  /** Logical head of an edge. */
  static readonly LHEAD: string = 'lhead';

  /** Logical tail of an edge. */
  static readonly LTAIL: string = 'ltail';

  /** Determines if and how node overlaps should be removed (not dot). */
  static readonly OVERLAP: string = 'overlap';

  /** If true, each connected component of the graph is laid out separately, and then the graphs are packed together. */
  static readonly PACK: string = 'pack';

  /** The pad attribute specifies how much, in inches, to extend the drawing area around the minimal area needed to draw the graph. */
  static readonly PAD: string = 'pad';

  /** Position of node, or spline control points. */
  static readonly POS: string = 'pos';

  /** For graphs, this sets x and y margins of canvas, in inches. If the margin is a single double, both margins are set equal to the given value. */
  static readonly MARGIN: string = 'margin';

  /** Sets the number of iterations used. */
  static readonly MAXITER: string = 'maxiter';

  /** Specifies the minimum separation between all nodes (circo only). */
  static readonly MINDIST: string = 'mindist';

  /** Specifies how the distance matrix is computed for the input graph. */
  static readonly NEATO_MODEL: string = 'model';

  /** Minimum space between two adjacent nodes in the same rank, in inches. */
  static readonly NODESEP: string = 'nodesep';

  /** Used to set number of iterations in network simplex applications. */
  static readonly SIMPLEX_LIMIT: string = 'nslimit';

  /** Sets direction of graph layout (dot only). */
  static readonly RANKDIR: string = 'rankdir';

  /** In dot, this gives the desired rank separation, in inches. In twopi, specifies radial separation of concentric circles. (twopi, dot only) */
  static readonly RANKSEP: string = 'ranksep';

  /** Sets the aspect ratio (drawing height/drawing width) for the drawing. */
  static readonly RATIO: string = 'ratio';

  /** Specifies margin to leave around nodes when removing node overlap. */
  static readonly SEP: string = 'sep';

  /** Set the shape of a node. */
  static readonly SHAPE: string = 'shape';

  /** Controls how, and if, edges are represented. If true, edges are drawn as splines routed around nodes; if false, edges are drawn as line segments. */
  static readonly SPLINES: string = 'splines';

  /** Spring constant used in virtual physical model. */
  static readonly SPRING_CONSTANT: string = 'K';

  /** Parameter used to determine the initial layout of nodes (fdp, neato only). */
  static readonly START: string = 'start';

  /** Set style for node or edge. */
  static readonly STYLE: string = 'style';

  /** Text label to be placed near tail of edge. */
  static readonly TAILLABEL: string = 'taillabel';

  /** Tail label position, in points. */
  static readonly TAILLP: string = 'tail_lp';

  /** Weight of edge. In dot, the heavier the weight, the shorter, straighter and more vertical the edge is. */
  static readonly WEIGHT: string = 'weight';

  /** Width of node, in inches. */
  static readonly WIDTH: string = 'width';
}
