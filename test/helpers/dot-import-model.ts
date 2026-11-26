// SPDX-License-Identifier: EPL-2.0
// The DOT side of tools/vectors/DotImportVectors.java: the model dump M (DotExportVectors' ModelDump: eClass, then
// every feature of eAllStructuralFeatures in order, enum literals by getName()), the serialization of an
// EcoreUtil.copy of the model alone in a fresh resource "output.graphviz_dot", and the recorded exception shape.
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import { createValueConverterService } from '../../src/alg/graphviz/dot/parser/GraphvizDotValueConverters.js';
import { GraphvizDotSerializer } from '../../src/alg/graphviz/dot/serializer/GraphvizDotSerializer.js';
import { URI } from '../../src/emf/common/util/URI.js';
import { ResourceImpl } from '../../src/emf/ecore/resource/impl/ResourceImpl.js';
import { RuntimeException } from '../../src/java/lang/RuntimeException.js';
import { dumpModel, type DumpedObject } from './dot-model-dump.js';
import { modelFromDump } from './dot-model-from-dump.js';

const OUTPUT_URI = 'output.graphviz_dot';
const SERIALIZER = new GraphvizDotSerializer(createValueConverterService());

/** A recorded exception: the Java binary class name and the message. */
export interface Thrown {
  readonly class: string;
  readonly message: string | null;
}

/** The parse dump's value turned into M's: no `isSet`, an enum as its `getName()`. */
function exportShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(exportShape);
  if (typeof value !== 'object' || value === null) return value;
  const record = value as Record<string, unknown>;
  if (typeof record['enum'] === 'string') return record['name'];
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    if (key !== 'isSet') out[key] = exportShape(child);
  }
  return out;
}

/** M of a DOT model. */
export function modelDumpM(model: GraphvizModel): unknown {
  return exportShape(dumpModel(model));
}

/**
 * `Recorder.serialize`: `EcoreUtil.copy(model)` (rebuilt from the full parse-shape dump, which carries every feature
 * and its set state) as the only content of a fresh resource "output.graphviz_dot", serialized unformatted or
 * formatted.
 */
export function serializeCopy(model: GraphvizModel, format: boolean): string {
  const copy = modelFromDump(dumpModel(model) as DumpedObject);
  new ResourceImpl(URI.createURI(OUTPUT_URI)).getContents().add(copy);
  return SERIALIZER.serialize(copy, { format });
}

/** Java class name of a TS error as the recorder reports it; a Java NPE is a TS `TypeError` (D10). */
function javaClassOf(e: Error): string {
  if (e instanceof TypeError) return 'java.lang.NullPointerException';
  if (e.constructor === RuntimeException) return 'java.lang.RuntimeException';
  throw e;
}

/**
 * The comparable form of an exception: the class, and the message unless the JDK wrote it (the ref's header: JDK
 * messages such as `NullPointerException` text compare by class only; ELK and Xtext messages exactly).
 */
export function comparableThrown(thrown: Thrown): Thrown {
  return thrown.class === 'java.lang.NullPointerException' ? { class: thrown.class, message: null } : thrown;
}

/** Runs `action`; returns the comparable form of what it threw, or `null`. */
export function thrownBy(action: () => void): Thrown | null {
  try {
    action();
    return null;
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    return comparableThrown({ class: javaClassOf(e), message: e.message });
  }
}
