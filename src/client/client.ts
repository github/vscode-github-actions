import {Octokit} from '@octokit/rest';
import {getClient as getAPIClient} from '../api/api';

export async function getClient(token: string): Promise<Octokit> {
  return getAPIClient(token);
}
