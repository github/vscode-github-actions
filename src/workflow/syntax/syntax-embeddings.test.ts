import {describe, expect, it} from "@jest/globals";
import {
  analyzeSingleOuterEmbeddedBlockFixture,
  analyzeTopLevelInjectionContexts,
  type GrammarRule,
  readFixture,
  readJson
} from "./syntax-test-utils";

describe("workflow syntax embedding grammars", () => {
  it("embeds JavaScript only in actions/github-script with.script block bodies", () => {
    const grammar = readJson<{patterns: [GrammarRule]}>("language/syntaxes/github-script-embedded.tmLanguage.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/github-script-embedded.yml");

    const result = analyzeSingleOuterEmbeddedBlockFixture(fixture, grammar, "meta.embedded.block.javascript", line =>
      /uses\s*:\s*actions\/github-script\b/.test(line)
    );
    const lines = fixture.split(/\r?\n/);

    expect(result.outerStartLines).toHaveLength(1);
    expect(result.embeddedHeaderLines).toHaveLength(1);
    expect(lines[result.outerStartLines[0] - 1]).toMatch(/uses:\s*["']?actions\/github-script@/);
    expect(lines[result.embeddedHeaderLines[0] - 1]).toContain("script: |");

    const embeddedBodyText = result.embeddedBodyLines.map(lineNo => lines[lineNo - 1]).join("\n");
    expect(embeddedBodyText).toContain("const issue = context.issue;");
    expect(embeddedBodyText).toContain('body: "hello"');
    expect(embeddedBodyText).not.toContain("uses: actions/github-script@");
    expect(embeddedBodyText).not.toContain("with:");
    expect(embeddedBodyText).not.toContain("script: |");
    expect(embeddedBodyText).not.toContain("retries:");
  });

  it("embeds run blocks based on prior explicit shell in same step", () => {
    const grammar = readJson<{
      patterns: Array<{include: string}>;
      repository: Record<string, GrammarRule>;
    }>("language/syntaxes/run-shell-embedded.tmLanguage.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/run-shell-embedded.yml");

    const result = analyzeTopLevelInjectionContexts(fixture, grammar);
    const lines = fixture.split(/\r?\n/);

    expect(result.embeddedHeaders).toHaveLength(3);
    expect(result.embeddedHeaders.map(h => [h.repoKey, h.embeddedScope])).toEqual([
      ["shell-powershell", "meta.embedded.block.powershell"],
      ["shell-bash", "meta.embedded.block.shellscript"],
      ["shell-node", "meta.embedded.block.javascript"]
    ]);
    for (const header of result.embeddedHeaders) {
      expect(lines[header.lineNo - 1]).toContain("run:");
    }
  });

  it("supports comments on github-script uses/script headers for quoted and unquoted uses", () => {
    const grammar = readJson<{patterns: [GrammarRule]}>("language/syntaxes/github-script-embedded.tmLanguage.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/github-script-comments.yml");
    const outerBegin = new RegExp(grammar.patterns[0].begin);

    const result = analyzeSingleOuterEmbeddedBlockFixture(fixture, grammar, "meta.embedded.block.javascript", line =>
      /uses\s*:\s*["']?actions\/github-script\b/.test(line)
    );
    const lines = fixture.split(/\r?\n/);
    const unquotedUsesLine = lines.find(line => line.includes("uses: actions/github-script@v8"));
    const quotedUsesLine = lines.find(line => line.includes('uses: "actions/github-script@v8"'));
    const unquotedUsesMatch = unquotedUsesLine ? outerBegin.exec(unquotedUsesLine) : null;
    const quotedUsesMatch = quotedUsesLine ? outerBegin.exec(quotedUsesLine) : null;

    expect(result.outerStartLines).toHaveLength(2);
    expect(result.embeddedHeaderLines).toHaveLength(2);
    expect(lines[result.outerStartLines[0] - 1]).toContain("uses: actions/github-script@v8");
    expect(lines[result.outerStartLines[0] - 1]).toContain("# unquoted uses comment");
    expect(lines[result.outerStartLines[1] - 1]).toContain('uses: "actions/github-script@v8"');
    expect(lines[result.outerStartLines[1] - 1]).toContain("# quoted uses comment");
    expect(unquotedUsesLine).toBeDefined();
    expect(quotedUsesLine).toBeDefined();
    expect(unquotedUsesMatch).not.toBeNull();
    expect(quotedUsesMatch).not.toBeNull();
    expect(unquotedUsesMatch![0]).toBe("");
    expect(quotedUsesMatch![0]).toBe("");
    expect(lines[result.embeddedHeaderLines[0] - 1]).toContain("# comment on script header (unquoted uses)");
    expect(lines[result.embeddedHeaderLines[1] - 1]).toContain("# comment on script header (quoted uses)");

    const embeddedBodyText = result.embeddedBodyLines.map(lineNo => lines[lineNo - 1]).join("\n");
    expect(embeddedBodyText).toContain("const unquoted = true;");
    expect(embeddedBodyText).toContain("const quoted = true;");
  });

  it("does not embed non-block run values even when shell is explicit", () => {
    const grammar = readJson<{
      patterns: Array<{include: string}>;
      repository: Record<string, GrammarRule>;
    }>("language/syntaxes/run-shell-embedded.tmLanguage.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/run-shell-edge-cases.yml");

    const result = analyzeTopLevelInjectionContexts(fixture, grammar);
    const lines = fixture.split(/\r?\n/);

    expect(result.embeddedHeaders).toHaveLength(1);
    expect(result.embeddedHeaders[0].repoKey).toBe("shell-powershell");
    expect(result.embeddedHeaders[0].embeddedScope).toBe("meta.embedded.block.powershell");
    expect(lines[result.embeddedHeaders[0].lineNo - 1]).toContain("run: |");
  });
});
