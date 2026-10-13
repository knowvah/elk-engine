// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { PortLabelPlacement } from '../options/PortLabelPlacement.js';
import { SizeOptions } from '../options/SizeOptions.js';
import { DeprecatedLayoutOptionReplacer } from './DeprecatedLayoutOptionReplacer.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';

/** Ported from org.eclipse.elk.core.test DeprecatedLayoutOptionReplacerTest.java (assertions unchanged). */
describe('DeprecatedLayoutOptionReplacer', () => {
  const replacer = new DeprecatedLayoutOptionReplacer();

  beforeEach(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new CoreOptions());
  });

  it('testReplacesNextToPortIfPossible', () => {
    const node = ElkGraphUtil.createGraph();
    node.setProperty(CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, true);

    replacer.visit(node);

    expect(node.hasProperty(CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE)).toBe(false);
    expect(node.hasProperty(CoreOptions.PORT_LABELS_PLACEMENT)).toBe(true);
    expect(
      node.getProperty(CoreOptions.PORT_LABELS_PLACEMENT)?.contains(PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE),
    ).toBe(true);
  });

  it('testMovesSpaceEfficientPortLabels', () => {
    const node = ElkGraphUtil.createGraph();
    node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.SPACE_EFFICIENT_PORT_LABELS));

    replacer.visit(node);

    expect(node.getProperty(CoreOptions.NODE_SIZE_OPTIONS)?.contains(SizeOptions.SPACE_EFFICIENT_PORT_LABELS)).toBe(
      false,
    );
    expect(node.hasProperty(CoreOptions.PORT_LABELS_PLACEMENT)).toBe(true);
    expect(node.getProperty(CoreOptions.PORT_LABELS_PLACEMENT)?.contains(PortLabelPlacement.SPACE_EFFICIENT)).toBe(
      true,
    );
  });

  it('leaves an element without deprecated options unchanged', () => {
    const node = ElkGraphUtil.createGraph();

    replacer.visit(node);

    expect(node.getProperties().size()).toBe(0);
  });

  it('leaves size options without the deprecated value unchanged', () => {
    const node = ElkGraphUtil.createGraph();
    node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE));

    replacer.visit(node);

    expect(node.getProperty(CoreOptions.NODE_SIZE_OPTIONS)?.contains(SizeOptions.DEFAULT_MINIMUM_SIZE)).toBe(true);
    expect(node.hasProperty(CoreOptions.PORT_LABELS_PLACEMENT)).toBe(false);
  });

  it('RULES holds exactly the two Java keys in Java order', () => {
    expect([...DeprecatedLayoutOptionReplacer.RULES.keys()]).toEqual([
      CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE,
      CoreOptions.NODE_SIZE_OPTIONS,
    ]);
  });
});
