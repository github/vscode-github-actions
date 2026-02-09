
import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";
import {VariableCommandArgs} from "../../treeViews/settings/variableNode";

type CopyCommandArgs = SecretCommandArgs | VariableCommandArgs;
type SettingType = "secret" | "variable";
type CopyPart = "name" | "value";

export function registerCopySetting(context: vscode.ExtensionContext, type: SettingType, part?: CopyPart) {
  const command = part ? `github-actions.settings.${type}.copy-${part}` : `github-actions.settings.${type}.copy`;

  context.subscriptions.push(
    vscode.commands.registerCommand(command, async (args: CopyCommandArgs) => {
      let value: string;
      if (type === "secret") {
        value = (args as SecretCommandArgs).secret.name;
      } else {
        if (part === "name") {
          value = (args as VariableCommandArgs).variable.name;
        } else {
          value = (args as VariableCommandArgs).variable.value;
        }
      }

      await vscode.env.clipboard.writeText(value);

      vscode.window.setStatusBarMessage(`Copied ${value}`, 2000);
    })
  );
}
