// SPDX-License-Identifier: EPL-2.0
import type { StringBasedRegionAccess } from '../../../../xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';
import { CaseInsensitivityHelper } from '../../../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../../../xtext/util/ResourceScopeCache.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { DefaultQualifiedNameConverter } from '../linking/DefaultQualifiedNameConverter.js';
import { ElkGraphJsonQualifiedNameProvider } from '../naming/ElkGraphJsonQualifiedNameProvider.js';
import { ElkGraphJsonScopeProvider } from '../scoping/ElkGraphJsonScopeProvider.js';
import { ElkGraphJsonCrossReferenceSerializer } from './ElkGraphJsonCrossReferenceSerializer.js';
import { ElkGraphJsonSemanticSequencer } from './ElkGraphJsonSemanticSequencer.js';
import { ElkGraphJsonSyntacticSequencer, type SequenceStream } from './ElkGraphJsonSyntacticSequencer.js';
import { ElkGraphJsonTokenWriter } from './ElkGraphJsonTokenWriter.js';
import { ElkGraphJsonTransientValueService } from './ElkGraphJsonTransientValueService.js';

/**
 * Plain construction of the serializer bindings of `ElkGraphJsonRuntimeModule` and the generated
 * `AbstractElkGraphJsonRuntimeModule`: the value converter service, the qualified name converter, the
 * `ElkGraphJsonScopeProvider` over the imported-namespace-aware local scope provider as the scope of the
 * cross reference serializer (`@SerializerScopeProviderBinding` has no binding of its own, so the default
 * `IScopeProvider` applies), and `ElkGraphJsonTransientValueService`. The scope cache holds names and scopes for the
 * life of one resource, so every call builds its own.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJsonRuntimeModule.xtend
 */
function createSemanticSequencer(out: ElkGraphJsonSyntacticSequencer): ElkGraphJsonSemanticSequencer {
  const nameConverter = new DefaultQualifiedNameConverter();
  const cache = new ResourceScopeCache();
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    new ElkGraphJsonQualifiedNameProvider(nameConverter, cache),
    nameConverter,
    new CaseInsensitivityHelper(),
    cache,
  );
  const valueConverters = new ElkGraphJsonValueConverterService();
  const crossReferences = new ElkGraphJsonCrossReferenceSerializer(
    new ElkGraphJsonScopeProvider(local),
    nameConverter,
    valueConverters,
  );
  return new ElkGraphJsonSemanticSequencer(
    new ElkGraphJsonTransientValueService(),
    new ElkGraphJsonTokenWriter(out, valueConverters, crossReferences),
  );
}

/**
 * The semantic half of Xtext's `Serializer` for `.elkj`: the token sequence of an ElkGraph, ready for the formatter.
 *
 * Xtext's `Serializer.serialize(obj, options)` always runs `serializeToRegions` and then the grammar's `IFormatter2`
 * over the result, with or without `SaveOptions.format()`; the unformatted request only limits the formatter to
 * undefined hidden regions, which are all of them for a string-built region access. There is no rendering without
 * the formatter, so this class stops at the region access; the entry point of the writer renders it with
 * `ElkGraphJsonFormatter` (T16).
 *
 * Unlike the `.elkt` sequencer this one does not touch the graph: `ElkGraphJsonSemanticSequencer` is an empty
 * extension, so a property value that is a proxy is converted by its `toString` and not replaced. Reading the
 * `sources`/`targets` of an edge resolves its lazy proxies (D13), as the Java sequencer's cross reference
 * serializer does.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/impl/Serializer.java:121-129
 */
export class ElkGraphJsonSerializer {
  /**
   * `Serializer.serializeToRegions(root)`: the tokens and the region access built from them.
   *
   * @throws ElkGraphJsonSerializationError when the graph cannot be written: an edge with sections, a property
   *   without key or with a list value, a reference that is not in scope, or a value no converter can print
   */
  sequence(root: ElkNode): SequenceStream {
    const out = new ElkGraphJsonSyntacticSequencer(root);
    createSemanticSequencer(out).createSequence(root);
    return out.finish();
  }

  /** The region access of {@link sequence}, the input of the formatter. */
  serializeToRegions(root: ElkNode): StringBasedRegionAccess {
    return this.sequence(root).regionAccess;
  }

  /**
   * The token texts of {@link sequence} concatenated with no whitespace: what the region access holds before the
   * formatter fills its hidden regions.
   */
  serializeUnformatted(root: ElkNode): string {
    return this.sequence(root)
      .tokens.map((t) => t.text)
      .join('');
  }
}
