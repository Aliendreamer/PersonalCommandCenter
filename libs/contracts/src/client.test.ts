import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';
import type { PluginManifest } from './types';

const jsonFetch = (body: unknown, status = 200): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('createApiClient', () => {
  it('fetches plugin manifests from /api/plugins', async () => {
    const manifests: PluginManifest[] = [
      { id: 'system', navLabel: 'System', routeBase: '/system', widgets: ['system-status'] },
    ];
    const client = createApiClient('http://api', jsonFetch(manifests));

    await expect(client.getPlugins()).resolves.toEqual(manifests);
  });

  it('throws on a non-ok response', async () => {
    const client = createApiClient('http://api', jsonFetch('boom', 500));

    await expect(client.getSystemStatus()).rejects.toThrow('status 500');
  });

  it('fetches IoT entities from /api/iot/entities', async () => {
    const entities = [{ entityId: 'light.kitchen', name: 'Kitchen', domain: 'light', state: 'on' }];
    const client = createApiClient('http://api', jsonFetch(entities));

    await expect(client.getIotEntities()).resolves.toEqual(entities);
  });
});
