// SPDX-License-Identifier: EPL-2.0
import type { MdBundleMember, MdOption, MelkFile } from './ast.js';
import { buildImportScope, type ImportScope } from './expr.js';
import { ModelError } from './model-errors.js';
import { constantName, memberId, scopedName } from './model-names.js';
import { resolveOptionType, type OptionTypeInfo } from './model-types.js';

const SEPARATOR = '.';

/** An option together with everything the model derives from its position in a `.melk` file. */
export interface IndexedOption {
  readonly option: MdOption;
  readonly file: MelkFile;
  readonly groups: readonly string[];
  /** The registry id, e.g. `org.eclipse.elk.layered.layering.strategy`. */
  readonly id: string;
  /** The package-based name that cross-references (`requires`, `supports`) resolve against. */
  readonly scopedName: string;
  readonly constantName: string;
  readonly type: OptionTypeInfo;
  readonly scope: ImportScope;
}

/** All options of all files: by scoped name for reference resolution, by file in registration order. */
export interface OptionIndex {
  readonly byScopedName: ReadonlyMap<string, IndexedOption>;
  readonly byFile: ReadonlyMap<string, readonly IndexedOption[]>;
}

interface Definition {
  readonly option: MdOption;
  readonly groups: readonly string[];
}

/**
 * The option definitions of a member list in registration order: the options of this level in source order, then each
 * group's definitions by the same rule.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (getAllOptionDefinitions)
 */
export function allOptionDefinitions(members: readonly MdBundleMember[], groups: readonly string[] = []): Definition[] {
  const own: Definition[] = [];
  const nested: Definition[] = [];
  for (const member of members) {
    if (member.kind === 'option') {
      own.push({ option: member, groups });
    } else if (member.kind === 'group') {
      nested.push(...allOptionDefinitions(member.children, [...groups, member.name]));
    }
  }
  return [...own, ...nested];
}

function indexFile(file: MelkFile): IndexedOption[] {
  const scope = buildImportScope(file.imports);
  return allOptionDefinitions(file.members).map(({ option, groups }) => ({
    option,
    file,
    groups,
    id: memberId(file, groups, option.name),
    scopedName: scopedName(file, groups, option.name),
    constantName: constantName(groups, option.name),
    type: resolveOptionType(option.type),
    scope,
  }));
}

/** Indexes the options of every file that has a package (a file without one defines no bundle). */
export function buildOptionIndex(files: readonly MelkFile[]): OptionIndex {
  const byScopedName = new Map<string, IndexedOption>();
  const byFile = new Map<string, readonly IndexedOption[]>();
  for (const file of files.filter((candidate) => candidate.packageName !== null)) {
    const entries = indexFile(file);
    byFile.set(file.fileName, entries);
    for (const entry of entries) {
      if (byScopedName.has(entry.scopedName)) {
        throw new ModelError(`${file.fileName}: option '${entry.scopedName}' is defined twice`);
      }
      byScopedName.set(entry.scopedName, entry);
    }
  }
  return { byScopedName, byFile };
}

/**
 * Resolves the target of a `requires` or `supports` clause the way Xtext's imported-namespace scope does: the name is
 * tried relative to the enclosing groups (innermost first), then relative to the package, then as written.
 */
export function resolveOptionReference(
  index: OptionIndex,
  from: { readonly file: MelkFile; readonly groups: readonly string[] },
  text: string,
): IndexedOption {
  const packageName = from.file.packageName ?? '';
  const candidates: string[] = [];
  for (let depth = from.groups.length; depth >= 0; depth--) {
    candidates.push([packageName, ...from.groups.slice(0, depth), text].join(SEPARATOR));
  }
  candidates.push(text);
  for (const candidate of candidates) {
    const found = index.byScopedName.get(candidate);
    if (found !== undefined) {
      return found;
    }
  }
  throw new ModelError(`${from.file.fileName}: cannot resolve option '${text}' (tried ${candidates.join(', ')})`);
}
