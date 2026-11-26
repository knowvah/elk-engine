// SPDX-License-Identifier: EPL-2.0
// The rows of test/golden/refs/java/graphviz-dot-export.json and their replay on the port
// (tools/vectors/DotExportVectors.java header): the scenario `.elkt` through ElkGraphText.load under the
// CoreOptions-only registry, the row's properties, the exporter, then the serializer (export) or the parser and
// transferLayout (transfer).
import { readFileSync } from 'node:fs';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import { parse } from '../../src/alg/graphviz/dot/parser/GraphvizDotParser.js';
import { createValueConverterService } from '../../src/alg/graphviz/dot/parser/GraphvizDotValueConverters.js';
import { GraphvizDotSerializer } from '../../src/alg/graphviz/dot/serializer/GraphvizDotSerializer.js';
import { Command } from '../../src/alg/graphviz/dot/transform/Command.js';
import { DotExporter } from '../../src/alg/graphviz/dot/transform/DotExporter.js';
import { DotTransformationData } from '../../src/alg/graphviz/dot/transform/DotTransformationData.js';
import { NeatoModel } from '../../src/alg/graphviz/dot/transform/NeatoModel.js';
import { OverlapMode } from '../../src/alg/graphviz/dot/transform/OverlapMode.js';
import { UnsupportedGraphException } from '../../src/core/UnsupportedGraphException.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { URI } from '../../src/emf/common/util/URI.js';
import { ResourceImpl } from '../../src/emf/ecore/resource/impl/ResourceImpl.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { ClassCastException } from '../../src/java/lang/ClassCastException.js';
import { RuntimeException } from '../../src/java/lang/RuntimeException.js';
import { dumpSource, dumpTarget } from './dot-export-dump.js';
import { GV_DOUBLE_IDS, Gv, LayoutMimic } from './dot-layout-mimic.js';

const REF_URL = new URL('../golden/refs/java/graphviz-dot-export.json', import.meta.url);
const VECTORS_URL = new URL('../../tools/vectors/', import.meta.url);
const SCENARIOS = 'dot-export-scenarios/';
const NPE = 'java.lang.NullPointerException';
const CCE = 'java.lang.ClassCastException';

/** A recorded exception: binary class name and `getMessage()` (identity hashes as `@<hash>`). */
export interface Thrown {
  readonly class: string;
  readonly message: string | null;
}

/** A property the row set before transform: id and `String.valueOf` text. */
export interface RowProperty {
  readonly id: string;
  readonly value: string;
}

/** The fields every row carries. */
interface RowHead {
  readonly id: string;
  readonly scenario: string;
  readonly profile: string;
  readonly exporter: 'DotExporter' | 'SplineExporter' | 'LayoutMimic';
  readonly data: readonly RowProperty[];
  readonly graph: readonly RowProperty[];
  readonly edges: readonly RowProperty[];
  readonly source: unknown;
  readonly throws?: Thrown;
}

export interface ExportRow extends RowHead {
  readonly family: 'export';
  readonly text?: string | null;
  readonly formatted?: string | null;
  readonly textThrows?: Thrown;
  readonly formattedThrows?: Thrown;
  readonly model?: unknown;
}

export interface TransferRow extends RowHead {
  readonly family: 'transfer';
  readonly layout: string;
  readonly parseErrors: readonly { readonly line: number; readonly message: string }[];
  readonly transferred: boolean;
}

export interface ExportRef {
  readonly rowCounts: { readonly export: number; readonly transfer: number };
  readonly rows: readonly (ExportRow | TransferRow)[];
}

// The recorder's first statement: the CoreOptions-only registry (G3), which also registers ElkReflect's clone
// functions (the PADDING default that transferLayout and the hierarchy branch store is cloned through them).
LayoutMetaDataService.getInstance();

export const REF = JSON.parse(readFileSync(REF_URL, 'utf8')) as ExportRef;

/** DotExporter with the protected USE_SPLINES set, as the recorder's SplineExporter (proves the subclass seam). */
export class SplineExporter extends DotExporter {
  override transform(transData: DotTransformationData<ElkNode, GraphvizModel>): void {
    transData.setProperty(DotExporter.USE_SPLINES, true);
    super.transform(transData);
  }
}

type Parser = (text: string) => unknown;

/** The property ids a row can set, with the parser of their `String.valueOf` text. */
const PROPERTIES: ReadonlyMap<string, readonly [IProperty<unknown>, Parser]> = new Map(
  (
    [
      [DotExporter.COMMAND, (t: string) => Command.valueOf(t.toUpperCase())],
      [DotExporter.USE_EDGE_IDS, (t: string) => t === 'true'],
      [DotExporter.HIERARCHY, (t: string) => t === 'true'],
      [DotExporter.TRANSFORM_NODE_LAYOUT, (t: string) => t === 'true'],
      [DotExporter.TRANSFORM_EDGE_LAYOUT, (t: string) => t === 'true'],
      [DotExporter.TRANSFORM_NODE_LABELS, (t: string) => t === 'true'],
      [DotExporter.ADAPT_PORT_POSITIONS, (t: string) => t === 'true'],
      [CoreOptions.DIRECTION, (t: string) => Direction.valueOf(t)],
      [CoreOptions.HIERARCHY_HANDLING, (t: string) => HierarchyHandling.valueOf(t)],
      [CoreOptions.INTERACTIVE, (t: string) => t === 'true'],
      [CoreOptions.EDGE_ROUTING, (t: string) => EdgeRouting.valueOf(t)],
      [CoreOptions.SPACING_NODE_NODE, Number],
      [CoreOptions.RANDOM_SEED, Number],
      [CoreOptions.SEPARATE_CONNECTED_COMPONENTS, (t: string) => t === 'true'],
      [Gv.ADAPT_PORT_POSITIONS, (t: string) => t === 'true'],
      [Gv.CONCENTRATE, (t: string) => t === 'true'],
      [Gv.EPSILON, Number],
      [Gv.ITERATIONS_FACTOR, Number],
      [Gv.LABEL_ANGLE, Number],
      [Gv.LABEL_DISTANCE, Number],
      [Gv.LAYER_SPACING_FACTOR, Number],
      [Gv.MAXITER, Number],
      [Gv.NEATO_MODEL, (t: string) => NeatoModel.valueOf(t)],
      [Gv.OVERLAP_MODE, (t: string) => OverlapMode.valueOf(t)],
    ] as readonly (readonly [IProperty<unknown>, Parser])[]
  ).map(([p, parser]) => [p.getId(), [p, parser]] as const),
);

/** The `Double` properties a row can set: G writes their values as `Double.toString`. */
export const DOUBLE_IDS: ReadonlySet<string> = new Set([...GV_DOUBLE_IDS, CoreOptions.SPACING_NODE_NODE.getId()]);

function setAll(holder: IPropertyHolder, props: readonly RowProperty[]): void {
  for (const { id, value } of props) {
    const entry = PROPERTIES.get(id);
    if (entry === undefined) throw new Error(`row property ${id} has no parser`);
    holder.setProperty(entry[0], entry[1](value));
  }
}

function edgesOf(node: ElkNode, out: ElkEdge[]): ElkEdge[] {
  out.push(...node.getContainedEdges());
  for (const child of node.getChildren()) edgesOf(child, out);
  return out;
}

/** The recorder's `load` (a fresh load per row, since transform mutates the graph). */
function load(scenario: string): ElkNode {
  const result = ElkGraphText.load(readFileSync(new URL(`${SCENARIOS}${scenario}.elkt`, VECTORS_URL), 'utf8'));
  if (result.errors.length > 0 || result.root === null) {
    throw new Error(`${scenario}: ${result.errors[0]?.message ?? 'no root'}`);
  }
  return result.root;
}

/** The recorder's `prepare`: graph properties on the root, edge properties on every edge, data properties. */
function prepare(root: ElkNode, row: RowHead): DotTransformationData<ElkNode, GraphvizModel> {
  setAll(root, row.graph);
  for (const edge of edgesOf(root, [])) setAll(edge, row.edges);
  const data = new DotTransformationData<ElkNode, GraphvizModel>();
  data.setSourceGraph(root);
  setAll(data, row.data);
  return data;
}

function exporter(kind: RowHead['exporter']): DotExporter {
  switch (kind) {
    case 'DotExporter':
      return new DotExporter();
    case 'SplineExporter':
      return new SplineExporter();
    default:
      return new LayoutMimic();
  }
}

/** What a run of the port gave, in the row's terms; `throws` holds the error the port raised. */
export interface Replayed {
  readonly source: unknown;
  readonly throws?: unknown;
  readonly text?: string | null;
  readonly formatted?: string | null;
  readonly textThrows?: unknown;
  readonly formattedThrows?: unknown;
  readonly model?: unknown;
  readonly parseLines?: readonly number[];
  readonly transferred?: boolean;
}

const OUTPUT_URI = 'output.graphviz_dot';
const SERVICES = createValueConverterService();
const SERIALIZER = new GraphvizDotSerializer(SERVICES);

/** The recorder's `serialize`: the model alone in a fresh resource "output.graphviz_dot", cleared afterwards. */
function serialized(model: GraphvizModel, format: boolean): { text: string | null; error?: unknown } {
  const resource = new ResourceImpl(URI.createURI(OUTPUT_URI));
  resource.getContents().add(model);
  try {
    return { text: SERIALIZER.serialize(model, { format }) };
  } catch (error) {
    return { text: null, error };
  } finally {
    resource.getContents().clear();
  }
}

/** Replays an export row: transform, then serialize unformatted and formatted, dump the model and the source. */
export function replayExport(row: ExportRow): Replayed {
  const root = load(row.scenario);
  const data = prepare(root, row);
  try {
    exporter(row.exporter).transform(data);
  } catch (error) {
    return { throws: error, source: dumpSource(root, DOUBLE_IDS) };
  }
  const model = data.getTargetGraphs()[0] as GraphvizModel;
  const text = serialized(model, false);
  const formatted = serialized(model, true);
  return {
    text: text.text,
    formatted: formatted.text,
    ...(text.error === undefined ? {} : { textThrows: text.error }),
    ...(formatted.error === undefined ? {} : { formattedThrows: formatted.error }),
    model: dumpTarget(model),
    source: dumpSource(root, DOUBLE_IDS),
  };
}

/** Replays a transfer row: transform, parse the laid-out DOT, put it at index 0 and transfer when usable. */
export function replayTransfer(row: TransferRow): Replayed {
  const root = load(row.scenario);
  const data = prepare(root, row);
  const dotExporter = exporter(row.exporter);
  dotExporter.transform(data);
  const result = parse(readFileSync(new URL(row.layout, VECTORS_URL), 'utf8'), SERVICES);
  const parseLines = result.diagnostics.map((d) => d.line);
  const parsed = result.root;
  if (parseLines.length > 0 || parsed === null || parsed.getGraphs().isEmpty()) {
    return { parseLines, transferred: false, source: dumpSource(root, DOUBLE_IDS) };
  }
  data.getTargetGraphs()[0] = parsed;
  try {
    dotExporter.transferLayout(data);
  } catch (error) {
    return { parseLines, transferred: true, throws: error, source: dumpSource(root, DOUBLE_IDS) };
  }
  return { parseLines, transferred: true, source: dumpSource(root, DOUBLE_IDS) };
}

/** Java class -> the port's class: a NullPointerException is a `TypeError` (elkgraph-model D10). */
const CLASSES: ReadonlyMap<string, abstract new (...args: never[]) => Error> = new Map<
  string,
  abstract new (...args: never[]) => Error
>([
  [NPE, TypeError],
  [CCE, ClassCastException],
  ['java.lang.RuntimeException', RuntimeException],
  ['org.eclipse.elk.core.UnsupportedGraphException', UnsupportedGraphException],
]);
/** JDK-worded messages are JDK-version text (ref header): only the class is compared. */
const JDK_WORDED: ReadonlySet<string> = new Set([NPE, CCE]);

/**
 * The difference between a recorded exception and what the port raised, `null` when they correspond: the exact
 * port class of the Java class (not a subclass), and the message for ELK- and Xtext-worded exceptions.
 */
export function thrownDiff(expected: Thrown | undefined, actual: unknown): string | null {
  if (expected === undefined) {
    return actual === undefined ? null : `unexpected throw: ${String(actual)}`;
  }
  const cls = CLASSES.get(expected.class);
  if (cls === undefined) return `no port class for ${expected.class}`;
  if (!(actual instanceof Error) || actual.constructor !== cls) {
    return `expected ${expected.class}, got ${actual instanceof Error ? actual.constructor.name : String(actual)}`;
  }
  if (!JDK_WORDED.has(expected.class) && actual.message !== (expected.message ?? '')) {
    return `message: expected ${JSON.stringify(expected.message)}, got ${JSON.stringify(actual.message)}`;
  }
  return null;
}
