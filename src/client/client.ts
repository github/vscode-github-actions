import {Octokit} from '@octokit/rest';
import {getClient as getAPIClient} from '../api/api';

export function getClient(token: string): Octokit {
  return getAPIClient(token);
}
