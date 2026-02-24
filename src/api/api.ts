// import { retry } from "@octokit/plugin-retry"
// import { throttling } from "@octokit/plugin-throttling"
import { Octokit } from "@octokit/rest"
import { version } from "package.json"

import { conditionalRequest } from "~/api/conditionalRequests"
import { getGitHubApiUri } from "~/configuration/configReader"
import { createOctokitLogger } from "~/log"

import { cacheRedirect } from "./handlePermanentRedirect"
// import { rateLimitTelemetryPlugin } from "./rateLimitTelemetry";

export const userAgent = `VS Code GitHub Actions (${version})`

const GhaOctokit = Octokit.plugin(cacheRedirect, conditionalRequest)
export type GhaOctokit = InstanceType<typeof GhaOctokit>

export function getClient(token: string) {
  return new GhaOctokit({
    auth: token,
    log: createOctokitLogger(),
    userAgent: userAgent,
    baseUrl: getGitHubApiUri(),
    request: {
      redirect: "manual"
    }
    // throttle: {
    //   onRateLimit: (retryAfter, options, octokit) => {
    //     octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}.`)

    //     if (options.request.retryCount === 0) {
    //       octokit.log.info(`Retrying after ${retryAfter} seconds.`)
    //       return true
    //     }
    //   },
    //   onSecondaryRateLimit: (retryAfter, options, octokit) => {
    //     octokit.log.warn(
    //       `Abuse detected for request ${options.method} ${options.url}. Retrying after ${retryAfter} seconds.`,
    //     )
    //   },
    // },
  })
}
