// SPDX-License-Identifier: EPL-2.0
import { EOPPOSITE_FEATURE_BASE } from '../../../../emf/ecore/InternalEObject.js';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { type DotEObject, type DotFeature, DotPackage, isDotEClass } from '../dot/DotPackage.js';

/**
 * A serialization context (`ISerializationContext`): the rule the object is serialized by and its type.
 * `toString()` is Xtext's `"<rule> returns <type>"`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/analysis/SerializationContext.java
 */
export interface DotSerializationContext {
  readonly rule: string;
}

/** The parts of an `ISerializationDiagnostic` that `ISerializationDiagnostic.ToString` prints. */
export interface DotSerializationDiagnostic {
  readonly message: string;
  readonly exception: Error | null;
  readonly semanticObject: DotEObject;
  readonly context: DotSerializationContext | null;
  readonly feature: DotFeature | null;
}

/**
 * The Java class names of what the grammar's converters throw: `ValueConverterException`, and the
 * `ClassCastException` of the `(String)` casts in `AbstractIDValueConverter.assertValidValue` and
 * `EFactoryValueConverter.toString`.
 */
const JAVA_CLASS_NAMES: ReadonlyArray<readonly [abstract new (...args: never[]) => Error, string]> = [
  [ValueConverterException, 'org.eclipse.xtext.conversion.ValueConverterException'],
  [ClassCastException, 'java.lang.ClassCastException'],
];

/** `exception.getClass().getName()` for the `Caused By:` line; the TS class name for any other error. */
function javaClassName(exception: Error): string {
  return JAVA_CLASS_NAMES.find(([type]) => exception.constructor === type)?.[1] ?? exception.name;
}

/** `exception.getMessage()`: a converter exception keeps Java's `null` message apart from the empty one. */
function javaMessage(exception: Error): string | null {
  return exception instanceof ValueConverterException ? exception.getMessage() : exception.message;
}

/** The feature of `container` that holds `obj` (EMF `eContainingFeature()`; every DOT containment has no opposite). */
function containingFeature(obj: DotEObject, container: DotEObject): DotFeature {
  const featureID = EOPPOSITE_FEATURE_BASE - obj.eContainerFeatureID();
  return container
    .eClass()
    .getEAllStructuralFeatures()
    .find((f) => f.featureID === featureID)!;
}

/**
 * `EmfFormatter.objPath`: the containment path of `obj`, each step `<feature>[<index>]->` (no index for a
 * single-valued feature), each object as its class name and its `name` feature in quotes when not null.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/EmfFormatter.java:209-237
 */
export function objPath(obj: DotEObject): string {
  let path = '';
  const container = obj.eContainer() as DotEObject | null;
  if (container !== null && isDotEClass(container.eClass())) {
    const feature = containingFeature(obj, container);
    const value = container.eGet(feature.featureID, true, false);
    const index = typeof value === 'object' && value !== null && 'indexOf' in value;
    path = `${objPath(container)}.${feature.name}`;
    if (index) path += `[${(value as { indexOf(o: unknown): number }).indexOf(obj)}]`;
    path += '->';
  }
  path += obj.eClass().getName();
  const nameF = obj
    .eClass()
    .getEAllStructuralFeatures()
    .find((f) => f.name === 'name');
  const name = nameF === undefined ? null : obj.eGet(nameF.featureID, true, false);
  if (name !== null) path += `'${String(name)}'`;
  return path;
}

/** The name of a feature's containing class (`feature.getEContainingClass().getName()`). */
function containingClassName(feature: DotFeature): string {
  const owner = Object.values(DotPackage.Literals).find(
    (literal) => 'getEAllStructuralFeatures' in literal && literal.getEAllStructuralFeatures().includes(feature),
  );
  return (owner as { getName(): string }).getName();
}

/** The `Caused By:` line of `ToString.toString`: only when the exception's message exists and differs from `msg`. */
function causedBy(exception: Error, msg: string): string[] {
  const message = javaMessage(exception);
  return message !== null && message !== msg ? [`Caused By: ${javaClassName(exception)}: ${message}`] : [];
}

/**
 * `ISerializationDiagnostic.ToString.toString`: the message, the cause when its message differs, the semantic
 * object's path and resource URI, the context and the feature, one per line.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/ISerializationDiagnostic.java:104-128
 */
export function diagnosticToString(diagnostic: DotSerializationDiagnostic): string {
  const result: string[] = [];
  const { message: msg, exception, semanticObject: eObject, context, feature } = diagnostic;
  if (msg.length > 0) result.push(msg);
  if (exception !== null) result.push(...causedBy(exception, msg));
  result.push(`Semantic Object: ${objPath(eObject)}`);
  const uri = eObject.eResource()?.getURI() ?? null;
  if (uri !== null) result.push(`URI: ${uri.toString()}`);
  if (context !== null) result.push(`Context: ${context.rule} returns ${eObject.eClass().getName()}`);
  if (feature !== null) {
    result.push(`EStructuralFeature: ${DotPackage.eNS_PREFIX}::${containingClassName(feature)}.${feature.name}`);
  }
  return result.join('\n');
}

/**
 * `ISerializationDiagnostic.ExceptionThrowingAcceptor.accept`, the error acceptor of `Serializer.serializeToRegions`:
 * the first diagnostic ends the serialization with a `RuntimeException` of its text (the exception as cause).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/ISerializationDiagnostic.java:131-144
 */
export function throwDiagnostic(diagnostic: DotSerializationDiagnostic): never {
  const msg = diagnosticToString(diagnostic);
  const exception = diagnostic.exception;
  throw exception === null ? new RuntimeException(msg) : new RuntimeException(msg, { cause: exception });
}

/**
 * `SequencerDiagnosticProvider.createFeatureValueMissing`: the diagnostic carries neither context nor feature.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/SequencerDiagnosticProvider.java:115-119
 */
export function createFeatureValueMissing(semanticObject: DotEObject, feature: DotFeature): DotSerializationDiagnostic {
  const message = `A value for feature '${feature.name}' is missing but required.`;
  return { message, exception: null, semanticObject, context: null, feature: null };
}

/**
 * `TokenDiagnosticProvider.getValueConversionExceptionDiagnostic`: the feature is the one of the assignment
 * around the rule call (`SerializationDiagnostic.getFeature(element, eClass)`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/TokenDiagnosticProvider.java:78-90
 */
export function getValueConversionExceptionDiagnostic(
  semantic: DotEObject,
  feature: DotFeature,
  ruleName: string,
  value: unknown,
  exception: Error,
): DotSerializationDiagnostic {
  const message = `Error while converting value '${String(value)}' for grammar rule '${ruleName}' to string via ValueConverter.`;
  return { message, exception, semanticObject: semantic, context: null, feature };
}
