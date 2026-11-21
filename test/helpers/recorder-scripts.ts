// SPDX-License-Identifier: EPL-2.0
// How a shell script under tools/ names a recorder program of tools/vectors. Shared by the runbook inventory test
// (test/docs/elk-upgrade-runbook.test.ts) and the pin fitness test (test/architecture/elk-pin.fitness.test.ts).

/** A Java file name in a script, possibly a glob: `AlgCommonVectors.java`, `Elkj*Vectors.java`; never a bare `*.java`. */
export const PROGRAM_TOKEN = /[A-Z][A-Za-z0-9*]*\.java/g;

/** Whether a script text names the program file, literally or by a `find -name` glob such as `Elkj*Vectors.java`. */
export function scriptNames(scriptText: string, programFile: string): boolean {
  return (scriptText.match(PROGRAM_TOKEN) ?? []).some((token) =>
    new RegExp(`^${token.replaceAll('.', '\\.').replaceAll('*', '.*')}$`).test(programFile),
  );
}
