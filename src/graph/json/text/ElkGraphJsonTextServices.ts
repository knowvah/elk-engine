// SPDX-License-Identifier: EPL-2.0
import { ElkGraphJsonValueConverterService } from './conversion/ElkGraphJsonValueConverterService.js';
import { createElkGraphJsonLinking, type ElkGraphJsonLinking } from './linking/ElkGraphJsonLinkingServices.js';

/** The language services of `.elkj` that one load session uses. */
export interface ElkGraphJsonServices {
  readonly valueConverters: ElkGraphJsonValueConverterService;
  readonly linking: ElkGraphJsonLinking;
}

/**
 * Plain construction of the bindings of `ElkGraphJsonRuntimeModule` and the generated
 * `AbstractElkGraphJsonRuntimeModule` that loading needs: the value converter service, and, through
 * {@link createElkGraphJsonLinking}, the name converter and provider, the scoping, the default linking service, the
 * lazy linker and the lazy linking resource. Not constructed here, by design: the serializer, formatter and validator
 * bindings (separate entry points), the Antlr parser/lexer bindings (replaced by the hand-written parser), and the
 * content-assist, index, builder bindings (no workspace). The resource scope cache lives in the linking bindings, so
 * every call builds its own services and no state is shared between load sessions (AD-8). The serializer takes its
 * scope provider from the same bindings ({@link ElkGraphJsonLinking.createScoping}), with a cache of its own.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJsonRuntimeModule.xtend
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/AbstractElkGraphJsonRuntimeModule.java
 */
export function createElkGraphJsonServices(): ElkGraphJsonServices {
  const valueConverters = new ElkGraphJsonValueConverterService();
  return { valueConverters, linking: createElkGraphJsonLinking(valueConverters) };
}
