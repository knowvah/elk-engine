// SPDX-License-Identifier: EPL-2.0
// Replays the JVM-recorded post-layout geometry (test/golden/refs/java/graph-json-transfer.json, T4; schema in the
// header of tools/vectors/TransferVectors.java) onto a TS-imported graph and compares `transferLayout`'s output with
// the JVM's `new Gson().toJson(input)` byte for byte (J6): the layout algorithms are not ported, so the geometry is
// applied from the recording and only the transfer is under test.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { Gson } from '../../src/gson/Gson.js';
import { JsonObject } from '../../src/gson/JsonObject.js';
import { JsonParser } from '../../src/gson/JsonParser.js';
import { parseDouble } from '../../src/java/lang/JavaDouble.js';
import type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import { isElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { JsonImporter } from '../../src/graph/json/JsonImporter.js';

const VECTORS_URL = new URL('../golden/refs/java/graph-json-transfer.json', import.meta.url);
const SCENARIOS_URL = new URL('../../tools/vectors/transfer-scenarios/', import.meta.url);
const CASES_FILE = 'cases.txt';
const SEED_KEY = 'seed';
const PROPERTIES_KEY = 'properties';
const EXPECTED_CASES = 13;

type Num = string;
type Point = readonly [Num, Num];
interface Box {
  readonly x: Num;
  readonly y: Num;
  readonly width: Num;
  readonly height: Num;
}
interface SectionRecord {
  readonly importedId: string | null;
  readonly identifier: string | null;
  readonly start: Point;
  readonly end: Point;
  readonly bends: readonly Point[];
  readonly incomingShape: string | null;
  readonly outgoingShape: string | null;
  readonly incomingSections: readonly number[];
  readonly outgoingSections: readonly number[];
}
interface EdgeRecord {
  readonly container: string;
  readonly junctionPoints: readonly Point[] | null;
  readonly sections: readonly SectionRecord[];
}
interface CaseRecord {
  readonly name: string;
  readonly input: string;
  readonly geometry: {
    readonly shapes: Readonly<Record<string, Box>>;
    readonly edges: Readonly<Record<string, EdgeRecord>>;
  };
  readonly transferredText: string;
}

/** The scenario's `key=value` overrides of cases.txt (TransferVectors.applyOverrides; `seed` does not touch the json). */
function overridesOf(name: string): readonly (readonly [string, string])[] {
  const text = readFileSync(new URL(CASES_FILE, SCENARIOS_URL), 'utf8');
  for (const line of text.split('\n')) {
    const tokens = line.trim().split(/\s+/);
    if (line.trim() !== '' && !line.startsWith('#') && tokens[0] === name) {
      return tokens
        .slice(2)
        .map((t): readonly [string, string] => [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)])
        .filter(([k]) => k !== SEED_KEY);
    }
  }
  throw new Error(`no case ${name} in ${CASES_FILE}`);
}

function loadInput(c: CaseRecord): JsonObject {
  const input = JsonParser.parseString(readFileSync(new URL(c.input, SCENARIOS_URL), 'utf8')) as JsonObject;
  for (const [key, value] of overridesOf(c.name)) {
    if (!input.has(PROPERTIES_KEY)) input.add(PROPERTIES_KEY, new JsonObject());
    (input.get(PROPERTIES_KEY) as JsonObject).addProperty(key, value);
  }
  return input;
}

/** Shape keys as TransferVectors.recordNode builds them: root = identifier, child = parentKey/id, port = nodeKey/id. */
function shapeKeys(root: ElkNode): Map<string, ElkConnectableShape> {
  const keys = new Map<string, ElkConnectableShape>();
  const visit = (node: ElkNode, key: string): void => {
    keys.set(key, node);
    for (const port of node.getPorts()) keys.set(`${key}/${port.getIdentifier()}`, port);
    for (const child of node.getChildren()) visit(child, `${key}/${child.getIdentifier()}`);
  };
  visit(root, root.getIdentifier() as string);
  return keys;
}

function applyBox(shape: ElkShape, box: Box): void {
  shape.setX(parseDouble(box.x));
  shape.setY(parseDouble(box.y));
  shape.setWidth(parseDouble(box.width));
  shape.setHeight(parseDouble(box.height));
}

/** Node, port and label boxes: labels are `ownerKey#index` (edge labels: `edge:<id>#index`). */
function applyShapes(
  root: ElkNode,
  keys: Map<string, ElkConnectableShape>,
  shapes: Readonly<Record<string, Box>>,
): void {
  const owners = new Map<string, ElkGraphElement>(keys);
  for (const element of ElkGraphUtil.propertiesSkippingIteratorFor(root, true)) {
    if (isElkEdge(element)) owners.set(`edge:${element.getIdentifier()}`, element);
  }
  for (const [key, box] of Object.entries(shapes)) {
    const hash = key.lastIndexOf('#');
    const target =
      hash < 0
        ? (keys.get(key) as ElkShape)
        : (owners.get(key.slice(0, hash)) as ElkGraphElement).getLabels().get(Number(key.slice(hash + 1)));
    applyBox(target, box);
  }
}

function importedSections(root: ElkNode): Map<string, ElkEdgeSection> {
  const sections = new Map<string, ElkEdgeSection>();
  for (const element of ElkGraphUtil.propertiesSkippingIteratorFor(root, true)) {
    if (isElkEdge(element)) {
      for (const s of element.getSections()) sections.set(s.getIdentifier() as string, s);
    }
  }
  return sections;
}

function applySection(
  edge: ElkEdge,
  record: SectionRecord,
  imported: Map<string, ElkEdgeSection>,
  keys: Map<string, ElkConnectableShape>,
): ElkEdgeSection {
  const section =
    record.importedId === null
      ? ElkGraphUtil.createEdgeSection(edge)
      : (imported.get(record.importedId) as ElkEdgeSection);
  if (record.importedId !== null) edge.getSections().add(section);
  section.setIdentifier(record.identifier);
  section.setStartLocation(parseDouble(record.start[0]), parseDouble(record.start[1]));
  section.setEndLocation(parseDouble(record.end[0]), parseDouble(record.end[1]));
  section.getBendPoints().clear();
  for (const [x, y] of record.bends) ElkGraphUtil.createBendPoint(section, parseDouble(x), parseDouble(y));
  section.setIncomingShape(record.incomingShape === null ? null : (keys.get(record.incomingShape) ?? null));
  section.setOutgoingShape(record.outgoingShape === null ? null : (keys.get(record.outgoingShape) ?? null));
  return section;
}

function applyEdge(
  edge: ElkEdge,
  record: EdgeRecord,
  imported: Map<string, ElkEdgeSection>,
  keys: Map<string, ElkConnectableShape>,
): void {
  edge.setContainingNode(keys.get(record.container) as ElkNode);
  for (const s of edge.getSections()) {
    s.getIncomingSections().clear();
    s.getOutgoingSections().clear();
  }
  edge.getSections().clear();
  const sections = record.sections.map((r) => applySection(edge, r, imported, keys));
  record.sections.forEach((r, i) => {
    for (const j of r.incomingSections) sections[i]?.getIncomingSections().add(sections[j] as ElkEdgeSection);
    for (const j of r.outgoingSections) sections[i]?.getOutgoingSections().add(sections[j] as ElkEdgeSection);
  });
  if (record.junctionPoints !== null) {
    const chain = new KVectorChain();
    for (const [x, y] of record.junctionPoints) chain.add(new KVector(parseDouble(x), parseDouble(y)));
    edge.setProperty(CoreOptions.JUNCTION_POINTS, chain);
  }
}

function applyGeometry(root: ElkNode, geometry: CaseRecord['geometry']): void {
  const keys = shapeKeys(root);
  const imported = importedSections(root);
  applyShapes(root, keys, geometry.shapes);
  const edges = [...ElkGraphUtil.propertiesSkippingIteratorFor(root, true)].filter(isElkEdge);
  for (const edge of edges) {
    applyEdge(edge, geometry.edges[edge.getIdentifier() as string] as EdgeRecord, imported, keys);
  }
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { cases: CaseRecord[] };

describe('transferLayout replay of the JVM-recorded geometry', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('covers every recorded case', () => {
    expect(vectors.cases).toHaveLength(EXPECTED_CASES);
  });

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s is byte-identical', (_name, c) => {
    const input = loadInput(c);
    const importer = new JsonImporter();
    const root = importer.transform(input);

    applyGeometry(root, c.geometry);
    importer.transferLayout(root);

    expect(new Gson().toJson(input)).toBe(c.transferredText);
  });
});
