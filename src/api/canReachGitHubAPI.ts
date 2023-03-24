import {TTLCache} from '@actions/languageserver/utils/cache'

import {getSession} from '../auth/auth'
import {logError} from '../log'
import {getClient} from './api'

const API_ACCESS_TTL_MS = 10 * 1000
const cache = new TTLCache(API_ACCESS_TTL_MS)

export async function canReachGitHubAPI() {
  const session = await getSession()
  if (!session) {
    return false
  }
  return await cache.get('canReachGitHubAPI', undefined, async () => {
    try {
      const octokit = getClient(session.accessToken)
      await octokit.request('GET /')
    } catch (e) {
      logError(e as Error, 'Error getting GitHub context')
      return false
    }
    return true
  })
}
