import * as vscode from "vscode";
import * as path from "path";
import {NoOperationTraceWriter, parseWorkflow, TemplateParseResult} from "@actions/workflow-parser";
import {parseAction} from "@actions/workflow-parser/actions/index";
import {ShellAnalyzer} from "./shellAnalyzer";

const documents: Map<vscode.TextDocument, DocumentInfo> = new Map();

export function registerShellDiagnostics(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection("GitHub Actions");

  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument(document => onDidOpenTextDocument(document, diagnostics)),
    vscode.workspace.onDidCloseTextDocument(document => onDidCloseTextDocument(document, diagnostics)),
    vscode.workspace.onDidChangeTextDocument(event => onDidChangeTextDocument(event, diagnostics))
  );

  if (vscode.window.activeTextEditor?.document) {
    onDidOpenTextDocument(vscode.window.activeTextEditor.document, diagnostics);
  }
}

function onDidOpenTextDocument(document: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void {
  if (isWorkflowOrAction(document)) {
    scheduleAnalysis(document, diagnostics);
  }
}

function onDidCloseTextDocument(document: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void {
  if (isWorkflowOrAction(document)) {
    // Clear the diagnostics for the file because they're
    // only useful if you actually have the file open.
    diagnostics.set(document.uri, []);

    const info = documents.get(document);
    if (info) {
      info.cancelled = true;

      if (info.debounceTimer) {
        clearTimeout(info.debounceTimer);
      }

      documents.delete(document);
    }
  }
}

function onDidChangeTextDocument(
  event: vscode.TextDocumentChangeEvent,
  diagnostics: vscode.DiagnosticCollection
): void {
  if (isWorkflowOrAction(event.document)) {
    scheduleAnalysis(event.document, diagnostics);
  }
}

function isWorkflowOrAction(document: vscode.TextDocument): boolean {
  return document.languageId === "github-actions-workflow";
}

function scheduleAnalysis(document: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void {
  const info = getOrCreateDocumentInfo(document);

  // Restart the debounce timer.
  if (info.debounceTimer) {
    clearTimeout(info.debounceTimer);
  }

  info.debounceTimer = setTimeout(() => {
    info.debounceTimer = undefined;
    if (!info.cancelled) {
      analyzeShell(info, diagnostics);
    }
  }, 1000);
}

function getOrCreateDocumentInfo(document: vscode.TextDocument): DocumentInfo {
  let info = documents.get(document);

  if (!info) {
    info = {document};
    documents.set(document, info);
  }

  return info;
}

function analyzeShell(documentInfo: DocumentInfo, diagnostics: vscode.DiagnosticCollection): void {
  const contents = parseDocument(documentInfo.document);

  if (documentInfo.cancelled) {
    return;
  }

  diagnostics.set(
    documentInfo.document.uri,
    new ShellAnalyzer()
      .analyze(contents?.value)
      .map(
        d =>
          new vscode.Diagnostic(
            new vscode.Range(d.startLine, d.startColumn, d.endLine, d.endColumn),
            d.message,
            vscode.DiagnosticSeverity.Information
          )
      )
  );
}

function parseDocument(document: vscode.TextDocument): TemplateParseResult | undefined {
  const name = path.basename(document.uri.fsPath);
  const parser = /action\.ya?ml$/.test(name) ? parseAction : parseWorkflow;

  try {
    return parser({name, content: document.getText()}, new NoOperationTraceWriter());
  } catch {
    return undefined;
  }
}

interface DocumentInfo {
  readonly document: vscode.TextDocument;
  debounceTimer?: ReturnType<typeof setTimeout>;
  cancelled?: boolean;
}
