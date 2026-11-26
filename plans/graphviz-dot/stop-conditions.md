<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: graphviz-dot

## Stop (journal the case; halt the affected part, finish the rest unless noted)

1. **A file outside the README's file table needs a write.** That includes any file in `src/graph/text/`, `src/index.ts`,
   `src/layout.ts`, a landed ref, or a landed test's expected value. Halt that part and file the question (`needs-ruling`).
2. **Two consecutive failures of one gate check** after two fix attempts on it (the quality-gate cap). Journal the diagnosis
   artifact (mechanism, origin, causal chain, ruled out) before halting.
3. **A decision in [decisions.md](decisions.md) is contradicted by the Java or the oracle.** For example, a converter or
   emitter behaves other than D2 or D4 assume. Instrument the oracle first. If the decision itself is wrong, halt that part.
4. **AD-13:** a test, vector or golden can pass only by changing its expected value. File `needs-ruling` naming the rows,
   leave them, and finish the rest. Halt the whole mission if the `.elkt` writer refs move after T6 (D3) and the cause cannot
   be fixed inside the autowrap port.
5. **A port discrepancy without a stated mechanism.** The diagnosis artifact is required before any fix. A fix with no
   mechanism is a halt, not a done.
6. **A vector that only Xtext's generic sequencer, or `formatting2` code beyond D3, can meet.** Journal the vector and the
   Xtext path it needs, then halt that part (the G1 stop 8 precedent).
7. **The oracle cannot run the DOT recorders** (Xtext standalone setup fails for this grammar, or the jar is missing or stale)
   and `build.sh` does not fix it. This halts the whole mission, because no code may land before its vectors.
8. **A frozen count or list in a fitness test** has to change: `EXPECTED_STAMPING_RECORDERS` (D7, #173), the
   `XTEXT_CLIENT_BUNDLES` assertions beyond the D9 addition, or any other `toHaveLength`/`toEqual` over recorders, refs or
   bundles. Comment on #173 or file `needs-ruling`, keep the count, and work around it as D7 does.
9. **The oracle record does not name `8bca22f4…` with patches 0001-0004**, or the graphviz.dot jar is not from that build.
   Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails, halt.
10. **The local export sweep shows a mismatch class with no mechanism** after T12's diagnosis budget (90 min). File a
    `follow-up` that names the models and the first divergent byte, record the counts as they stand, and finish.

## Push-forward (decide, journal, continue)

- How the TS model represents EMF containment and lists, and the exact shape of the model dump (match the recorder's dump on
  both sides).
- File splits that the 500-line hook and the complexity limits force (keep the Java method boundaries, AD-7 names, `@see` on
  each part).
- Scenario content and count, and which property combinations of `DotExporter` the export vectors cover (at least every
  boolean property in each state, and every `Command`).
- Which `Double`/`Float`/`Integer` shapes need new JDK vectors (D10), and the members of the `StringTokenizer` shim.
- Wording in docs and comments; the slug and anchors of `docs/architecture/graphviz-dot.md`.
- A `follow-up` issue (not `queue:ready`) for any defect or cleanup found on the way.
- A CodeQL finding that is a Java-faithful quirk: accept it in `tools/codeql/accepted.json` with its reason, and journal it.
