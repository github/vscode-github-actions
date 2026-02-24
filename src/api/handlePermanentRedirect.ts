import { OctokitPlugin } from "@octokit/core/types"

import { logTrace } from "~/log"

// HTTP status code for permanent redirect
const HTTP_PERMANENT_REDIRECT = 301

// Map to store permanent redirects. Key is original URL, value is new URL
const redirectCache = new Map<string, string>()

/**
 * Octokit plugin that caches 301 Moved Permanently redirects and automatically
 * applies them to subsequent requests to the same URL. 301 redirects count against the REST API limit so we want to minimize them by caching the new location and transparently applying it to future requests.
 *
 * This plugin uses octokit.hook.wrap to intercept all requests and:
 * 1. Checks if the current URL has a cached redirect before requesting
 * 2. Applies cached redirects transparently
 * 3. On 301 responses, caches the new location and retries the request
 *
 * @param octokit - The Octokit instance to wrap with redirect handling
 *
 * @link https://octokit.github.io/rest.js/v22/#plugins
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cacheRedirect: OctokitPlugin = (octokit) => {
  // hook into the request lifecycle
  octokit.hook.wrap("request", async (request, options) => {
    const repoCacheKey = [options.owner || undefined, options.repo || undefined, options.url].join("-")

    const redirectCacheKey = [repoCacheKey, options.url].join("-")
    const redirectCacheHit = redirectCache.get(redirectCacheKey)
    if (redirectCacheHit) {
      octokit.log.debug(`Redirect cache hit for ${options.url} → ${redirectCacheHit} [${redirectCacheKey}]`)
      options.baseUrl = ""
      options.url = redirectCacheHit
    }

    let response: any = await request(options)
    if (response.status === HTTP_PERMANENT_REDIRECT) {
      const locationHeader = response.headers["location"]

      if (locationHeader) {
        redirectCache.set(redirectCacheKey, locationHeader)
        octokit.log.info(
          `↩️ Permanent Redirect Detected and Cached: ${options.url} → ${locationHeader} [${redirectCacheKey}]`,
        )
        options.url = locationHeader
        response = await request(options)
      }
    }
    return response
  })
}

/**
 * Clears all cached redirects. Useful for testing or resetting state.
 */
export function clearRedirectCache(): void {
  redirectCache.clear()
  logTrace("🗑️ Redirect cache cleared")
}
