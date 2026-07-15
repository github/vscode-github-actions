/* eslint-disable @typescript-eslint/no-non-null-assertion --
 * Test code intentionally dereferences values after explicit existence/null checks
 * to keep expectations concise and readable.
 */
import {describe, expect, it} from "@jest/globals";
import {
  findGithubActionsExpressionInText,
  findGithubActionsInlineExpression,
  readFixture,
  readJson
} from "./syntax-test-utils";

type ExpressionsGrammar = {
  repository: {
    "block-inline-expression": {
      begin: string;
      end: string;
      patterns: Array<{include: string}>;
    };
    expression: {
      patterns: Array<{include: string}>;
    };
    "if-expression": {
      match: string;
    };
    "block-if-expression": {
      begin: string;
      beginCaptures: {
        "6": {
          patterns: Array<{include: string}>;
        };
      };
    };
    "op-comparison": {
      match: string;
    };
    "op-logical": {
      match: string;
    };
  };
};

function collectInlineExpressions(line: string): string[] {
  const result: string[] = [];
  let offset = 0;

  while (offset < line.length) {
    const chunk = line.slice(offset);
    const extracted = findGithubActionsInlineExpression(chunk);
    if (!extracted) {
      break;
    }
    result.push(extracted);
    const localIndex = chunk.indexOf(extracted);
    offset += localIndex + extracted.length;
  }

  return result;
}

describe("workflow expression syntax highlighting", () => {
  // Regression test for https://github.com/github/vscode-github-actions/issues/531
  it("does not swallow trailing YAML comments on if: lines after quoted strings (#531)", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/if-comment-after-string.yml");
    const ifLine = fixture.split(/\r?\n/).find(line => line.includes("if: matrix.os != 'macos-latest' #"));

    expect(ifLine).toBeDefined();

    const ifExpression = new RegExp(grammar.repository["if-expression"].match);
    const match = ifExpression.exec(ifLine!);

    expect(match).not.toBeNull();
    expect(match![1]).toBe("if:");

    // Desired behavior: the expression capture should stop before the YAML comment.
    // Current bug (#531): capture 2 includes the trailing "# ...", preventing comment tokenization.
    expect(match![2]).toBe("matrix.os != 'macos-latest'");
    expect(match![3]).toBe(" # Cache causes errors on macOS");
  });

  // Regression test for https://github.com/github/vscode-github-actions/issues/223
  it("does not terminate ${{ }} expression early when }} appears inside quoted strings", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/expression-nested-braces.yml");
    const matrixLine = fixture.split(/\r?\n/).find(line => line.includes("matrix: ${{"));

    expect(matrixLine).toBeDefined();
    expect(grammar.repository["block-inline-expression"]).toBeDefined();
    expect(grammar.repository.expression.patterns).toContainEqual({include: "#string"});

    const extracted = findGithubActionsInlineExpression(matrixLine!);
    expect(extracted).toBe("${{ fromJSON(format('{{\"linting\":[\"{0}\"]}}', 'ubuntu-latest')).linting }}");
  });

  it("supports block if-expression syntax (if: | / if: >)", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/if-block-expression.yml");
    const ifLiteralLine = fixture.split(/\r?\n/).find(line => /^\s*if:\s*\|(?:\s+#.*)?$/.test(line));
    const ifFoldedLine = fixture.split(/\r?\n/).find(line => /^\s*if:\s*>(?:\s+#.*)?$/.test(line));

    expect(ifLiteralLine).toBeDefined();
    expect(ifFoldedLine).toBeDefined();
    expect(grammar.repository["block-if-expression"]).toBeDefined();

    const blockIfBegin = new RegExp(grammar.repository["block-if-expression"].begin);
    expect(blockIfBegin.test(ifLiteralLine!)).toBe(true);
    expect(blockIfBegin.test(ifFoldedLine!)).toBe(true);
  });

  it("supports multi-line inline expressions", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/expression-multiline.yml");

    expect(grammar.repository["block-inline-expression"]).toBeDefined();
    expect(grammar.repository["block-inline-expression"].begin).toContain("\\$\\{\\{");
    expect(grammar.repository["block-inline-expression"].end).toContain("\\}\\}");

    const extracted = findGithubActionsExpressionInText(fixture);
    expect(extracted).not.toBeNull();
    expect(extracted).toContain("${{ format(");
    expect(extracted).toContain("github.ref");
    expect(extracted).toContain("github.sha");
    expect(extracted).toContain(") }}");
  });

  it("supports logical and comparison operators in expression patterns", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");

    expect(grammar.repository["op-comparison"]).toBeDefined();
    expect(grammar.repository["op-logical"]).toBeDefined();

    const comparison = new RegExp(grammar.repository["op-comparison"].match, "g");
    const logical = new RegExp(grammar.repository["op-logical"].match, "g");
    const sample = "github.ref == 'refs/heads/main' && github.event_name != 'pull_request' || false";

    expect(sample.match(comparison)).toEqual(["==", "!="]);
    expect(sample.match(logical)).toEqual(["&&", "||"]);
  });

  it("keeps # inside quoted strings and still separates trailing comments on if: lines", () => {
    const grammar = readJson<ExpressionsGrammar>("language/syntaxes/expressions.tmGrammar.json");
    const fixture = readFixture("src/workflow/syntax/fixtures/if-inline-edge-cases.yml");
    const lines = fixture.split(/\r?\n/);
    const hashLine = lines.find(line => line.includes("if: contains(github.ref, '#main') #"));
    const escapedLine = lines.find(line => line.includes("if: github.ref == 'it''s-main' #"));

    expect(hashLine).toBeDefined();
    expect(escapedLine).toBeDefined();

    const ifExpression = new RegExp(grammar.repository["if-expression"].match);
    const hashMatch = ifExpression.exec(hashLine!);
    const escapedMatch = ifExpression.exec(escapedLine!);

    expect(hashMatch).not.toBeNull();
    expect(escapedMatch).not.toBeNull();
    expect(hashMatch![2]).toBe("contains(github.ref, '#main')");
    expect(escapedMatch![2]).toBe("github.ref == 'it''s-main'");
    expect(hashMatch![3]).toBe(" # trailing comment");
    expect(escapedMatch![3]).toBe(" # escaped quote case");
  });

  it("handles multiple inline expressions on one line", () => {
    const fixture = readFixture("src/workflow/syntax/fixtures/inline-multiple-expressions.yml");
    const combinedLine = fixture.split(/\r?\n/).find(line => line.includes("COMBINED: "));

    expect(combinedLine).toBeDefined();
    const extracted = collectInlineExpressions(combinedLine!);

    expect(extracted).toEqual(["${{ github.ref }}", "${{ github.sha }}"]);
  });
});
