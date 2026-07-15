# Workflow Syntax Highlighting Triage & Tests

This note documents a lightweight process for triaging syntax-highlighting bugs in workflow files and turning them into fixture-based regression tests.

## What this covers

This is for **TextMate grammar / tokenization** issues in:

- `language/syntaxes/yaml.tmLanguage.json`
- `language/syntaxes/expressions.tmGrammar.json`
- workflow syntax injection grammars (for embedded languages)

This is **not** the right path for:

- parser/validation diagnostics from language services
- schema/completion issues
- runtime extension behavior

## Triage checklist (quick)

1. Reproduce in `GitHub Actions Workflow` language mode.
2. Run `Developer: Inspect Editor Tokens and Scopes`.
3. Check whether the bug is:
   - wrong token scopes/colors (grammar bug)
   - a diagnostic/problem message (language service/parser bug)
4. Identify likely grammar file:
   - inline `${{ }}` / `if:` expression behavior: `language/syntaxes/expressions.tmGrammar.json`
   - general YAML tokenization/comments/keys/scalars: `language/syntaxes/yaml.tmLanguage.json`
   - embedded JS/shell/etc: injection grammar(s)
5. Add a fixture and a focused regression test before patching.

## What to ask for in a bug report

If the issue is syntax highlighting, ask for:

- a minimal workflow snippet (`.yml`)
- exact line/token that looks wrong
- screenshot (optional but helpful)
- token inspector output for the wrong token (`textmate scopes`)
- expected behavior (what scope/color should have happened)

Ideally, contributors can include a minimal repro snippet that can be copied directly into a fixture file.

## Current test utilities

Shared helpers live in:

- `src/workflow/syntax/syntax-test-utils.ts`

Current tests live in:

- `src/workflow/syntax/*.test.ts`

Current fixture files live in:

- `src/workflow/syntax/fixtures/`

The helpers are intentionally lightweight and focus on grammar-regression behavior (not VS Code integration tests).

## Which helper to use

- `readJson(relativePath)`
  - Use to load grammar JSON files from `language/syntaxes/`.
- `readFixture(relativePath)`
  - Use to load YAML fixture files from `src/workflow/syntax/fixtures/`.
- `analyzeSingleOuterEmbeddedBlockFixture(...)`
  - Use when grammar has one outer context and one embedded block rule inside it (for example `github-script` + `with.script`).
- `analyzeTopLevelInjectionContexts(...)`
  - Use when grammar has multiple top-level included contexts (for example `run` + `shell` per-shell contexts).
- `findGithubActionsInlineExpression(line)`
  - Use in expression-regression tests that need to ensure `${{ ... }}` does not terminate on `}}` inside quoted strings (for example `#223`).

## Fixture naming

Use behavior-based, kebab-case fixture names:

- format: `<behavior>.yml`
- examples:
  - `if-comment-after-string.yml`
  - `expression-nested-braces.yml`
  - `run-shell-embedded.yml`

Avoid issue-number-only names in fixture filenames. Issue references should live in test comments or fixture comments.

## Adding a new grammar regression test

1. Add a minimal fixture file under `src/workflow/syntax/fixtures/`
2. Add/extend a Jest test in `src/workflow/syntax/*.test.ts`
3. Keep assertions narrow (what should be embedded, what should not be consumed, header/body boundaries, etc.)
4. Run `npm test`

## Example: `#531`-style triage (inline comment after `if:`)

Issue type:

- likely grammar tokenization bug in `language/syntaxes/expressions.tmGrammar.json`
- symptom: `if: ... 'string' # comment` does not highlight the comment as a YAML comment

Suggested test plan:

1. Add a fixture with lines like:

    ```yaml
    jobs:
      test:
        if: matrix.os != 'macos-latest' # Cache causes errors on macOS
    ```

2. Add a focused test for the `if-expression` rule behavior in `expressions.tmGrammar.json`
3. Verify the expression matcher does not swallow the trailing comment, while preserving `#` inside quoted strings

Note:

- This kind of issue may need a new small helper in `syntax-test-utils.ts` for line/capture-level grammar matching, in addition to the embedded-block helpers already present.

## Proposed pattern for community-submitted failing tests

For syntax-highlighting bugs in this area, contributors can submit:

1. A fixture file in `src/workflow/syntax/fixtures/`
2. A failing Jest assertion in `src/workflow/syntax/*.test.ts`
3. A short comment linking the issue number and describing the expected scopes/behavior

That gives maintainers a reproducible regression case even before a fix is implemented.
