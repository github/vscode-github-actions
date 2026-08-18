/**
 * Returns true when `character` on `line` falls inside a YAML comment.
 * `#` starts a comment unless it is inside single or double quotes.
 */
export function isYamlComment(line: string, character: number): boolean {
  const limit = Math.min(Math.max(character, 0), line.length);
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < limit; i++) {
    const ch = line[i];
    if (inDouble) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
      }
      continue;
    }
    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      }
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === "#") {
      return true;
    }
  }

  return false;
}
