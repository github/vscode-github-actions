import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export type GrammarRule = {
  begin: string;
  end: string;
  patterns: Array<{include?: string; begin?: string; end?: string; contentName?: string}>;
};

export type EmbeddedHeader = {
  lineNo: number;
  repoKey: string;
  embeddedScope: string;
};

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

/**
 * Read and parse a JSON file from repository-relative path.
 * Use for loading TextMate grammar JSON files under `language/syntaxes/`.
 */
export function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot(), relativePath), "utf8")) as T;
}

/**
 * Read a text fixture from repository-relative path.
 * Use for loading `.yml` fixtures under `src/workflow/syntax/fixtures/`.
 */
export function readFixture(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot(), relativePath), "utf8");
}

function blockEndRegex(template: string, indent: string): RegExp {
  return new RegExp(template.replace("\\1", indent.replace(/\\/g, "\\\\")));
}

/**
 * Analyze grammars that have a single outer context rule and one embedded block rule inside it.
 *
 * Typical use:
 * - `actions/github-script` style rules where one step context contains a `script: |` block.
 *
 * Returns:
 * - line numbers where embedded headers begin (`embeddedHeaderLines`)
 * - line numbers treated as embedded body (`embeddedBodyLines`)
 * - line numbers where outer context started (`outerStartLines`)
 */
export function analyzeSingleOuterEmbeddedBlockFixture(
  text: string,
  grammar: {patterns: [GrammarRule]},
  embeddedContentName: string,
  markOuterStartLine?: (line: string) => boolean
): {
  embeddedHeaderLines: number[];
  embeddedBodyLines: number[];
  outerStartLines: number[];
} {
  const outerRule = grammar.patterns[0];
  const embeddedRule = outerRule.patterns.find(p => p.contentName === embeddedContentName);
  if (!embeddedRule?.begin || !embeddedRule.end) {
    throw new Error(`Embedded rule not found for ${embeddedContentName}`);
  }

  const outerBegin = new RegExp(outerRule.begin);
  const outerEnd = new RegExp(outerRule.end);
  const embeddedBegin = new RegExp(embeddedRule.begin);

  const lines = text.split(/\r?\n/);
  const embeddedHeaderLines: number[] = [];
  const embeddedBodyLines: number[] = [];
  const outerStartLines: number[] = [];

  let inOuter = false;
  let inEmbedded = false;
  let currentEmbeddedEnd: RegExp | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;

    if (inOuter && inEmbedded && currentEmbeddedEnd?.test(line)) {
      inEmbedded = false;
      currentEmbeddedEnd = null;
    }

    if (inOuter && !inEmbedded && outerEnd.test(line)) {
      inOuter = false;
    }

    if (!inOuter && outerBegin.test(line)) {
      inOuter = true;
      if (!markOuterStartLine || markOuterStartLine(line)) {
        outerStartLines.push(lineNo);
      }
    }

    if (inOuter && !inEmbedded) {
      const match = embeddedBegin.exec(line);
      if (match) {
        embeddedHeaderLines.push(lineNo);
        inEmbedded = true;
        currentEmbeddedEnd = blockEndRegex(embeddedRule.end, match[1]);
        continue;
      }
    }

    if (inOuter && inEmbedded) {
      embeddedBodyLines.push(lineNo);
    }
  }

  return {embeddedHeaderLines, embeddedBodyLines, outerStartLines};
}

type RunShellContext = {
  repoKey: string;
  outerBegin: RegExp;
  outerEnd: RegExp;
  runBegin: RegExp;
  runEndTemplate: string;
  embeddedScope: string;
};

/**
 * Analyze grammars that expose multiple top-level injected contexts (usually via `patterns: [{include: ...}]`).
 *
 * Typical use:
 * - `run` + `shell` embeddings where each shell has its own rule/context.
 *
 * Returns:
 * - detected embedded header occurrences with line number, repository key, and embedded scope.
 */
export function analyzeTopLevelInjectionContexts(
  text: string,
  grammar: {patterns: Array<{include: string}>; repository: Record<string, GrammarRule>}
): {
  embeddedHeaders: EmbeddedHeader[];
} {
  const contexts: RunShellContext[] = grammar.patterns.map(pattern => {
    const repoKey = pattern.include.replace(/^#/, "");
    const rule = grammar.repository[repoKey];
    if (!rule) {
      throw new Error(`Repository rule not found for ${repoKey}`);
    }
    const embeddedRule = rule.patterns.find(p => p.contentName?.startsWith("meta.embedded.block."));
    if (!embeddedRule?.begin || !embeddedRule.end || !embeddedRule.contentName) {
      throw new Error(`Embedded run rule not found for ${repoKey}`);
    }

    return {
      repoKey,
      outerBegin: new RegExp(rule.begin),
      outerEnd: new RegExp(rule.end),
      runBegin: new RegExp(embeddedRule.begin),
      runEndTemplate: embeddedRule.end,
      embeddedScope: embeddedRule.contentName
    };
  });

  const embeddedHeaders: EmbeddedHeader[] = [];
  const lines = text.split(/\r?\n/);
  let active: RunShellContext | null = null;
  let inEmbedded = false;
  let currentEmbeddedEnd: RegExp | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;

    if (active && inEmbedded && currentEmbeddedEnd?.test(line)) {
      inEmbedded = false;
      currentEmbeddedEnd = null;
    }

    if (active && !inEmbedded && active.outerEnd.test(line)) {
      active = null;
    }

    if (!active) {
      active = contexts.find(ctx => ctx.outerBegin.test(line)) ?? null;
    }

    if (active && !inEmbedded) {
      const match = active.runBegin.exec(line);
      if (match) {
        embeddedHeaders.push({
          lineNo,
          repoKey: active.repoKey,
          embeddedScope: active.embeddedScope
        });
        inEmbedded = true;
        currentEmbeddedEnd = blockEndRegex(active.runEndTemplate, match[1]);
      }
    }
  }

  return {embeddedHeaders};
}

/**
 * Extract a `${{ ... }}` inline expression from a single line while ignoring `}}` that appear
 * inside single-quoted string segments.
 *
 * This is a lightweight helper for expression-regression tests (for example issue #223), not a
 * full parser for all expression grammar edge cases.
 */
export function findGithubActionsInlineExpression(line: string): string | null {
  const start = line.indexOf("${{");
  if (start < 0) {
    return null;
  }

  let inSingleQuoted = false;

  for (let i = start + 3; i < line.length - 1; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (inSingleQuoted) {
      if (ch === "'" && next === "'") {
        i += 1;
        continue;
      }
      if (ch === "'") {
        inSingleQuoted = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingleQuoted = true;
      continue;
    }

    if (ch === "}" && next === "}") {
      return line.slice(start, i + 2);
    }
  }

  return null;
}

/**
 * Extract the first `${{ ... }}` expression from full text while ignoring `}}` that appear
 * inside single-quoted string segments.
 *
 * Useful for regression tests that assert multi-line inline expression behavior.
 */
export function findGithubActionsExpressionInText(text: string): string | null {
  const start = text.indexOf("${{");
  if (start < 0) {
    return null;
  }

  let inSingleQuoted = false;

  for (let i = start + 3; i < text.length - 1; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inSingleQuoted) {
      if (ch === "'" && next === "'") {
        i += 1;
        continue;
      }
      if (ch === "'") {
        inSingleQuoted = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingleQuoted = true;
      continue;
    }

    if (ch === "}" && next === "}") {
      return text.slice(start, i + 2);
    }
  }

  return null;
}
