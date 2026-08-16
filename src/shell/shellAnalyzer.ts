import {MappingToken} from "@actions/workflow-parser/templates/tokens/mapping-token";
import {TemplateToken} from "@actions/workflow-parser/templates/tokens/template-token";
import {TokenType} from "@actions/workflow-parser/templates/tokens/types";
import {TokenRange} from "@actions/workflow-parser/templates/tokens/token-range";
import {SequenceToken} from "@actions/workflow-parser/templates/tokens/sequence-token";
import {StringToken} from "@actions/workflow-parser/templates/tokens/string-token";

export class ShellAnalyzer {
  public analyze(root: TemplateToken | undefined): ShellDiagnostic[] {
    const state: WorkflowState = {
      visitedJobs: false,
      defaultShell: undefined,
      diagnostics: []
    };

    if (root !== undefined && isMapping(root)) {
      for (const item of root) {
        switch (item.key.toString()) {
          case "defaults":
            this.visitWorkflowDefaults(item.value, state);
            break;

          case "jobs":
            this.visitJobs(item.value, state);
            state.visitedJobs = true;
            break;

          case "runs":
            this.visitCompositeActionRuns(item.value, state);
            break;
        }
      }
    }

    return state.diagnostics;
  }

  private visitWorkflowDefaults(defaults: TemplateToken, state: WorkflowState): void {
    if (!isMapping(defaults)) {
      return undefined;
    }

    for (const item of defaults) {
      if (item.key.toString() === "run") {
        this.visitWorkflowDefaultsRun(item.value, state);
        return;
      }
    }
  }

  private visitWorkflowDefaultsRun(run: TemplateToken, state: WorkflowState): void {
    if (!isMapping(run)) {
      return;
    }

    for (const item of run) {
      if (item.key.toString() === "shell") {
        if (state.visitedJobs) {
          // We've already visited the jobs, so the workflow's defaults are
          // defined after the jobs, which means the default shell won't
          // be used for syntax highlighting. Add a diagnostic about that.
          if (item.key.range) {
            state.diagnostics.push(
              createDiagnostic(
                item.key.range,
                "Define the workflow's defaults before the jobs to enable script syntax highlighting."
              )
            );
          }
        }

        state.defaultShell = isString(item.value) ? item.value.value : "?";
        return;
      }
    }
  }

  private visitJobs(jobs: TemplateToken, state: WorkflowState): void {
    if (!isMapping(jobs)) {
      return;
    }

    for (const item of jobs) {
      if (isMapping(item.value)) {
        this.visitJob(item.value, state);
      }
    }
  }

  private visitJob(job: TemplateToken, state: WorkflowState): void {
    if (!isMapping(job)) {
      return;
    }

    const jobState: JobState = {
      visitedSteps: false,
      defaultShell: state.defaultShell,
      diagnostics: state.diagnostics
    };

    for (const item of job) {
      switch (item.key.toString()) {
        case "defaults":
          this.visitJobDefaults(item.value, jobState);
          break;

        case "steps":
          this.visitSteps(item.value, jobState);
          jobState.visitedSteps = true;
          break;
      }
    }
  }

  private visitJobDefaults(defaults: TemplateToken, state: JobState): void {
    if (!isMapping(defaults)) {
      return;
    }

    for (const item of defaults) {
      if (item.key.toString() === "run") {
        this.visitJobDefaultsRun(item.value, state);
        return;
      }
    }
  }

  private visitJobDefaultsRun(run: TemplateToken, state: JobState): void {
    if (!isMapping(run)) {
      return;
    }

    for (const item of run) {
      if (item.key.toString() === "shell") {
        if (state.visitedSteps) {
          // We've already visited the steps, so the job's defaults are
          // defined after the steps, which means the default shell won't
          // be used for syntax highlighting. Add a diagnostic about that.
          if (item.key.range) {
            state.diagnostics.push(
              createDiagnostic(
                item.key.range,
                "Define the job's defaults before the steps to enable script syntax highlighting."
              )
            );
          }
        }

        state.defaultShell = isString(item.value) ? item.value.value : "?";
        return;
      }
    }
  }

  private visitCompositeActionRuns(runs: TemplateToken, state: WorkflowState): void {
    if (!isMapping(runs)) {
      return;
    }

    for (const item of runs) {
      if (item.key.toString() === "steps") {
        this.visitSteps(item.value, {
          diagnostics: state.diagnostics,
          defaultShell: undefined
        });
        return;
      }
    }
  }

  private visitSteps(steps: TemplateToken, state: StepsState): void {
    if (!isSequence(steps)) {
      return;
    }

    for (const item of steps) {
      this.visitStep(item, state);
    }
  }

  private visitStep(step: TemplateToken, state: StepsState): void {
    if (!isMapping(step)) {
      return;
    }

    let run: TemplateToken | undefined;

    for (const item of step) {
      switch (item.key.toString()) {
        case "parallel":
          this.visitSteps(item.value, state);
          break;

        case "shell":
          if (run) {
            // We've already seen the run property, so the shell is defined
            // after the script, which means the shell won't be used for
            // syntax highlighting. Add a diagnostic about that.
            if (item.key.range) {
              state.diagnostics.push(
                createDiagnostic(
                  item.key.range,
                  "Define the shell property before the run property to enable script syntax highlighting."
                )
              );
            }
          }

          // A shell is defined for the step, so we don't have to add a
          // diagnostic explaining that a shell property will enable syntax
          // highlighting. We don't need to look at the rest of the step.
          return;

        case "run":
          // Just remember the step property here. If there is no shell
          // defined in the step, and there is no default, then we'll
          // add a diagnostic, but we need to see the rest of the
          // properties in the step first. If there's a shell after
          // the run property, then we'll add a different diagnostic.
          run = item.key;
          break;
      }
    }

    if (run?.range && state.defaultShell === undefined) {
      // The step has a run property, but no shell
      // and no default is defined. Add a diagnostic.
      state.diagnostics.push(createDiagnostic(run.range, "Add a shell property to enable script syntax highlighting."));
    }
  }
}

function isMapping(token: TemplateToken): token is MappingToken {
  return token.templateTokenType === TokenType.Mapping;
}

function isSequence(token: TemplateToken): token is SequenceToken {
  return token.templateTokenType === TokenType.Sequence;
}

function isString(token: TemplateToken): token is StringToken {
  return token.templateTokenType === TokenType.String;
}

function createDiagnostic(tokenRange: TokenRange, message: string): ShellDiagnostic {
  // Token ranges are one-based, but VS Code ranges are zero-based.
  return {
    startLine: tokenRange.start.line - 1,
    startColumn: tokenRange.start.column - 1,
    endLine: tokenRange.end.line - 1,
    endColumn: tokenRange.end.column - 1,
    message
  };
}

interface WorkflowState {
  readonly diagnostics: ShellDiagnostic[];
  visitedJobs: boolean;
  defaultShell: string | undefined;
}

interface JobState {
  readonly diagnostics: ShellDiagnostic[];
  visitedSteps: boolean;
  defaultShell: string | undefined;
}

interface StepsState {
  readonly diagnostics: ShellDiagnostic[];
  defaultShell: string | undefined;
}

export interface ShellDiagnostic {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
}
