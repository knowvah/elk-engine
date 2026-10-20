// SPDX-License-Identifier: EPL-2.0
import type { ExceptionHandler } from '../../../../xtext/formatting2/ExceptionAcceptor.js';
import { FormatterRequest } from '../../../../xtext/formatting2/FormatterRequest.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphJsonSerializer } from '../serializer/ElkGraphJsonSerializer.js';
import { copyGraph } from '../../../util/ElkGraphCopy.js';
import { ElkGraphJsonFormatter } from './ElkGraphJsonFormatter.js';

/**
 * The port of `ISerializer.serialize(EcoreUtil.copy(root), SaveOptions.newBuilder().format().getOptions())` for
 * `.elkj` (D3): the grammar-specific serializer's token sequence, rendered through `ElkGraphJsonFormatter`. The graph
 * is copied first, so `root` keeps its content. The request keeps Xtext's default exception handler (`LOGGING`: a
 * formatting conflict makes the later formatting disappear); tests pass `ExceptionAcceptor.THROWING` to prove there
 * are none.
 *
 * @param root the graph to write
 * @param exceptionHandler `FormatterRequest.exceptionHandler`; omit for Xtext's default
 * @returns the `.elkj` text
 * @throws ElkGraphJsonSerializationError when the graph cannot be written
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/impl/Serializer.java:121-157
 */
export function writeFormatted(root: ElkNode, exceptionHandler?: ExceptionHandler): string {
  const access = new ElkGraphJsonSerializer().sequence(copyGraph(root)).regionAccess;
  const request = new FormatterRequest().setTextRegionAccess(access);
  if (exceptionHandler !== undefined) request.setExceptionHandler(exceptionHandler);
  return access.getRewriter().renderToString(new ElkGraphJsonFormatter().formatRequest(request));
}
