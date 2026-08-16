import {ShellAnalyzer} from "./shellAnalyzer";
import {TokenType} from "@actions/workflow-parser/templates/tokens/types";
import {NoOperationTraceWriter, parseWorkflow, TemplateParseResult} from "@actions/workflow-parser";
import {TemplateToken} from "@actions/workflow-parser/templates/tokens/template-token";
import {parseAction} from "@actions/workflow-parser/actions/index";

describe("ShellAnalyzer", () => {
  let analyzer: ShellAnalyzer;

  beforeEach(() => {
    analyzer = new ShellAnalyzer();
  });

  describe("empty workflows", () => {
    it("returns empty array for undefined workflow", () => {
      expect(analyzer.analyze(undefined)).toEqual([]);
    });

    it("returns empty array for non-mapping token", () => {
      const workflow = createWorkflow(`
        - foo
        - bar
        `);

      expect(workflow.templateTokenType).toBe(TokenType.Sequence);
      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("returns empty array for workflow with no jobs or defaults", () => {
      const workflow = createWorkflow(`
        name: Test
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });
  });

  describe("workflow defaults shell", () => {
    it("no diagnostic when shell is defined before jobs", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        defaults:
          run:
            shell: bash

        jobs:
          job:
            steps:
              - uses: foo/bar@main
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("no diagnostic when defaults are defined after jobs but have no shell", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          job:
            steps:
              - uses: foo/bar@main

        defaults:
          run:
            working-directory: here
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("creates diagnostic when shell is defined after jobs", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          job:
            steps:
              - uses: foo/bar@main

        defaults:
          run:
            shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 11,
          startColumn: 4,
          endLine: 11,
          endColumn: 9,
          message: "Define the workflow's defaults before the jobs to enable script syntax highlighting."
        }
      ]);
    });
  });

  describe("job defaults shell", () => {
    it("no diagnostic when shell is defined before steps", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          job:
            defaults:
              run:
                shell: bash

            steps:
              - uses: foo/bar@main
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("no diagnostic when defaults are defined after steps but have no shell", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          job:
            steps:
              - uses: foo/bar@main

            defaults:
              run:
                working-directory: here
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("creates diagnostic when shell is defined after steps", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          job:
            steps:
              - uses: foo/bar@main

            defaults:
              run:
                shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 11,
          startColumn: 8,
          endLine: 11,
          endColumn: 13,
          message: "Define the job's defaults before the steps to enable script syntax highlighting."
        }
      ]);
    });

    it("analyzes multiple jobs", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - uses: foo/bar@main

            defaults:
              run:
                shell: bash

          b:
            steps:
              - uses: foo/bar@main

            defaults:
              run:
                shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 11,
          startColumn: 8,
          endLine: 11,
          endColumn: 13,
          message: "Define the job's defaults before the steps to enable script syntax highlighting."
        },
        {
          startLine: 19,
          startColumn: 8,
          endLine: 19,
          endColumn: 13,
          message: "Define the job's defaults before the steps to enable script syntax highlighting."
        }
      ]);
    });
  });

  describe("step shell", () => {
    it("no diagnostic when shell is defined before run", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - shell: bash
                run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("no diagnostic when job has default shell", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            defaults:
              run:
                shell: bash

            steps:
              - run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("no diagnostic when workflow has default shell", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        defaults:
          run:
            shell: bash

        jobs:
          a:
            steps:
              - run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("no diagnostic when workflow and job have default shell", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        defaults:
          run:
            shell: bash

        jobs:
          a:
            defaults:
              run:
                shell: sh

            steps:
              - run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("creates diagnostic when shell is defined after run", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        defaults:
          run:
            shell: bash

        jobs:
          a:
            defaults:
              run:
                shell: sh

            steps:
              - run: exit 0
                shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 16,
          startColumn: 8,
          endLine: 16,
          endColumn: 13,
          message: "Define the shell property before the run property to enable script syntax highlighting."
        }
      ]);
    });

    it("creates diagnostic when shell is not defined", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 7,
          startColumn: 8,
          endLine: 7,
          endColumn: 11,
          message: "Add a shell property to enable script syntax highlighting."
        }
      ]);
    });

    it("no diagnostic when step has no run property", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - uses: foo/bar@main
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("analyzes multiple steps", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - run: exit 0
              - run: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 7,
          startColumn: 8,
          endLine: 7,
          endColumn: 11,
          message: "Add a shell property to enable script syntax highlighting."
        },
        {
          startLine: 8,
          startColumn: 8,
          endLine: 8,
          endColumn: 11,
          message: "Add a shell property to enable script syntax highlighting."
        }
      ]);
    });

    it("analyzes parallel steps", () => {
      const workflow = createWorkflow(`
        name: Test

        on: workflow_dispatch

        jobs:
          a:
            steps:
              - shell: bash
                run: exit 0

              - parallel:
                - name: One
                  run: exit 0

                - name: Two
                  run: exit 0
                  shell: bash

              - name: Build docs
                run: exit 0
                shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 12,
          startColumn: 10,
          endLine: 12,
          endColumn: 13,
          message: "Add a shell property to enable script syntax highlighting."
        },
        {
          startLine: 16,
          startColumn: 10,
          endLine: 16,
          endColumn: 15,
          message: "Define the shell property before the run property to enable script syntax highlighting."
        },
        {
          startLine: 20,
          startColumn: 8,
          endLine: 20,
          endColumn: 13,
          message: "Define the shell property before the run property to enable script syntax highlighting."
        }
      ]);
    });
  });

  describe("composite actions", () => {
    it("no diagnostic when shell is before run", () => {
      const workflow = createAction(`
        name: Test

        description: Test

        runs:
          using: composite
          steps:
            - name: Step
              shell: bash
              runs: exit 0
        `);

      expect(analyzer.analyze(workflow)).toEqual([]);
    });

    it("creates diagnostic when shell is after run", () => {
      const workflow = createAction(`
        name: Test

        description: Test

        runs:
          using: composite
          steps:
            - name: Step
              run: exit 0
              shell: bash
        `);

      expect(analyzer.analyze(workflow)).toEqual([
        {
          startLine: 9,
          startColumn: 6,
          endLine: 9,
          endColumn: 11,
          message: "Define the shell property before the run property to enable script syntax highlighting."
        }
      ]);
    });
  });
});

function createWorkflow(content: string): TemplateToken {
  const result = parseWorkflow({name: "workflow.yml", content: dedent(content)}, new NoOperationTraceWriter());

  if (result?.value) {
    return result.value;
  }

  throw newParseError("Failed to parse workflow", result);
}

function createAction(content: string): TemplateToken {
  const result = parseAction({name: "action.yml", content: dedent(content)}, new NoOperationTraceWriter());

  if (result?.value) {
    return result.value;
  }

  throw newParseError("Failed to parse action", result);
}

function dedent(content: string): string {
  // Find the indent from the first non-blank line. The content
  // probably starts with a blank line, so we ignore that line.
  const indent = content.match(/^( +)/gm)?.[1].length ?? 0;

  // Trim that number of spaces from the start of each
  // line, then trim the start so that we get rid of
  // the blank line that probably starts the content.
  return content.replace(new RegExp(`^ {${indent}}`, "gm"), "").trimStart();
}

function newParseError(message: string, result: TemplateParseResult): Error {
  if (result.context.errors.count > 0) {
    throw new Error([`${message}: `, ...result.context.errors.getErrors().map(x => x.rawMessage)].join("\n"));
  } else {
    throw new Error(message);
  }
}
