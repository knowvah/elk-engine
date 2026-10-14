// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicEList } from '../../emf/common/util/BasicEList.js';
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Severity } from '../diagnostics/Severity.js';
import { AbstractDeclarativeValidator } from './AbstractDeclarativeValidator.js';
import { CheckMode } from './CheckMode.js';
import { CheckType } from './CheckType.js';
import { CompositeEValidator } from './CompositeEValidator.js';
import { Diagnostician } from './Diagnostician.js';
import { DiagnosticConverterImpl, type IssueAcceptor } from './DiagnosticConverterImpl.js';
import type { EValidator } from './emf/EValidator.js';
import { EObjectValidator, type MapEntryFeature, type MapEntryFeatureProvider } from './EObjectValidator.js';
import type { EStructuralFeature } from './EStructuralFeature.js';
import { EValidatorRegistrar } from './EValidatorRegistrar.js';
import type { Issue, ResourceDiagnostic } from './Issue.js';
import type { ContainmentSlot, IssueLocator } from './IssueLocator.js';
import { ResourceValidatorImpl } from './ResourceValidatorImpl.js';

/** A test-local containment tree: class name, id, ordered children. */
class TObj implements EObject {
  readonly children: TObj[] = [];
  container: TObj | null = null;

  constructor(
    readonly className: string,
    readonly id: string,
  ) {}

  add(child: TObj): TObj {
    child.container = this;
    this.children.push(child);
    return this;
  }

  eClass(): EClass {
    return { getName: () => this.className };
  }

  eContainer(): EObject | null {
    return this.container;
  }

  eContents(): EList<EObject> {
    const list = new BasicEList<EObject>();
    list.addAll(this.children);
    return list;
  }

  *eAllContents(): IterableIterator<EObject> {
    for (const child of this.children) {
      yield child;
      yield* child.eAllContents();
    }
  }

  toString(): string {
    return `${this.className}#${this.id}`;
  }
}

const NAME_FEATURE: EStructuralFeature = { getName: () => 'name' };
const TAGS_FEATURE: EStructuralFeature = { getName: () => 'tags' };
const isBranch = (o: EObject): o is TObj => o instanceof TObj && o.className === 'Branch';
const isLeaf = (o: EObject): o is TObj => o instanceof TObj && o.className === 'Leaf';
const NO_MAPS: MapEntryFeatureProvider = () => [];

/** Lines by object id; feature lines by `id.feature`; the container slot by object id. */
class TLocator implements IssueLocator {
  readonly lines = new Map<string, number>();
  readonly featureLines = new Map<string, number[]>();
  readonly slots = new Map<string, ContainmentSlot>();

  objectStartLine(obj: EObject): number | null {
    return this.lines.get((obj as TObj).id) ?? null;
  }

  featureStartLines(obj: EObject, featureName: string): readonly number[] {
    return this.featureLines.get(`${(obj as TObj).id}.${featureName}`) ?? [];
  }

  containingSlot(obj: EObject): ContainmentSlot {
    return this.slots.get((obj as TObj).id) as ContainmentSlot;
  }
}

/** root -> b1 -> (l1, b2), as `Root > Branch > (Leaf, Branch)`; lines 1..4. */
function buildTree(): { root: TObj; b1: TObj; l1: TObj; b2: TObj; locator: TLocator } {
  const root = new TObj('Root', 'root');
  const b1 = new TObj('Branch', 'b1');
  const l1 = new TObj('Leaf', 'l1');
  const b2 = new TObj('Branch', 'b2');
  root.add(b1);
  b1.add(l1).add(b2);
  const locator = new TLocator();
  [root, b1, l1, b2].forEach((o, i) => locator.lines.set(o.id, i + 1));
  return { root, b1, l1, b2, locator };
}

type ErrorEntry = { message: string; error: unknown };

function pipeline(
  languageValidator: EValidator,
  maps: MapEntryFeatureProvider = NO_MAPS,
): { resourceValidator: ResourceValidatorImpl; logged: ErrorEntry[]; composite: CompositeEValidator } {
  const logged: ErrorEntry[] = [];
  const log = (message: string, error: unknown): void => {
    logged.push({ message, error });
  };
  const registrar = new EValidatorRegistrar(new EObjectValidator(maps), () => new CompositeEValidator(maps, log));
  const composite = registrar.register(languageValidator);
  const resourceValidator = new ResourceValidatorImpl(new Diagnostician(composite), new DiagnosticConverterImpl(), log);
  return { resourceValidator, logged, composite };
}

const NO_RESOURCE_DIAGNOSTICS = { errors: [], warnings: [] };

/** A validator running the given checks, each reporting its own name through `warning`. */
class OrderValidator extends AbstractDeclarativeValidator {
  constructor() {
    super();
    this.addCheck(isBranch, (o) => this.warning(`branch-first ${o.id}`, NAME_FEATURE));
    this.addCheck(isLeaf, (o) => this.warning(`leaf ${o.id}`, NAME_FEATURE));
    this.addCheck(isBranch, (o) => this.warning(`branch-second ${o.id}`, NAME_FEATURE));
  }
}

describe('ResourceValidatorImpl', () => {
  it('orders resource errors, warnings, then content issues parent-before-children in registration order', () => {
    const { root, locator } = buildTree();
    const { resourceValidator, logged } = pipeline(new OrderValidator());

    const issues = resourceValidator.validate(
      [root],
      {
        errors: [{ message: 'syntax', line: 9, syntax: true, code: 'Syntax', data: ['d'] }],
        warnings: [{ message: 'warn', line: 8, syntax: false }],
      },
      CheckMode.ALL,
      locator,
    );

    expect(issues.map((i) => [i.severity, i.message, i.lineNumber, i.syntaxError])).toEqual([
      [Severity.ERROR, 'syntax', 9, true],
      [Severity.WARNING, 'warn', 8, false],
      [Severity.WARNING, 'branch-first b1', 2, false],
      [Severity.WARNING, 'branch-second b1', 2, false],
      [Severity.WARNING, 'leaf l1', 3, false],
      [Severity.WARNING, 'branch-first b2', 4, false],
      [Severity.WARNING, 'branch-second b2', 4, false],
    ]);
    expect(issues[0]).toMatchObject({ code: 'Syntax', data: ['d'] });
    expect(issues[1]).toMatchObject({ code: null, data: [] });
    expect(logged).toEqual([]);
  });

  it('skips the load diagnostics when the mode does not check FAST', () => {
    const { root, locator } = buildTree();
    const { resourceValidator } = pipeline(new OrderValidator());

    const issues = resourceValidator.validate(
      [root],
      { errors: [{ message: 'syntax', line: 1, syntax: true }], warnings: [] },
      CheckMode.NORMAL_ONLY,
      locator,
    );

    expect(issues).toEqual([]);
  });

  it('runs a check only in modes that check its type', () => {
    class TypedValidator extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isBranch, (o) => this.warning(`fast ${o.id}`, null));
        this.addCheck(isBranch, (o) => this.warning(`normal ${o.id}`, null), CheckType.NORMAL);
      }
    }
    const { b2, locator } = buildTree();
    const { resourceValidator } = pipeline(new TypedValidator());
    const messages = (mode: CheckMode): string[] =>
      resourceValidator.validate([b2], NO_RESOURCE_DIAGNOSTICS, mode, locator).map((i) => i.message);

    expect(messages(CheckMode.FAST_ONLY)).toEqual(['fast b2']);
    expect(messages(CheckMode.NORMAL_ONLY)).toEqual(['normal b2']);
    expect(messages(CheckMode.ALL)).toEqual(['fast b2', 'normal b2']);
  });

  it('swallows TypeError and GuardException and keeps running later checks', () => {
    class SwallowingValidator extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isBranch, () => {
          const algorithm = null as unknown as { id: string };
          this.warning(`unreached ${algorithm.id}`, null);
        });
        this.addCheck(isBranch, () => {
          this.guard(false);
          this.warning('after failed guard', null);
        });
        this.addCheck(isBranch, () => this.checkDone());
        this.addCheck(isBranch, (o) => this.warning(`survivor ${o.id}`, null));
      }
    }
    const { b2, locator } = buildTree();
    const { resourceValidator, logged } = pipeline(new SwallowingValidator());

    const issues = resourceValidator.validate([b2], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator);

    expect(issues.map((i) => i.message)).toEqual(['survivor b2']);
    expect(logged).toEqual([]);
  });

  it('turns any other failure of a check into an Error executing EValidator issue and keeps traversing', () => {
    class FailingValidator extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isBranch, (o) => {
          this.warning(`before ${o.id}`, null);
          throw new RangeError(`boom ${o.id}`);
        });
        this.addCheck(isLeaf, (o) => this.warning(`leaf ${o.id}`, null));
      }
    }
    const { b1, locator } = buildTree();
    const { resourceValidator, logged } = pipeline(new FailingValidator());

    const issues = resourceValidator.validate([b1], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator);

    expect(issues.map((i) => [i.severity, i.message, i.code, i.lineNumber, i.data])).toEqual([
      [Severity.WARNING, 'before b1', null, 2, []],
      [Severity.ERROR, 'Error executing EValidator', 'Branch.0', 0, []],
      [Severity.WARNING, 'leaf l1', null, 3, []],
      [Severity.WARNING, 'before b2', null, 4, []],
      [Severity.ERROR, 'Error executing EValidator', 'Branch.0', 0, []],
    ]);
    expect(logged.map((e) => [e.message, (e.error as Error).message])).toEqual([
      ['Error executing EValidator', 'boom b1'],
      ['Error executing EValidator', 'boom b2'],
    ]);
  });

  it('locates warning(msg, null) at the object and error(msg, obj, feature) at the indexed value', () => {
    class LocatingValidator extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isBranch, (o) => {
          this.warning('no feature', null);
          this.error('first value', o, TAGS_FEATURE);
          this.error('second value', o, TAGS_FEATURE, 1);
          this.error('beyond the values', o, TAGS_FEATURE, 7);
          this.error('no values', o, NAME_FEATURE, 'CODE', 'x', 'y');
        });
      }
    }
    const { b2, locator } = buildTree();
    locator.featureLines.set('b2.tags', [20, 30]);
    const { resourceValidator } = pipeline(new LocatingValidator());

    const issues = resourceValidator.validate([b2], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator);

    expect(issues.map((i) => [i.severity, i.message, i.lineNumber, i.code, i.data])).toEqual([
      [Severity.WARNING, 'no feature', 4, null, []],
      [Severity.ERROR, 'first value', 20, null, []],
      [Severity.ERROR, 'second value', 30, null, []],
      [Severity.ERROR, 'beyond the values', 4, null, []],
      [Severity.ERROR, 'no values', 4, 'CODE', ['x', 'y']],
    ]);
  });

  it('reports an issue for an object of another tree as an Error executing EValidator', () => {
    const { b1, locator } = buildTree();
    const stranger = new TObj('Leaf', 'stranger');
    class CrossTreeValidator extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isBranch, (o) => this.error('misplaced', stranger, NAME_FEATURE));
      }
    }
    const { resourceValidator, logged } = pipeline(new CrossTreeValidator());

    const issues = resourceValidator.validate([b1], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator);

    expect(issues.map((i) => i.message)).toEqual(['Error executing EValidator', 'Error executing EValidator']);
    const error = logged[0]?.error as Error;
    expect(error).toBeInstanceOf(IllegalArgumentException);
    expect(error.message).toBe(
      "You can only add issues for EObjects contained in the currently validated resource 'Root#root'. " +
        "But the given EObject was contained in 'Leaf#stranger'",
    );
  });

  it('logs a failure outside the composite and drops only that root issues', () => {
    const { root, b1, locator } = buildTree();
    const throwingFirst: EValidator = {
      validate(_eClass, eObject) {
        if (eObject === root) {
          throw new RangeError('uncaught');
        }
        return true;
      },
    };
    const logged: ErrorEntry[] = [];
    const resourceValidator = new ResourceValidatorImpl(
      new Diagnostician(throwingFirst),
      new DiagnosticConverterImpl(),
      (message, error) => logged.push({ message, error }),
    );

    const issues = resourceValidator.validate(
      [root, b1],
      { errors: [{ message: 'load', line: 1, syntax: false }], warnings: [] },
      CheckMode.ALL,
      locator,
    );

    expect(issues.map((i) => i.message)).toEqual(['load']);
    expect(logged.map((e) => [e.message, (e.error as Error).message])).toEqual([
      ['Error validating element', 'uncaught'],
    ]);
  });

  it('logs a failure while converting load diagnostics and returns what was collected', () => {
    class ThrowingConverter extends DiagnosticConverterImpl {
      override convertResourceDiagnostic(
        diagnostic: ResourceDiagnostic,
        severity: Severity,
        acceptor: IssueAcceptor,
      ): void {
        if (diagnostic.message === 'second') {
          throw new RangeError('cannot convert');
        }
        super.convertResourceDiagnostic(diagnostic, severity, acceptor);
      }
    }
    const { root, locator } = buildTree();
    const logged: ErrorEntry[] = [];
    const resourceValidator = new ResourceValidatorImpl(
      new Diagnostician(new EObjectValidator(NO_MAPS)),
      new ThrowingConverter(),
      (message, error) => logged.push({ message, error }),
    );

    const issues = resourceValidator.validate(
      [root],
      {
        errors: [
          { message: 'first', line: 1, syntax: false },
          { message: 'second', line: 2, syntax: false },
        ],
        warnings: [],
      },
      CheckMode.ALL,
      locator,
    );

    expect(issues.map((i) => i.message)).toEqual(['first']);
    expect(logged.map((e) => [e.message, (e.error as Error).message])).toEqual([
      ['Error validating resource', 'cannot convert'],
    ]);
  });

  it('returns no issue for a valid tree (the OK root diagnostic converts to nothing)', () => {
    class QuietValidator extends AbstractDeclarativeValidator {}
    const { root, locator } = buildTree();
    const { resourceValidator } = pipeline(new QuietValidator());

    expect(resourceValidator.validate([root], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator)).toEqual([]);
  });

  it('reports each map key collision twice: the default and the plain EObjectValidator both run', () => {
    const { b1, locator } = buildTree();
    const keys = ['a', 'b', 'a', 'a'];
    const mapFeature: MapEntryFeature = {
      feature: { getName: () => 'properties' },
      size: () => keys.length,
      entryAt: (i) => `entry${i}`,
      keyAt: (i) => keys[i],
      indexOfKey: (key) => keys.indexOf(key as string),
    };
    const { resourceValidator, composite } = pipeline(new OrderValidatorQuiet(), (o) => (o === b1 ? [mapFeature] : []));
    locator.featureLines.set('b1.properties', [12, 13]);

    const issues = resourceValidator.validate([b1], NO_RESOURCE_DIAGNOSTICS, CheckMode.ALL, locator);

    const collision = (index: number): Pick<Issue, 'severity' | 'message' | 'code' | 'lineNumber'> => ({
      severity: Severity.ERROR,
      message:
        `The feature 'properties' has a map entry at index ${index} ` +
        'with a key that collides with that of the map entry at index 0',
      code: 'org.eclipse.emf.ecore.14',
      lineNumber: 12,
    });
    expect(issues.map(({ severity, message, code, lineNumber }) => ({ severity, message, code, lineNumber }))).toEqual([
      collision(2),
      collision(3),
      collision(2),
      collision(3),
    ]);
    expect(composite.getContents().map((d) => d.constructor.name)).toEqual([
      'DefaultEObjectValidator',
      'EObjectValidator',
      'OrderValidatorQuiet',
    ]);
  });
});

class OrderValidatorQuiet extends AbstractDeclarativeValidator {}
