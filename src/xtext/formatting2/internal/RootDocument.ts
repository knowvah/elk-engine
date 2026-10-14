// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import type { FormatterRequest } from '../FormatterRequest.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { FormattableDocument } from './FormattableDocument.js';

/** The document over the whole text. @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RootDocument.java */
export class RootDocument extends FormattableDocument {
  private readonly formatter: AbstractFormatter2;

  constructor(formatter: AbstractFormatter2) {
    super();
    this.formatter = formatter;
  }

  getFormatter(): AbstractFormatter2 {
    return this.formatter;
  }

  getRegion(): ITextSegment {
    return this.formatter.getRequest().getTextRegionAccess().regionForDocument();
  }

  getRequest(): FormatterRequest {
    return this.formatter.getRequest();
  }
}
