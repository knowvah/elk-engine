// SPDX-License-Identifier: EPL-2.0
// Branches of JsonImporterLayoutTransfer.ts that the JVM replay (test/graph-json/transfer-replay.test.ts) does not
// reach: the explicit-message throws, layout-created elements, additive writes (J5) and the coordinate modes.
// Expected values come from JsonImporter.xtend:549-864 (TransferLayoutTest itself is ported in T19).
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Gson } from '../../gson/Gson.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { JsonParser } from '../../gson/JsonParser.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { JsonImportException } from './JsonImportException.js';
import { JsonImporter } from './JsonImporter.js';

const NODES = '"children":[{"id":"a","x":1,"y":2,"width":3,"height":4},{"id":"b"}]';
const IMPLEMENTATION_ERROR = 'Severe implementation error in the Json to ElkGraph importer.';

function setup(text: string): { importer: JsonImporter; input: JsonObject; root: ElkNode } {
  const input = JsonParser.parseString(text) as JsonObject;
  const importer = new JsonImporter();
  return { importer, input, root: importer.transform(input) };
}

function child(root: ElkNode, index: number): ElkNode {
  return [...root.getChildren()][index] as ElkNode;
}

function transferred(importer: JsonImporter, root: ElkNode, input: JsonObject): string {
  importer.transferLayout(root);
  return new Gson().toJson(input);
}

function captured(fn: () => void): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('elements the import did not create', () => {
  it('rejects a node created after import', () => {
    const { importer, root } = setup(`{"id":"r",${NODES}}`);
    ElkGraphUtil.createNode(root);
    const error = captured(() => importer.transferLayout(root));
    expect(error).toBeInstanceOf(JsonImportException);
    expect((error as Error).message).toBe('Node did not exist in input.');
  });

  it('rejects a port created after import', () => {
    const { importer, root } = setup(`{"id":"r",${NODES}}`);
    ElkGraphUtil.createPort(child(root, 0));
    const error = captured(() => importer.transferLayout(root));
    expect(error).toBeInstanceOf(JsonImportException);
    expect((error as Error).message).toBe('Port did not exist in input.');
  });

  it('rejects an edge created after import', () => {
    const { importer, root } = setup(`{"id":"r",${NODES}}`);
    ElkGraphUtil.createSimpleEdge(child(root, 0), child(root, 1));
    const error = captured(() => importer.transferLayout(root));
    expect(error).toBeInstanceOf(JsonImportException);
    expect((error as Error).message).toBe('Edge did not exist in input.');
  });

  it('fails with a TypeError (Java NullPointerException) for a label created after import', () => {
    const { importer, root } = setup(`{"id":"r",${NODES}}`);
    ElkGraphUtil.createLabelWithText('new', child(root, 0));
    expect(captured(() => importer.transferLayout(root))).toBeInstanceOf(TypeError);
  });
});

describe('shape layout', () => {
  it('writes x, y, width and height of nodes additively, keeping unrelated members', () => {
    const { importer, input, root } = setup(`{"id":"r","extra":1,${NODES}}`);
    child(root, 0).setX(10.5);
    child(root, 1).setWidth(7);
    expect(transferred(importer, root, input)).toBe(
      '{"id":"r","extra":1,"children":[{"id":"a","x":10.5,"y":2.0,"width":3.0,"height":4.0},' +
        '{"id":"b","x":0.0,"y":0.0,"width":7.0,"height":0.0}],"x":0.0,"y":0.0,"width":0.0,"height":0.0}',
    );
  });

  it('adds the parent global offset in ROOT shape mode, for nodes, ports and labels', () => {
    const { importer, input, root } = setup(
      '{"id":"r","layoutOptions":{"org.eclipse.elk.json.shapeCoords":"ROOT"},"x":5,"y":6,"children":[' +
        '{"id":"a","x":10,"y":20,"ports":[{"id":"p","x":1,"y":2,"labels":[{"text":"l","x":3,"y":4}]}]}]}',
    );
    importer.transferLayout(root);
    const a = input.get('children')?.getAsJsonArray().get(0).getAsJsonObject() as JsonObject;
    const port = a.get('ports')?.getAsJsonArray().get(0).getAsJsonObject() as JsonObject;
    const label = port.get('labels')?.getAsJsonArray().get(0).getAsJsonObject() as JsonObject;
    expect([a.get('x')?.getAsDouble(), a.get('y')?.getAsDouble()]).toEqual([15, 26]);
    expect([port.get('x')?.getAsDouble(), port.get('y')?.getAsDouble()]).toEqual([16, 28]);
    expect([label.get('x')?.getAsDouble(), label.get('y')?.getAsDouble()]).toEqual([19, 32]);
  });
});

const PT = '"startPoint":{"x":1,"y":1},"endPoint":{"x":2,"y":2}';
const EDGE_NODES = '"children":[{"id":"a","x":10,"y":20},{"id":"b","x":50,"y":60}]';

function edgeGraph(edgeJson: string, options = ''): string {
  return `{"id":"r",${options}${EDGE_NODES},"edges":[${edgeJson}]}`;
}

function firstEdge(root: ElkNode): ElkEdge {
  return [...root.getContainedEdges()][0] as ElkEdge;
}

describe('edge layout', () => {
  it('moves the sections key to the end and reuses the existing section objects', () => {
    const { importer, input, root } = setup(
      edgeGraph(
        '{"id":"e","sources":["a"],"targets":["b"],"sections":[{"id":"s","startPoint":{"x":1,"y":1},"endPoint":{"x":2,"y":2}}],"z":1}',
      ),
    );
    const section = [...firstEdge(root).getSections()][0] as ElkEdgeSection;
    section.setEndLocation(7, 8);
    expect(transferred(importer, root, input)).toContain(
      '"z":1,"sections":[{"id":"s","startPoint":{"x":1.0,"y":1.0},"endPoint":{"x":7.0,"y":8.0},' +
        '"incomingShape":"a","outgoingShape":"b"}],"container":"r"}',
    );
  });

  it('names a layout-created section <edgeId>_s<index> and writes its shapes and bend points', () => {
    const { importer, input, root } = setup(edgeGraph('{"id":4,"sources":["a"],"targets":["b"]}'));
    const edge = firstEdge(root);
    const first = ElkGraphUtil.createEdgeSection(edge);
    const second = ElkGraphUtil.createEdgeSection(edge);
    first.setOutgoingShape(child(root, 1));
    second.setIncomingShape(child(root, 0));
    ElkGraphUtil.createBendPoint(first, 1, 2);
    expect(transferred(importer, root, input)).toContain(
      '"sections":[{"id":"4_s0","startPoint":{"x":0.0,"y":0.0},"endPoint":{"x":0.0,"y":0.0},' +
        '"bendPoints":[{"x":1.0,"y":2.0}],"outgoingShape":"b"},' +
        '{"id":"4_s1","startPoint":{"x":0.0,"y":0.0},"endPoint":{"x":0.0,"y":0.0},"incomingShape":"a"}]',
    );
  });

  it('writes links between imported sections by id and fails on links to layout-created ones', () => {
    const sections = '[{"id":"s1",' + PT + '},{"id":"s2",' + PT + '}]';
    const { importer, input, root } = setup(
      edgeGraph(`{"id":"e","sources":["a"],"targets":["b"],"sections":${sections}}`),
    );
    const [s1, s2] = [...firstEdge(root).getSections()] as ElkEdgeSection[];
    (s1 as ElkEdgeSection).getOutgoingSections().add(s2 as ElkEdgeSection);
    expect(transferred(importer, root, input)).toContain('"outgoingSections":["s2"]');
    expect(transferred(importer, root, input)).toContain('"incomingSections":["s1"]');

    (s1 as ElkEdgeSection).getOutgoingSections().add(ElkGraphUtil.createEdgeSection(firstEdge(root)));
    expect((captured(() => importer.transferLayout(root)) as Error).message).toBe(IMPLEMENTATION_ERROR);
  });

  it('keeps a stale bendPoints key when the layout cleared the bend points (J5)', () => {
    const { importer, input, root } = setup(
      edgeGraph(
        '{"id":"e","sources":["a"],"targets":["b"],"sections":[{"id":"s","startPoint":{"x":1,"y":1},"endPoint":{"x":2,"y":2},"bendPoints":[{"x":1,"y":2}]}]}',
      ),
    );
    const section = [...firstEdge(root).getSections()][0] as ElkEdgeSection;
    expect(section.getBendPoints().size()).toBe(1);
    section.getBendPoints().clear();
    expect(transferred(importer, root, input)).toContain('"bendPoints":[{"x":1,"y":2}]');
  });

  it('fails with the implementation error for a shape the importer never registered', () => {
    const { importer, root } = setup(edgeGraph('{"id":"e","sources":["a"],"targets":["b"]}'));
    ElkGraphUtil.createEdgeSection(firstEdge(root)).setIncomingShape(ElkGraphUtil.createNode(null));
    const error = captured(() => importer.transferLayout(root));
    expect((error as Error).message).toBe(IMPLEMENTATION_ERROR);
  });

  it('writes junction points but leaves an empty option out', () => {
    const { importer, input, root } = setup(edgeGraph('{"id":"e","sources":["a"],"targets":["b"]}'));
    const edge = firstEdge(root);
    edge.setProperty(
      CoreOptions.JUNCTION_POINTS,
      new (edge.getProperty(CoreOptions.JUNCTION_POINTS).constructor as new () => never)(),
    );
    expect(transferred(importer, root, input)).not.toContain('junctionPoints');
  });

  it('writes a null containing node identifier as a JSON null member (Gson text drops it)', () => {
    const { importer, input, root } = setup(edgeGraph('{"id":"e","sources":["a"],"targets":["b"]}'));
    firstEdge(root).getContainingNode()?.setIdentifier(null);
    expect(transferred(importer, root, input)).not.toContain('container');
    const edge = input.get('edges')?.getAsJsonArray().get(0).getAsJsonObject() as JsonObject;
    expect(edge.has('container')).toBe(true);
    expect(edge.get('container')?.isJsonNull()).toBe(true);
  });
});

describe('edge coordinate modes', () => {
  const NESTED =
    '"children":[{"id":"p","x":100,"y":200,"children":[{"id":"a","x":1,"y":1},{"id":"b","x":2,"y":2}],' +
    '"edges":[{"id":"e","sources":["a"],"targets":["b"],"sections":[{"id":"s","startPoint":{"x":1,"y":1},"endPoint":{"x":2,"y":2}}]}]}]';

  function endpoints(mode: string): number[] {
    const { importer, input, root } = setup(
      `{"id":"r","layoutOptions":{"org.eclipse.elk.json.edgeCoords":"${mode}","org.eclipse.elk.json.shapeCoords":"ROOT"},${NESTED}}`,
    );
    const edge = [...child(root, 0).getContainedEdges()][0] as ElkEdge;
    ([...edge.getSections()][0] as ElkEdgeSection).setStartLocation(1, 2);
    importer.transferLayout(root);
    const p = (
      input.get('children')?.getAsJsonArray().get(0) as unknown as { getAsJsonObject(): JsonObject }
    ).getAsJsonObject();
    const section = p
      .get('edges')
      ?.getAsJsonArray()
      .get(0)
      .getAsJsonObject()
      .get('sections')
      ?.getAsJsonArray()
      .get(0)
      .getAsJsonObject()
      .get('startPoint')
      ?.getAsJsonObject() as JsonObject;
    return [section.get('x')?.getAsDouble() as number, section.get('y')?.getAsDouble() as number];
  }

  it('leaves CONTAINER coordinates unchanged', () => {
    expect(endpoints('CONTAINER')).toEqual([1, 2]);
  });

  it('adds the containing node global position in ROOT mode', () => {
    expect(endpoints('ROOT')).toEqual([101, 202]);
  });

  it('adds the containing node global position relative to the original parent in PARENT mode', () => {
    expect(endpoints('PARENT')).toEqual([1, 2]);
  });
});

describe('elements whose original parent left the graph', () => {
  it('treats the original parent as having no recorded coordinate modes (Xtend null-receiver extensions)', () => {
    const { importer, input, root } = setup(
      '{"id":"r","children":[{"id":"p","x":100,"y":200,"children":[{"id":"a"},{"id":"b"}],' +
        '"edges":[{"id":"e","sources":["a"],"targets":["b"],"sections":[{"id":"s",' +
        PT +
        '}]}]}]}',
    );
    const parent = child(root, 0);
    const edge = [...parent.getContainedEdges()][0] as ElkEdge;
    edge.setContainingNode(root);
    parent.setParent(null);
    importer.transferLayout(root);
    const e = input.get('children')?.getAsJsonArray().get(0).getAsJsonObject().get('edges')?.getAsJsonArray().get(0);
    const section = (e as unknown as { getAsJsonObject(): JsonObject })
      .getAsJsonObject()
      .get('sections')
      ?.getAsJsonArray()
      .get(0)
      .getAsJsonObject()
      .get('startPoint')
      ?.getAsJsonObject() as JsonObject;
    // the original parent has no recorded mode: unchanged coordinates, and CONTAINER is not written for it
    expect(section.get('x')?.getAsDouble()).toBe(1);
    expect(
      input
        .get('children')
        ?.getAsJsonArray()
        .get(0)
        .getAsJsonObject()
        .get('edges')
        ?.getAsJsonArray()
        .get(0)
        .getAsJsonObject()
        .has('container'),
    ).toBe(false);
  });

  it('falls back to the default modes when a mode option is explicitly null', () => {
    const { importer, input, root } = setup(`{"id":"r",${NODES}}`);
    child(root, 0).setProperty(CoreOptions.JSON_SHAPE_COORDS, null as never);
    child(root, 0).setProperty(CoreOptions.JSON_EDGE_COORDS, null as never);
    expect(transferred(importer, root, input)).toContain('"id":"a","x":1.0');
  });
});
