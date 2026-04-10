import {parseJobUrl, getExpectedWebHost} from "./jobUrl";

const GITHUB_API_URI = "https://api.github.com";

describe("getExpectedWebHost", () => {
  it("maps api.github.com to github.com", () => {
    expect(getExpectedWebHost("https://api.github.com")).toBe("github.com");
  });

  it("maps GHE Server api/v3 URL to the server host", () => {
    expect(getExpectedWebHost("https://github.mycompany.com/api/v3")).toBe("github.mycompany.com");
  });

  it("maps GHE Cloud api.<org>.ghe.com to <org>.ghe.com", () => {
    expect(getExpectedWebHost("https://api.myorg.ghe.com")).toBe("myorg.ghe.com");
  });

  it("handles trailing slash on /api/v3/", () => {
    expect(getExpectedWebHost("https://github.mycompany.com/api/v3/")).toBe("github.mycompany.com");
  });
});

describe("parseJobUrl", () => {
  it("accepts a valid github.com job URL", () => {
    const result = parseJobUrl(
      "https://github.com/galactic-potatoes/rentziass-test/actions/runs/24241071410/job/70775904678",
      GITHUB_API_URI
    );
    expect(result).toEqual({valid: true, owner: "galactic-potatoes", repo: "rentziass-test", jobId: "70775904678"});
  });

  it("accepts a valid URL with trailing slash", () => {
    const result = parseJobUrl(
      "https://github.com/owner/repo/actions/runs/111/job/222/",
      GITHUB_API_URI
    );
    expect(result).toEqual({valid: true, owner: "owner", repo: "repo", jobId: "222"});
  });

  it("ignores query string and hash", () => {
    const result = parseJobUrl(
      "https://github.com/owner/repo/actions/runs/111/job/222?pr=1#step:2:3",
      GITHUB_API_URI
    );
    expect(result).toEqual({valid: true, owner: "owner", repo: "repo", jobId: "222"});
  });

  it("rejects wrong host", () => {
    const result = parseJobUrl(
      "https://gitlab.com/owner/repo/actions/runs/111/job/222",
      GITHUB_API_URI
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("gitlab.com");
    }
  });

  it("rejects http:// scheme", () => {
    const result = parseJobUrl(
      "http://github.com/owner/repo/actions/runs/111/job/222",
      GITHUB_API_URI
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("https://");
    }
  });

  it("rejects a repo URL without /job/ segment", () => {
    const result = parseJobUrl("https://github.com/owner/repo", GITHUB_API_URI);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("job URL");
    }
  });

  it("rejects a run URL without /job/ segment", () => {
    const result = parseJobUrl("https://github.com/owner/repo/actions/runs/111", GITHUB_API_URI);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("job URL");
    }
  });

  it("rejects empty string", () => {
    const result = parseJobUrl("", GITHUB_API_URI);
    expect(result.valid).toBe(false);
  });

  it("rejects malformed URL", () => {
    const result = parseJobUrl("not a url at all", GITHUB_API_URI);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Invalid URL");
    }
  });

  it("rejects URL with credentials", () => {
    const result = parseJobUrl(
      "https://user:pass@github.com/owner/repo/actions/runs/111/job/222",
      GITHUB_API_URI
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Credentials");
    }
  });

  it("accepts non-numeric job ID", () => {
    const result = parseJobUrl(
      "https://github.com/owner/repo/actions/runs/111/job/abc-123",
      GITHUB_API_URI
    );
    expect(result).toEqual({valid: true, owner: "owner", repo: "repo", jobId: "abc-123"});
  });

  it("accepts plural /jobs/ path variant", () => {
    const result = parseJobUrl(
      "https://github.com/owner/repo/actions/runs/111/jobs/222",
      GITHUB_API_URI
    );
    expect(result).toEqual({valid: true, owner: "owner", repo: "repo", jobId: "222"});
  });

  it("validates against GHE Server host", () => {
    const result = parseJobUrl(
      "https://github.mycompany.com/owner/repo/actions/runs/111/job/222",
      "https://github.mycompany.com/api/v3"
    );
    expect(result).toEqual({valid: true, owner: "owner", repo: "repo", jobId: "222"});
  });
});
