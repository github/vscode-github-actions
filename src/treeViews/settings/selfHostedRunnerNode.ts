import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { SelfHostedRunner } from "../../model";
import { getAbsoluteIconPath } from "../icons";

export class SelfHostedRunnerNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly selfHostedRunner: SelfHostedRunner,
  ) {
    super(selfHostedRunner.name);

    this.contextValue = "runner";
    this.tooltip = this.selfHostedRunner.status;
    this.iconPath = getAbsoluteIconPath(
      this.selfHostedRunner.status == "online" ? "runner-online.svg" : "runner-offline.svg",
    );
  }
}
