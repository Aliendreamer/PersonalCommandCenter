import type { PluginManifest, SystemStatus } from './types';

type FetchLike = typeof fetch;

export interface ApiClient {
  getPlugins(): Promise<PluginManifest[]>;
  getSystemStatus(): Promise<SystemStatus>;
}

/**
 * A tiny typed client over the core-api. `fetchImpl` is injectable so the shell and tests
 * can supply their own fetch.
 */
export function createApiClient(baseUrl: string, fetchImpl: FetchLike = fetch): ApiClient {
  const getJson = async <T>(path: string): Promise<T> => {
    const response = await fetchImpl(`${baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Request to ${path} failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  };

  return {
    getPlugins: () => getJson<PluginManifest[]>('/api/plugins'),
    getSystemStatus: () => getJson<SystemStatus>('/api/system/status'),
  };
}
