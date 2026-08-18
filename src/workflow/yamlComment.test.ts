import {isYamlComment} from "./yamlComment";

describe("isYamlComment", () => {
  it("detects a hash comment after jobs", () => {
    const line = "      # ";
    expect(isYamlComment(line, line.length)).toBe(true);
  });

  it("detects a hash comment when typing a dot", () => {
    const line = "      # .";
    expect(isYamlComment(line, line.length)).toBe(true);
  });

  it("does not treat a mapping key as a comment", () => {
    const line = "      runs-on: ubuntu-latest";
    expect(isYamlComment(line, line.length)).toBe(false);
  });

  it("ignores a hash inside double quotes", () => {
    const line = '      run: "echo # not a comment"';
    expect(isYamlComment(line, line.length)).toBe(false);
  });

  it("ignores a hash inside single quotes", () => {
    const line = "      run: 'echo # not a comment'";
    expect(isYamlComment(line, line.length)).toBe(false);
  });

  it("detects a trailing comment after a value", () => {
    const line = "      runs-on: ubuntu-latest # note";
    expect(isYamlComment(line, line.length)).toBe(true);
    expect(isYamlComment(line, line.indexOf("#") - 1)).toBe(false);
  });
});
