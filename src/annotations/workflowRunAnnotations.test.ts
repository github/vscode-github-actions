import {toDiagnosticAnnotation} from "./workflowRunAnnotations";

describe("toDiagnosticAnnotation", () => {
  it.each([
    ["failure", "error"],
    ["warning", "warning"],
    ["notice", "information"]
  ] as const)("maps %s annotations to %s diagnostics", (annotation_level, severity) => {
    expect(
      toDiagnosticAnnotation({
        annotation_level,
        end_column: 8,
        end_line: 4,
        message: "Expected a value",
        path: "src/index.ts",
        start_column: 2,
        start_line: 3,
        title: "Type check"
      })
    ).toEqual({
      endColumn: 8,
      endLine: 4,
      message: "Type check: Expected a value",
      path: "src/index.ts",
      severity,
      startColumn: 2,
      startLine: 3
    });
  });
});
