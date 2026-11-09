// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { LayoutOptionDataType } from '../../core/data/LayoutOptionDataType.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import type { PropertyMap } from '../../graph/properties/PropertyMap.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { simpleNameOf } from '../../java/lang/JavaClass.js';
import type { LGraph } from './graph/LGraph.js';
import type { LPort } from './graph/LPort.js';
import { InternalProperties } from './options/InternalProperties.js';
import { javaToString } from './JsonDebugUtilJavaString.js';
import { dbl, indentOf, int, type JsonDebugUtilWriter } from './JsonDebugUtilWriter.js';

/*
 * The "ports" and "properties" writers of `JsonDebugUtil` (`:377-595` and `:597-625`).
 *
 * G3 / AD-10: `writeProperties` iterates `getAllProperties()` (`JsonDebugUtil.java:573`), the property holder's
 * `HashMap`. The port's `PropertyMap` yields the entries in the port's own hash-map order; the G3 comparator treats
 * every property list as an unordered multiset, so the order is not compared.
 */

/** The internal properties of layered that are Java `Double`s (their ids are read lazily, E1). */
function internalDoubleIds(): readonly string[] {
  return [
    InternalProperties.ORIGINAL_DUMMY_NODE_POSITION,
    InternalProperties.MAX_EDGE_THICKNESS,
    InternalProperties.PORT_RATIO_OR_POSITION,
    InternalProperties.SPLINE_NS_PORT_Y_COORD,
    InternalProperties.WEIGHT,
  ].map((property) => property.getId());
}

/**
 * Whether the value of a property is a Java `Double` (JavaScript cannot tell `1.0` from `1`): an internal property
 * declared `IProperty<Double>`, or a layout option whose registered type is `DOUBLE`.
 */
function isDoubleProperty(property: IProperty<unknown>): boolean {
  const id = property.getId();
  return (
    internalDoubleIds().includes(id) ||
    LayoutMetaDataService.getInstance().getOptionData(id)?.getType() === LayoutOptionDataType.DOUBLE
  );
}

/**
 * Writes the given ports as JSON formatted string to the given writer.
 *
 * @param writer the writer to write to.
 * @param ports the ports to write.
 * @param indentation the indentation level to use.
 * @see JsonDebugUtil.java:532
 */
export function writePorts(writer: JsonDebugUtilWriter, ports: readonly LPort[], indentation: number): void {
  const indent0 = indentOf(indentation);
  const indent1 = indentOf(indentation + 1);
  const indent2 = indentOf(indentation + 2);
  writer.write(`${indent0}"ports": [`);
  const portsIterator = ports[Symbol.iterator]();
  let next = portsIterator.next();
  while (next.done !== true) {
    const port = next.value;
    next = portsIterator.next();
    writer.write(
      `\n${indent1}{\n` +
        `${indent2}"id": "p${int(identityHashCode(port))}",\n` +
        `${indent2}"width": ${dbl(port.getSize().x)},\n` +
        `${indent2}"height": ${dbl(port.getSize().y)},\n` +
        `${indent2}"x": ${dbl(port.getPosition().x)},\n` +
        `${indent2}"y": ${dbl(port.getPosition().y)},\n`,
    );
    writeProperties(writer, port.getAllProperties(), indentation + 2);
    writer.write(`\n${indent1}}`);
    if (next.done !== true) {
      writer.write(',');
    }
  }
  writer.write(`\n${indent0}]`);
}

/**
 * Writes the given properties as JSON formatted string to the given writer.
 *
 * @param writer the writer to write to.
 * @param properties the properties to write.
 * @param indentation the indentation level to use.
 * @see JsonDebugUtil.java:566
 */
export function writeProperties(writer: JsonDebugUtilWriter, properties: PropertyMap, indentation: number): void {
  const indent0 = indentOf(indentation);
  const indent1 = indentOf(indentation + 1);
  writer.write(`${indent0}"properties": {`);
  const propertiesIterator = properties[Symbol.iterator]();
  let next = propertiesIterator.next();
  while (next.done !== true) {
    const [key, value] = next.value;
    next = propertiesIterator.next();
    const id = key.getId();
    const val = getValueRepresentation(key, value);
    writer.write(`\n${indent1}"${id}": "${val.replaceAll('"', '\\"')}"`);
    if (next.done !== true) {
      writer.write(',');
    }
  }
  writer.write(`\n${indent0}}`);
}

/**
 * Returns the value of the given property formatted for debug output. For example for layout processors, only the
 * class' simple name instead of the qualified name is returned.
 *
 * @param property the property whose value to get.
 * @param value the value to format.
 * @return the formatted value.
 * @see JsonDebugUtil.java:597
 */
export function getValueRepresentation(property: IProperty<unknown>, value: unknown): string {
  if (property.getId() === InternalProperties.PROCESSORS.getId()) {
    const processors = (value as ILayoutProcessor<LGraph>[])[Symbol.iterator]();
    let result = '[';
    let next = processors.next();
    while (next.done !== true) {
      const processor = next.value;
      next = processors.next();
      result += simpleNameOf(processor.constructor);
      if (next.done !== true) {
        result += ', ';
      }
    }
    result += ']';
    return result;
  }
  return javaToString(value, isDoubleProperty(property)).replaceAll('\n', '\\n');
}
