// SPDX-License-Identifier: EPL-2.0
import { type LineSource, nodeModelLineSource } from '../../../../xtext/parser/LineSource.js';
import { SyntaxFailure } from '../../../../xtext/parser/SyntaxFailure.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import { TokenCursor } from '../../../../xtext/parser/TokenCursor.js';
import { Configuration } from '../gRandom/Configuration.js';
import { ConstraintType } from '../gRandom/ConstraintType.js';
import { Edges } from '../gRandom/Edges.js';
import { Flow } from '../gRandom/Flow.js';
import { FlowType } from '../gRandom/FlowType.js';
import { Form } from '../gRandom/Form.js';
import { Formats } from '../gRandom/Formats.js';
import { Hierarchy } from '../gRandom/Hierarchy.js';
import { Nodes } from '../gRandom/Nodes.js';
import { Ports } from '../gRandom/Ports.js';
import { RandGraph } from '../gRandom/RandGraph.js';
import { Side } from '../gRandom/Side.js';
import { Size } from '../gRandom/Size.js';
import { tokenizeWithDiagnostics } from './GRandomLexer.js';
import {
  type GRandomDiagnostic,
  type GRandomPositions,
  GRandomValueRules,
  type GroupMember,
  Tok,
  unorderedGroup,
} from './GRandomParserElements.js';
import { GRandomTokenType } from './GRandomTokenType.js';

export { GRandomPositions } from './GRandomParserElements.js';
export type { GRandomDiagnostic, GRandomPosition } from './GRandomParserElements.js';

const LEXER_ERROR_MESSAGE = 'The lexer could not tokenize the input.';

/** The result of parsing a `.elkr` document. */
export interface GRandomParseResult {
  /** The model, `null` for a document without any token; partial after a syntax error. */
  readonly model: RandGraph | null;
  /** The first syntax error (parsing stops there; presence only, D2) or the lexer error. */
  readonly syntaxErrors: readonly GRandomDiagnostic[];
  /** Value-converter failures in source order; the failed feature stays unset. */
  readonly conversionErrors: readonly GRandomDiagnostic[];
  /** The source position of each recorded (object, feature) assignment; see {@link GRandomPositions}. */
  readonly positions: GRandomPositions;
}

/**
 * Hand-written recursive-descent parser for `GRandom.xtext`, one method per parser rule with Xtext's LL decisions:
 * an unordered group takes each member at most once, in any order.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/GRandom.xtext
 */
export class GRandomParser {
  readonly #cursor: TokenCursor;
  readonly #values: GRandomValueRules;

  constructor(cursor: TokenCursor, values: GRandomValueRules) {
    this.#cursor = cursor;
    this.#values = values;
  }

  /** `RandGraph: (configs+=Configuration)*`, followed by the end of the file. */
  parseRandGraph(graph: RandGraph): void {
    while (this.#cursor.type() === Tok.GENERATE) {
      this.parseConfiguration(graph);
    }
    this.#cursor.expect(Tok.EOF);
  }

  /**
   * `Configuration: 'generate' samples=INT form=Form ('{' (...unordered...) '}')?`. The configuration joins `graph`
   * once its header is parsed, so a syntax error in the body leaves it, partial, in the model (as Xtext's
   * recovered model does).
   */
  parseConfiguration(graph: RandGraph): Configuration {
    const config = new Configuration();
    this.#cursor.expect(Tok.GENERATE);
    this.#values.intTerminal((v) => config.setSamples(v));
    config.setForm(this.#values.enumLiteral((l) => Form.get(l), 'RULE_FORM'));
    graph.getConfigs().push(config);
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, this.#configurationMembers(config));
      this.#cursor.expect(Tok.RBRACE);
    }
    return config;
  }

  #configurationMembers(config: Configuration): GroupMember[] {
    return [
      this.#rule(Tok.NODES, () => config.setNodes(this.parseNodes())),
      this.#rule(Tok.EDGES, () => config.setEdges(this.parseEdges())),
      this.#flag(Tok.MAX_WIDTH, config, 'mW', () => {
        config.setMW(true);
        this.#assigned(() => this.#values.integer((v) => config.setMaxWidth(v)));
      }),
      this.#flag(Tok.MAX_DEGREE, config, 'mD', () => {
        config.setMD(true);
        this.#assigned(() => this.#values.integer((v) => config.setMaxDegree(v)));
      }),
      this.#flag(Tok.PARTITION_FRACTION, config, 'pF', () => {
        config.setPF(true);
        this.#assigned(() => config.setFraction(this.#values.doubleQuantity()));
      }),
      this.#rule(Tok.HIERARCHY, () => config.setHierarchy(this.parseHierarchy())),
      this.#member(Tok.SEED, () => this.#assigned(() => this.#values.integer((v) => config.setSeed(v)))),
      this.#member(Tok.FORMAT, () =>
        this.#assigned(() => config.setFormat(this.#values.enumLiteral((l) => Formats.get(l), 'RULE_FORMATS'))),
      ),
      this.#member(Tok.FILENAME, () => this.#assigned(() => this.#values.stringTerminal((v) => config.setFilename(v)))),
    ];
  }

  /** `Hierarchy: {Hierarchy} 'hierarchy' ('{' (...unordered...) '}')?`. */
  parseHierarchy(): Hierarchy {
    const hierarchy = new Hierarchy();
    this.#cursor.expect(Tok.HIERARCHY);
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, [
        this.#member(Tok.LEVELS, () => this.#assigned(() => hierarchy.setLevels(this.#values.doubleQuantity()))),
        this.#member(Tok.CROSS_HIERARCHY_EDGES, () =>
          this.#assigned(() => hierarchy.setEdges(this.#values.doubleQuantity())),
        ),
        this.#member(Tok.COMPOUND_NODES, () =>
          this.#assigned(() => hierarchy.setNumHierarchNodes(this.#values.doubleQuantity())),
        ),
        this.#member(Tok.CROSS_HIERARCHY_RELATIVE_EDGES, () =>
          this.#assigned(() => hierarchy.setCrossHierarchRel(this.#values.doubleQuantity())),
        ),
      ]);
      this.#cursor.expect(Tok.RBRACE);
    }
    return hierarchy;
  }

  /** `Edges: 'edges' (density?='density' | total?='total' | relative?='relative' | outbound?='outgoing') '=' ...`. */
  parseEdges(): Edges {
    const edges = new Edges();
    this.#cursor.expect(Tok.EDGES);
    this.#edgeKind(edges);
    this.#cursor.expect(Tok.EQUALS);
    edges.setNEdges(this.#values.doubleQuantity());
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, [
        this.#member(Tok.LABELS, () => edges.setLabels(true)),
        this.#member(Tok.SELF_LOOPS, () => edges.setSelfLoops(true)),
      ]);
      this.#cursor.expect(Tok.RBRACE);
    }
    return edges;
  }

  #edgeKind(edges: Edges): void {
    const setters: Readonly<Record<string, () => void>> = {
      [Tok.DENSITY]: () => edges.setDensity(true),
      [Tok.TOTAL]: () => edges.setTotal(true),
      [Tok.RELATIVE]: () => edges.setRelative(true),
      [Tok.OUTGOING_EDGES]: () => edges.setOutbound(true),
    };
    const set = setters[this.#cursor.type()];
    if (set === undefined) {
      throw this.#cursor.mismatch(Tok.DENSITY);
    }
    this.#cursor.next();
    set();
  }

  /** `Nodes: {Nodes} 'nodes' '=' nNodes=DoubleQuantity ('{' (...unordered...) '}')?`. */
  parseNodes(): Nodes {
    const nodes = new Nodes();
    this.#cursor.expect(Tok.NODES);
    this.#cursor.expect(Tok.EQUALS);
    nodes.setNNodes(this.#values.doubleQuantity());
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, [
        this.#rule(Tok.PORTS, () => nodes.setPorts(this.parsePorts())),
        this.#member(Tok.LABELS, () => nodes.setLabels(true)),
        this.#rule(Tok.SIZE, () => nodes.setSize(this.parseSize())),
        this.#member(Tok.REMOVE_ISOLATED, () => nodes.setRemoveIsolated(true)),
      ]);
      this.#cursor.expect(Tok.RBRACE);
    }
    return nodes;
  }

  /** `Size: {Size} ('size' ('{' ((height ...)? & (width ...)?) '}')?)`. */
  parseSize(): Size {
    const size = new Size();
    this.#cursor.expect(Tok.SIZE);
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, [
        this.#member(Tok.HEIGHT, () => this.#assigned(() => size.setHeight(this.#values.doubleQuantity()))),
        this.#member(Tok.WIDTH, () => this.#assigned(() => size.setWidth(this.#values.doubleQuantity()))),
      ]);
      this.#cursor.expect(Tok.RBRACE);
    }
    return size;
  }

  /** `Ports: {Ports} 'ports' ('{' (...unordered, with the iteration flow+=Flow...) '}')?`. */
  parsePorts(): Ports {
    const ports = new Ports();
    this.#cursor.expect(Tok.PORTS);
    if (this.#cursor.accept(Tok.LBRACE) !== null) {
      unorderedGroup(this.#cursor, [
        this.#member(Tok.LABELS, () => ports.setLabels(true)),
        this.#member(Tok.RE_USE, () => this.#assigned(() => ports.setReUse(this.#values.doubleQuantity()))),
        this.#rule(Tok.SIZE, () => ports.setSize(this.parseSize())),
        this.#member(Tok.CONSTRAINT, () =>
          this.#assigned(() =>
            ports.setConstraint(this.#values.enumLiteral((l) => ConstraintType.get(l), 'RULE_CONSTRAINT')),
          ),
        ),
        { starts: [Tok.INCOMING, Tok.OUTGOING_EDGES], parse: () => this.#flows(ports) },
      ]);
      this.#cursor.expect(Tok.RBRACE);
    }
    return ports;
  }

  #flows(ports: Ports): void {
    while (this.#cursor.type() === Tok.INCOMING || this.#cursor.type() === Tok.OUTGOING_EDGES) {
      ports.getFlow().push(this.parseFlow());
    }
  }

  /** `Flow: flowType=FlowType side=Side '=' amount=DoubleQuantity`. */
  parseFlow(): Flow {
    const flow = new Flow();
    flow.setFlowType(this.#values.enumLiteral((l) => FlowType.get(l), 'RULE_FLOWTYPE'));
    flow.setSide(this.#values.enumLiteral((l) => Side.get(l), 'RULE_SIDE'));
    this.#cursor.expect(Tok.EQUALS);
    flow.setAmount(this.#values.doubleQuantity());
    return flow;
  }

  /** A group member starting with `start`, consumed before `parse` runs. */
  #member(start: string, parse: () => void): GroupMember {
    return {
      starts: [start],
      parse: () => {
        this.#cursor.next();
        parse();
      },
    };
  }

  /** A group member like {@link #member} whose keyword token is the position of `feature` in `owner`. */
  #flag(start: string, owner: object, feature: string, parse: () => void): GroupMember {
    return {
      starts: [start],
      parse: () => {
        this.#values.mark(owner, feature, this.#cursor.next());
        parse();
      },
    };
  }

  /** A group member that is a rule call: the rule consumes its own start token. */
  #rule(start: string, parse: () => void): GroupMember {
    return { starts: [start], parse };
  }

  /** `'=' value` after a member keyword. */
  #assigned(value: () => void): void {
    this.#cursor.expect(Tok.EQUALS);
    value();
  }
}

/** The diagnostic for a lexer error that the parser did not meet: it sits on the first `<invalid>` token. */
function lexerDiagnostic(tokens: readonly Token[], lines: LineSource): GRandomDiagnostic {
  const invalid = tokens.find((t) => t.type === GRandomTokenType.INVALID);
  return {
    message: LEXER_ERROR_MESSAGE,
    line: invalid === undefined ? 1 : lines.startLine(invalid),
    offset: invalid?.offset ?? 0,
    length: invalid?.text.length ?? 1,
  };
}

/**
 * Parses `text`: the model, the first syntax error (parsing stops there; D2: presence only) and the value
 * conversion failures.
 *
 * @param text the `.elkr` source
 * @returns the parse result
 */
export function parse(text: string): GRandomParseResult {
  const lexed = tokenizeWithDiagnostics(text);
  const lines = nodeModelLineSource(text);
  const cursor = new TokenCursor(lexed.tokens, lines);
  const values = new GRandomValueRules(text, cursor, lines);
  const syntaxErrors: GRandomDiagnostic[] = [];
  const graph = new RandGraph();
  try {
    new GRandomParser(cursor, values).parseRandGraph(graph);
  } catch (e) {
    if (!(e instanceof SyntaxFailure)) {
      throw e;
    }
    const at = cursor.peek();
    syntaxErrors.push({ message: e.message, line: e.line, offset: at.offset, length: Math.max(at.text.length, 1) });
  }
  if (lexed.lexError && syntaxErrors.length === 0) {
    syntaxErrors.push(lexerDiagnostic(lexed.tokens, lines));
  }
  const hasTokens = lexed.tokens.some((t) => !t.hidden);
  return {
    model: hasTokens ? graph : null,
    syntaxErrors,
    conversionErrors: values.conversionErrors,
    positions: values.positions,
  };
}
