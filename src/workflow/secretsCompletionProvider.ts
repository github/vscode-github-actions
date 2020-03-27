import * as vscode from "vscode";
import { getClient } from "../api/api";
import { getPAT } from "../auth/pat";
import { getGitHubProtocol } from "../git/repository";
import { ActionsListSecretsForRepoResponseItem } from "@octokit/rest";

export class SecretsCompletionItemProvider
  implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[]> {
    const linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);
    if (!linePrefix.endsWith("secrets.")) {
      return [];
    }

    const token = await getPAT();
    if (!token) {
      return [];
    }

    const repo = await getGitHubProtocol();
    if (!repo) {
      return [];
    }

    const client = getClient(token);

    const result = await client.actions.listSecretsForRepo({
      owner: repo.owner,
      repo: repo.repositoryName
    });

    const data = (result.data as any) as ActionsListSecretsForRepoResponseItem;
    const secrets = data.secrets;

    const range = new vscode.Range(
      new vscode.Position(
        position.line,
        position.character - "secrets.".length
      ),
      position
    );

    const completions = [
      createCompletionItem("GITHUB_TOKEN"),
      ...secrets.map(s => createCompletionItem(s.name))
    ];

    return completions;
  }
}

function createCompletionItem(label: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Constant
  );
  return item;
}
