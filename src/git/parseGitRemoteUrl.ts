/**
 * Parse a git remote URL from a .git/config file content.
 * Tries the specified remote name first, falls back to the first available remote.
 */
export function parseGitRemoteUrl(gitConfig: string, remoteName: string): string | undefined {
  const remoteRegex = /\[remote "([^"]+)"\]\s*\n((?:\s+[^[].+\n?)*)/g;
  const urlRegex = /\s*url\s*=\s*(.+)/;

  let fallbackUrl: string | undefined;
  let match: RegExpExecArray | null;

  while ((match = remoteRegex.exec(gitConfig)) !== null) {
    const name = match[1];
    const body = match[2];
    const urlMatch = body.match(urlRegex);

    if (urlMatch) {
      const url = urlMatch[1].trim();
      if (name === remoteName) {
        return url;
      }
      if (!fallbackUrl) {
        fallbackUrl = url;
      }
    }
  }

  return fallbackUrl;
}
