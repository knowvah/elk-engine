// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../src/core/math/ElkRectangle.js';
import type { Direction } from '../../src/core/options/Direction.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import type { IComponent } from '../../src/alg/layered/compaction/components/IComponent.js';
import type { IConnectedComponents } from '../../src/alg/layered/compaction/components/IConnectedComponents.js';
import type { IExternalExtension } from '../../src/alg/layered/compaction/components/IExternalExtension.js';

/** Spacing handed to the transformer in the structure tests (an input, not an expectation). */
export const TEST_SPACING = 20;

/** An external extension with an optional placeholder; implements the interface's default by omission. */
export class FakeExtension implements IExternalExtension<string> {
  constructor(
    private readonly direction: Direction,
    private readonly representor: ElkRectangle,
  ) {}

  getRepresentative(): string {
    return 'edge';
  }

  getRepresentor(): ElkRectangle {
    return this.representor;
  }

  getParent(): ElkRectangle {
    return this.representor;
  }

  getDirection(): Direction {
    return this.direction;
  }
}

/** The same with an explicit `getPlaceholder` override. */
export class FakePlaceholderExtension extends FakeExtension {
  constructor(
    direction: Direction,
    representor: ElkRectangle,
    private readonly placeholderRect: ElkRectangle | null,
  ) {
    super(direction, representor);
  }

  getPlaceholder(): ElkRectangle | null {
    return this.placeholderRect;
  }
}

/** A component with a fixed hull, extensions and port sides. */
export class FakeComponent implements IComponent<string, string> {
  constructor(
    private readonly hull: ElkRectangle[],
    private readonly extensions: IExternalExtension<string>[] = [],
    private readonly sides: EnumSet<PortSide> = EnumSet.noneOf(PortSide),
  ) {}

  getHull(): ElkRectangle[] {
    return this.hull;
  }

  getExternalExtensions(): IExternalExtension<string>[] {
    return this.extensions;
  }

  getExternalExtensionSides(): EnumSet<PortSide> {
    return this.sides;
  }
}

/** A fixed list of components. */
export class FakeConnectedComponents implements IConnectedComponents<string, string> {
  constructor(private readonly components: IComponent<string, string>[]) {}

  getComponents(): IComponent<string, string>[] {
    return this.components;
  }

  isContainsExternalExtensions(): boolean {
    return this.components.some((c) => c.getExternalExtensions().length > 0);
  }

  [Symbol.iterator](): Iterator<IComponent<string, string>> {
    return this.components[Symbol.iterator]();
  }
}

/** The four sides, so every lock of a component is set. */
export function allFourSides(): EnumSet<PortSide> {
  return EnumSet.of(PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST);
}
