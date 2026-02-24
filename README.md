# Enhanced GitHub Actions for VS Code

This extension is a fork of the official [GitHub Actions Extension](https://github.com/github/vscode-github-actions).

## Improvements over the official extension

- Overhauled sync engine based on Tanstack DB and [Conditional Requests](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api?apiVersion=2022-11-28#use-conditional-requests-if-appropriate) to make the UI snappy, responsive, and auto-updating without incurring GitHub API rate limiting
- Run jobs and steps now show durations
- Icons updated to use codicons and the testing icon set, making them themable
- Revamped logging, much more detailed as to what is going on

## Why a fork?
I initially maintained a parallel fork and went to a lot of work to make upstream changes independent and very mergeable. After a year of the GitHub team completely ignoring me and other PRs, it is clear the extension is in security maintenance mode, with only package dependency bumps being added.

Therefore, I chose to fork the extension to be able to perform major updates to the core operations to resolve some fundamental issues around polling and rate limiting. I will merge in upstream changes as appropriate.