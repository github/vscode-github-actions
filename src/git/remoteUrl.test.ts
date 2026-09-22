import {getRemoteHost, isGitHubRemoteUrl} from "./remoteUrl";

describe("getRemoteHost", () => {
  it("parses https remotes", () => {
    expect(getRemoteHost("https://github.com/owner/repo.git")).toBe("github.com");
  });

  it("parses ssh:// remotes", () => {
    expect(getRemoteHost("ssh://git@github.com/owner/repo.git")).toBe("github.com");
    expect(getRemoteHost("ssh://git@github.com:22/owner/repo.git")).toBe("github.com");
  });

  it("parses scp-style remotes", () => {
    expect(getRemoteHost("git@github.com:owner/repo.git")).toBe("github.com");
    expect(getRemoteHost("git@bitbucket.org:owner/repo.git")).toBe("bitbucket.org");
    expect(getRemoteHost("git@myorg.ghe.com:owner/repo.git")).toBe("myorg.ghe.com");
  });

  it("parses scp-style remotes without a user", () => {
    expect(getRemoteHost("github.com:owner/repo.git")).toBe("github.com");
  });

  it("lower-cases the host", () => {
    expect(getRemoteHost("git@GitHub.com:owner/repo.git")).toBe("github.com");
    expect(getRemoteHost("https://GitHub.com/owner/repo.git")).toBe("github.com");
  });

  it("returns undefined for unparseable remotes instead of throwing", () => {
    expect(getRemoteHost("")).toBeUndefined();
    expect(getRemoteHost("not a url")).toBeUndefined();
    expect(getRemoteHost("/local/path/to/repo.git")).toBeUndefined();
  });
});

describe("isGitHubRemoteUrl", () => {
  it("matches github.com remotes in any form and casing", () => {
    expect(isGitHubRemoteUrl("https://github.com/owner/repo.git")).toBe(true);
    expect(isGitHubRemoteUrl("git@github.com:owner/repo.git")).toBe(true);
    expect(isGitHubRemoteUrl("git@GitHub.com:owner/repo.git")).toBe(true);
  });

  it("matches SSH config aliases that embed github.com in the host", () => {
    expect(isGitHubRemoteUrl("git@github.com-work:owner/repo.git")).toBe(true);
  });

  it("does not match a github.com segment in the path of another host", () => {
    expect(isGitHubRemoteUrl("git@bitbucket.org:team/github.com-tools.git")).toBe(false);
    expect(isGitHubRemoteUrl("https://bitbucket.org/team/github.com-tools.git")).toBe(false);
  });

  it("matches the configured enterprise host only", () => {
    expect(isGitHubRemoteUrl("git@github.mycompany.com:owner/repo.git", "github.mycompany.com")).toBe(true);
    expect(isGitHubRemoteUrl("git@GITHUB.MYCOMPANY.COM:owner/repo.git", "github.mycompany.com")).toBe(true);
    expect(isGitHubRemoteUrl("git@bitbucket.org:team/github.mycompany.com.git", "github.mycompany.com")).toBe(false);
    expect(isGitHubRemoteUrl("git@github.mycompany.com:owner/repo.git")).toBe(false);
  });

  it("matches the enterprise host when the remote or server uses a custom port", () => {
    expect(isGitHubRemoteUrl("https://ghe.example.com:8443/owner/repo.git", "ghe.example.com")).toBe(true);
    expect(isGitHubRemoteUrl("ssh://git@ghe.example.com:2222/owner/repo.git", "ghe.example.com")).toBe(true);
  });

  it("matches GitHub Enterprise Cloud with data residency hosts", () => {
    expect(isGitHubRemoteUrl("git@myorg.ghe.com:owner/repo.git")).toBe(true);
    expect(isGitHubRemoteUrl("https://myorg.ghe.com/owner/repo.git")).toBe(true);
  });

  it("does not match non-GitHub or unparseable remotes", () => {
    expect(isGitHubRemoteUrl("git@bitbucket.org:owner/repo.git")).toBe(false);
    expect(isGitHubRemoteUrl("ssh://git@git.example.net/owner/repo.git")).toBe(false);
    expect(isGitHubRemoteUrl("not a url")).toBe(false);
  });
});
