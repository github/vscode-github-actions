import fs from "fs";
import path from "path";

type Rule = {match?: string; patterns?: {include: string}[]};

const grammar = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "language/syntaxes/lockfile.tmGrammar.json"), "utf8")
) as {repository: Record<string, Rule>};

const pinRules = (grammar.repository.pin.patterns ?? []).map(
  p => new RegExp(grammar.repository[p.include.slice(1)].match ?? "", "g")
);

// Mirrors TextMate scanning: at each position the earliest match wins, ties go to the first rule.
function refs(line: string): string[] {
  const found: string[] = [];
  let pos = 0;
  for (;;) {
    let best: RegExpExecArray | null = null;
    for (const re of pinRules) {
      re.lastIndex = pos;
      const m = re.exec(line);
      if (m && (!best || m.index < best.index)) best = m;
    }
    if (!best) return found;
    found.push(best[5]);
    pos = best.index + best[0].length;
  }
}

describe("lockfile pin grammar", () => {
  it("captures the full ref in quoted entries, including # and ,", () => {
    expect(refs("        - 'actions/checkout@release#1'")).toEqual(["release#1"]);
    expect(refs('        - "actions/checkout@release,1"')).toEqual(["release,1"]);
    expect(refs("    'actions/checkout@feature/x#2,3':")).toEqual(["feature/x#2,3"]);
  });

  it("keeps # in plain refs but stops at comments and flow separators", () => {
    expect(refs("        - actions/checkout@release#1 # note")).toEqual(["release#1"]);
    expect(refs("        - [actions/checkout@v1, actions/setup-node@v2]")).toEqual(["v1", "v2"]);
  });

  it("does not run past the closing quote", () => {
    expect(refs("    'actions/checkout@v4':")).toEqual(["v4"]);
  });
});
