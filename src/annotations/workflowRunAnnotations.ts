export interface WorkflowRunAnnotation {
  annotation_level: "failure" | "warning" | "notice";
  end_column: number;
  end_line: number;
  message: string;
  path: string;
  start_column: number;
  start_line: number;
  title: string;
}

export type AnnotationSeverity = "error" | "warning" | "information";

export interface DiagnosticAnnotation {
  endColumn: number;
  endLine: number;
  message: string;
  path: string;
  severity: AnnotationSeverity;
  startColumn: number;
  startLine: number;
}

export function toDiagnosticAnnotation(annotation: WorkflowRunAnnotation): DiagnosticAnnotation {
  return {
    path: annotation.path,
    startLine: annotation.start_line,
    startColumn: annotation.start_column,
    endLine: annotation.end_line,
    endColumn: annotation.end_column,
    message: annotation.title ? `${annotation.title}: ${annotation.message}` : annotation.message,
    severity:
      annotation.annotation_level === "failure"
        ? "error"
        : annotation.annotation_level === "warning"
        ? "warning"
        : "information"
  };
}
