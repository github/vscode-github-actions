import * as keytarType from "keytar";
import { env } from "vscode";

declare const __webpack_require__: typeof require;
declare const __non_webpack_require__: typeof require;
function getNodeModule<T>(moduleName: string): T | undefined {
  const r =
    typeof __webpack_require__ === "function"
      ? __non_webpack_require__
      : require;
  try {
    return r(`${env.appRoot}/node_modules.asar/${moduleName}`);
  } catch (err) {
    // Not in ASAR.
  }
  try {
    return r(`${env.appRoot}/node_modules/${moduleName}`);
  } catch (err) {
    // Not available.
  }
  return undefined;
}

function getKeytar(): typeof keytarType {
  const keytar = getNodeModule<typeof keytarType>("keytar");
  if (!keytar) {
    throw new Error("Keytar module for secure token storage not found");
  }

  return keytar;
}

const ServiceName = "VS Code GitHub Actions";

export async function getPAT(): Promise<string | null> {
  return getKeytar().getPassword(ServiceName, "pat");
}

export async function setPAT(token: string): Promise<void> {
  return getKeytar().setPassword(ServiceName, "pat", token);
}
