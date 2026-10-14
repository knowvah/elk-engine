// SPDX-License-Identifier: EPL-2.0
import type { StringBasedRegionAccess } from '../../../xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';
import { CaseInsensitivityHelper } from '../../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../../xtext/util/ResourceScopeCache.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import { ElkGraphQualifiedNameConverter } from '../naming/ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from '../naming/ElkGraphQualifiedNameProvider.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphScopeProvider } from '../scoping/ElkGraphScopeProvider.js';
import { CrossReferenceSerializer } from './CrossReferenceSerializer.js';
import { ElkGraphSemanticSequencer } from './ElkGraphSemanticSequencer.js';
import { ElkGraphSyntacticSequencer, type SequenceStream } from './ElkGraphSyntacticSequencer.js';
import { ElkGraphTokenWriter } from './ElkGraphTokenWriter.js';
import { ElkGraphTransientValueService } from './ElkGraphTransientValueService.js';

/**
 * Plain construction of the serializer bindings of `ElkGraphRuntimeModule` and the generated
 * `AbstractElkGraphRuntimeModule`: the value converter service (with the lexer that re-checks converted text),
 * the qualified name converter, the `ElkGraphScopeProvider` over the imported-namespace-aware local scope
 * provider as `@SerializerScopeProviderBinding` scope, and `ElkGraphTransientValueService`. The scope cache holds
 * names and scopes for the life of one resource, so every call builds its own.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphRuntimeModule.xtend
 */
function createSemanticSequencer(out: ElkGraphSyntacticSequencer): ElkGraphSemanticSequencer {
  const converter = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);
  const cache = new ResourceScopeCache();
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    new ElkGraphQualifiedNameProvider(converter, cache),
    converter,
    new CaseInsensitivityHelper(),
    cache,
  );
  const valueConverters = new ElkGraphValueConverterService(tokenize);
  const crossReferences = new CrossReferenceSerializer(new ElkGraphScopeProvider(local), converter, valueConverters);
  return new ElkGraphSemanticSequencer(
    new ElkGraphTransientValueService(),
    new ElkGraphTokenWriter(out, valueConverters, crossReferences),
  );
}

/**
 * The semantic half of Xtext's `Serializer`: the token sequence of an ElkGraph, ready for the formatter.
 *
 * Xtext's `Serializer.serialize(obj, options)` always runs `serializeToRegions` and then the grammar's
 * `IFormatter2` over the result, with or without `SaveOptions.format()`; the unformatted request only limits the
 * formatter to undefined hidden regions, which are all of them for a string-built region access. There is no
 * rendering without the formatter (T12), so this class stops at the region access; the entry point of the writer
 * (T22) renders it with `ElkGraphFormatter` (T21).
 *
 * The sequencer mutates property entries whose value is a proxy (`ElkGraphSemanticSequencer.sequence_Property`
 * replaces it by the resolved value): pass a copy to keep the graph intact (G2).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/impl/Serializer.java:121-129
 */
export class ElkGraphSerializer {
  /**
   * `Serializer.serializeToRegions(root)`: the tokens and the region access built from them.
   *
   * @throws ElkGraphSerializationError when the graph cannot be written: a node, port, edge section or label
   *   without the value its rule requires, an edge without source or target, a reference that is not in scope,
   *   sections that cannot form one layout, a property without key, or a value no converter can print
   */
  sequence(root: ElkNode): SequenceStream {
    const out = new ElkGraphSyntacticSequencer(root);
    createSemanticSequencer(out).createSequence(root);
    return out.finish();
  }

  /** The region access of {@link sequence}, the input of the formatter. */
  serializeToRegions(root: ElkNode): StringBasedRegionAccess {
    return this.sequence(root).regionAccess;
  }
}
