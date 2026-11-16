// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import type { Census } from "../../tools/corpus/census.js";
import {
  type ReportContext,
  type SweepSummary,
  renderReport,
  tsSummaryArg,
} from "../../tools/corpus/parity-report.js";
import {
  type FindingAnnotation,
  type TsAlgorithmSummary,
  type TsCaseOutcome,
  type TsCategory,
  type TsSweepSummary,
  codeSpan,
  parseFindings,
  parseTsSummary,
  tsConformantCell,
} from "../../tools/corpus/parity-report-ts.js";
import type { SweepRecord } from "../../tools/corpus/sweep.js";

const PREFIX = "org.eclipse.elk.";
const LAYERED = `${PREFIX}layered`;
const BOX = `${PREFIX}box`;
const FIXED = `${PREFIX}fixed`;
const ELK_COMMIT = "a".repeat(40);
const MODELS_COMMIT = "b".repeat(40);
const NOT_IN_SWEEP = "— (not in TS sweep)";

const SUMMARY: SweepSummary = {
  elkCommit: ELK_COMMIT,
  modelsCommit: MODELS_COMMIT,
  cases: 1,
  wallMs: 60000,
  parseErrors: [],
};
const RESULTS: SweepRecord[] = [
  {
    caseId: "native/x",
    tier: "native",
    algorithm: LAYERED,
    variant: "default",
    modelId: "tests/m",
    verdict: "ok",
    ms: 1,
  },
];
const CENSUS: Census = {
  modelsCommit: MODELS_COMMIT,
  elkCommit: ELK_COMMIT,
  count: 0,
  models: [],
};
const CONTEXT: ReportContext = {
  algorithms: [LAYERED, BOX, FIXED],
  patches: [],
};

function counts(partial: Partial<Record<TsCategory, number>>): Record<TsCategory, number> {
  return {
    ok: 0,
    mismatch: 0,
    "both-throw": 0,
    "ts-only-throw": 0,
    "oracle-only-throw": 0,
    "ts-aborted": 0,
    excluded: 0,
    ...partial,
  };
}

function entry(
  planned: number,
  partial: Partial<Record<TsCategory, number>>,
): TsAlgorithmSummary {
  return {
    planned,
    counts: counts(partial),
    optionsOnlyMismatches: 1,
    tsMs: 1234.6,
    oracleMs: 99,
  };
}

function outcome(
  caseId: string,
  algorithm: string,
  detail = "x differs",
): TsCaseOutcome {
  return {
    caseId,
    algorithm,
    category: "mismatch",
    detail,
    tsMs: 1,
    oracleMs: 2,
  };
}

function tsSummary(over: Partial<TsSweepSummary> = {}): TsSweepSummary {
  return {
    elkCommit: ELK_COMMIT,
    modelsCommit: MODELS_COMMIT,
    sweepDir: "sweep/x",
    node: "v24.0.0",
    shards: 4,
    timeoutMs: 30000,
    wallMs: 180000,
    byAlgorithm: { [LAYERED]: entry(4, { ok: 2, "both-throw": 1, mismatch: 1 }) },
    findings: [],
    cases: [],
    ...over,
  };
}

function render(
  summary: TsSweepSummary,
  annotations: FindingAnnotation[] = [],
): string {
  return renderReport(RESULTS, SUMMARY, CENSUS, CONTEXT, { summary, annotations });
}

function cellsOf(md: string, firstCell: string): string[] {
  const line = md.split("\n").find((l) => l.startsWith(`| ${firstCell} |`));
  return (line ?? "").split("|").slice(1, -1).map((c) => c.trim());
}

describe("renderReport with a TS summary", () => {
  it("fills the layered cell and marks algorithms absent from the sweep", () => {
    const md = render(tsSummary());
    expect(cellsOf(md, "`layered`").at(-1)).toBe("3 / 4 (75.0%)");
    expect(cellsOf(md, "`box`").at(-1)).toBe(NOT_IN_SWEEP);
    expect(md).not.toContain("n/a (no TS port yet)");
  });

  it("adds the header line and the TS sweep table", () => {
    const md = render(tsSummary());
    expect(md).toContain("- TS sweep: v24.0.0, 4 shards, 3 min, timeout 30 s");
    expect(md).toContain("## TS sweep");
    expect(cellsOf(md, "algorithm (TS)")).toEqual([
      "algorithm (TS)",
      "planned",
      "ok",
      "mismatch",
      "both-throw",
      "ts-only-throw",
      "oracle-only-throw",
      "ts-aborted",
      "excluded",
      "options-only mismatches",
      "TS ms",
      "oracle ms",
    ]);
    const sweepRow = md.split("\n").find((l) => l.startsWith("| `layered` | 4 |"));
    expect(sweepRow).toBe("| `layered` | 4 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1235 | 99 |");
  });

  it("prints timeout none when the run had no per-case limit", () => {
    expect(render(tsSummary({ timeoutMs: null }))).toContain("min, timeout none");
  });

  it("lists findings in algorithm then case-id order with annotations", () => {
    const findings = [
      outcome("native/b", LAYERED),
      outcome("native/a", LAYERED),
      outcome("native/z", BOX),
    ];
    const md = render(tsSummary({ findings }), [
      { caseId: "native/a", issue: 79, note: "spore jitter" },
    ]);
    const lines = md.split("\n").filter((l) => l.startsWith("- `native/"));
    expect(lines).toEqual([
      "- `native/z`: mismatch: `x differs`: unannotated",
      "- `native/a`: mismatch: `x differs`: #79: spore jitter",
      "- `native/b`: mismatch: `x differs`: unannotated",
    ]);
  });

  it("states that there are no findings when the list is empty", () => {
    const md = render(tsSummary());
    expect(md).toContain("## TS findings\n\nNo case differs between the TS port and the oracle.\n");
  });

  it("keeps a detail on one line, fenced and cut at 200 characters", () => {
    const detail = `a | b\n\`c\`${"x".repeat(300)}`;
    const md = render(tsSummary({ findings: [outcome("native/a", LAYERED, detail)] }));
    const line = md.split("\n").find((l) => l.startsWith("- `native/a`")) ?? "";
    expect(line).toBe(
      `- \`native/a\`: mismatch: ${codeSpan(`a | b \`c\`${"x".repeat(300)}`.slice(0, 200))}: unannotated`,
    );
    expect(line).toContain("``a | b `c`xxx");
    expect(md.split("\n").filter((l) => l.includes("a | b"))).toHaveLength(1);
  });

  it("replaces an empty detail and escapes markup in notes", () => {
    const md = render(tsSummary({ findings: [outcome("native/a", LAYERED, "  ")] }), [
      { caseId: "native/a", issue: 5, note: "<b> {{x}}" },
    ]);
    expect(md).toContain("`no detail`: #5: &lt;b> &#123;&#123;x}}");
  });

  it("rejects an algorithm that is not in the oracle list", () => {
    const bad = tsSummary({ byAlgorithm: { [`${PREFIX}nope`]: entry(1, { ok: 1 }) } });
    expect(() => render(bad)).toThrow(`TS summary algorithm ${PREFIX}nope is not in the oracle algorithm list`);
    const badFinding = tsSummary({ findings: [outcome("c", `${PREFIX}nope`)] });
    expect(() => render(badFinding)).toThrow("is not in the oracle algorithm list");
  });

  it("rejects commits that differ from the oracle summary", () => {
    expect(() => render(tsSummary({ elkCommit: "c".repeat(40) }))).toThrow(
      `elkCommit ${"c".repeat(40)} differs from the oracle summary's ${ELK_COMMIT}`,
    );
  });

  it("is byte-identical to the oracle-only report when ts is absent", () => {
    const without = renderReport(RESULTS, SUMMARY, CENSUS, CONTEXT);
    expect(without).toContain("n/a (no TS port yet)");
    expect(without).not.toContain("TS sweep");
    expect(without).not.toContain("TS findings");
  });

  it("leaves no blank table cell", () => {
    const md = render(tsSummary({ byAlgorithm: { [LAYERED]: entry(2, { excluded: 2 }) } }));
    expect(cellsOf(md, "`layered`").at(-1)).toBe("— (no compared cases)");
    for (const line of md.split("\n").filter((l) => l.startsWith("|"))) {
      expect(line).not.toMatch(/\|\s*\|/);
    }
  });
});

describe("tsConformantCell", () => {
  it("excludes excluded cases from the denominator", () => {
    expect(tsConformantCell(entry(5, { ok: 1, excluded: 3, mismatch: 1 }))).toBe("1 / 2 (50.0%)");
  });
});

describe("parseTsSummary", () => {
  const good = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(tsSummary({ findings: [outcome("a", LAYERED)] })));

  it("round-trips a valid summary, including optionsOnly and a null timeout", () => {
    const value = good();
    value["timeoutMs"] = null;
    (value["findings"] as Record<string, unknown>[])[0]!["optionsOnly"] = true;
    const parsed = parseTsSummary(JSON.stringify(value), SUMMARY);
    expect(parsed.timeoutMs).toBeNull();
    expect(parsed.findings[0]?.optionsOnly).toBe(true);
    expect(parsed.byAlgorithm[LAYERED]?.counts.ok).toBe(2);
  });

  it.each([
    ["elkCommit", (v: Record<string, unknown>) => delete v["elkCommit"], "elkCommit must be present"],
    ["node", (v: Record<string, unknown>) => (v["node"] = 5), "node must be a string"],
    ["shards", (v: Record<string, unknown>) => (v["shards"] = "4"), "shards must be a number"],
    ["timeoutMs", (v: Record<string, unknown>) => (v["timeoutMs"] = "x"), "timeoutMs must be a number"],
    ["byAlgorithm", (v: Record<string, unknown>) => (v["byAlgorithm"] = []), "byAlgorithm must be an object"],
    ["findings", (v: Record<string, unknown>) => (v["findings"] = {}), "findings must be an array"],
    [
      "category",
      (v: Record<string, unknown>) => ((v["findings"] as Record<string, unknown>[])[0]!["category"] = "weird"),
      "findings[0].category must be one of",
    ],
    [
      "optionsOnly",
      (v: Record<string, unknown>) => ((v["findings"] as Record<string, unknown>[])[0]!["optionsOnly"] = 1),
      "findings[0].optionsOnly must be a boolean",
    ],
    [
      "outcome",
      (v: Record<string, unknown>) => ((v["cases"] as unknown[]).push(3)),
      "cases[0] must be an object",
    ],
    [
      "algorithm entry",
      (v: Record<string, unknown>) => ((v["byAlgorithm"] as Record<string, unknown>)[LAYERED] = 3),
      `byAlgorithm.${LAYERED} must be an object`,
    ],
    [
      "counts",
      (v: Record<string, unknown>) =>
        delete ((v["byAlgorithm"] as Record<string, { counts: Record<string, number> }>)[LAYERED]!.counts["ok"]),
      `byAlgorithm.${LAYERED}.counts.ok must be present`,
    ],
    [
      "sum",
      (v: Record<string, unknown>) => ((v["byAlgorithm"] as Record<string, { planned: number }>)[LAYERED]!.planned = 9),
      `byAlgorithm.${LAYERED}.counts must be summing to planned (9), got 4`,
    ],
  ])("throws naming the field: %s", (_name, mutate, message) => {
    const value = good();
    if (message.startsWith("cases[0]")) value["cases"] = [];
    mutate(value);
    expect(() => parseTsSummary(JSON.stringify(value))).toThrow(message);
  });

  it("throws for a non-object document", () => {
    expect(() => parseTsSummary("[]")).toThrow("TS summary: the document must be an object");
  });

  it("names both commits when the elk commit differs", () => {
    const text = JSON.stringify({ ...good(), elkCommit: "c".repeat(40) });
    expect(() => parseTsSummary(text, SUMMARY)).toThrow(
      `elkCommit ${"c".repeat(40)} differs from the oracle summary's ${ELK_COMMIT}`,
    );
  });

  it("names modelsCommit when only the models commit differs", () => {
    const text = JSON.stringify({ ...good(), modelsCommit: "d".repeat(40) });
    expect(() => parseTsSummary(text, SUMMARY)).toThrow(`modelsCommit ${"d".repeat(40)} differs`);
  });
});

describe("parseFindings", () => {
  const ok = { caseId: "a", issue: 79, note: "spore jitter" };

  it("parses an empty list and a valid entry", () => {
    expect(parseFindings("[]")).toEqual([]);
    expect(parseFindings(JSON.stringify([ok]))).toEqual([ok]);
  });

  it("rejects a duplicate caseId naming it", () => {
    expect(() => parseFindings(JSON.stringify([ok, { ...ok, issue: 80 }]))).toThrow("duplicate caseId a");
  });

  it.each([
    ["{}", "the document must be an array"],
    ["[1]", "[0] must be an object"],
    [JSON.stringify([{ ...ok, issue: 0 }]), "issue must be a positive integer"],
    [JSON.stringify([{ ...ok, issue: "7" }]), "issue must be a number"],
    [JSON.stringify([{ ...ok, note: "a\nb" }]), "note must be one non-empty line"],
    [JSON.stringify([{ ...ok, note: "x".repeat(161) }]), "at most 160"],
    [JSON.stringify([{ ...ok, caseId: 3 }]), "caseId must be a string"],
  ])("rejects %s", (text, message) => {
    expect(() => parseFindings(text)).toThrow(message);
  });
});

describe("tsSummaryArg", () => {
  it("returns the value after the flag", () => {
    expect(tsSummaryArg(["--write", "--ts-summary", "f.json"])).toBe("f.json");
  });

  it.each([[[]], [["--ts-summary"]], [["--ts-summary", "--write"]]])("is undefined for %j", (argv) => {
    expect(tsSummaryArg(argv)).toBeUndefined();
  });
});

describe("codeSpan", () => {
  it("widens the fence beyond any backtick run and pads edge backticks", () => {
    expect(codeSpan("a``b")).toBe("```a``b```");
    expect(codeSpan("`a")).toBe("`` `a ``");
    expect(codeSpan("a\n b")).toBe("`a b`");
  });
});
