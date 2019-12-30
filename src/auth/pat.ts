import { getPassword, setPassword, deletePassword } from "keytar";

const ServiceName = "VS Code GitHub Actions";

export async function getPAT(): Promise<string | null> {
  return getPassword(ServiceName, "pat");
}

export async function setPAT(token: string): Promise<void> {
  return setPassword(ServiceName, "pat", token);
}
