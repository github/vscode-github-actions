import {parseGitRemoteUrl} from "./parseGitRemoteUrl";

describe("parseGitRemoteUrl", () => {
  const sampleGitConfig = `[core]
\trepositoryformatversion = 0
\tfilemode = true
[remote "origin"]
\turl = git@github.com:user/repo.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[remote "upstream"]
\turl = https://github.com/org/repo.git
\tfetch = +refs/heads/*:refs/remotes/upstream/*
[branch "main"]
\tremote = origin
\tmerge = refs/heads/main
`;

  it("should find the specified remote by name", () => {
    expect(parseGitRemoteUrl(sampleGitConfig, "origin")).toBe("git@github.com:user/repo.git");
  });

  it("should find a different remote by name", () => {
    expect(parseGitRemoteUrl(sampleGitConfig, "upstream")).toBe("https://github.com/org/repo.git");
  });

  it("should fall back to first remote if specified remote is not found", () => {
    expect(parseGitRemoteUrl(sampleGitConfig, "nonexistent")).toBe("git@github.com:user/repo.git");
  });

  it("should return undefined for empty config", () => {
    expect(parseGitRemoteUrl("", "origin")).toBeUndefined();
  });

  it("should return undefined for config with no remotes", () => {
    const configWithoutRemotes = `[core]
\trepositoryformatversion = 0
\tfilemode = true
[branch "main"]
\tremote = origin
\tmerge = refs/heads/main
`;
    expect(parseGitRemoteUrl(configWithoutRemotes, "origin")).toBeUndefined();
  });

  it("should handle HTTPS URLs", () => {
    const config = `[remote "origin"]
\turl = https://github.com/owner/project.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;
    expect(parseGitRemoteUrl(config, "origin")).toBe("https://github.com/owner/project.git");
  });

  it("should handle SSH URLs without .git suffix", () => {
    const config = `[remote "origin"]
\turl = git@github.com:owner/project
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;
    expect(parseGitRemoteUrl(config, "origin")).toBe("git@github.com:owner/project");
  });

  it("should handle enterprise GitHub URLs", () => {
    const config = `[remote "origin"]
\turl = https://github.enterprise.com/org/repo.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;
    expect(parseGitRemoteUrl(config, "origin")).toBe("https://github.enterprise.com/org/repo.git");
  });

  it("should handle config with spaces around equals sign", () => {
    const config = `[remote "origin"]
\turl = git@github.com:user/repo.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;
    expect(parseGitRemoteUrl(config, "origin")).toBe("git@github.com:user/repo.git");
  });
});
