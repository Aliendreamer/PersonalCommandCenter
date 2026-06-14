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

  it('fetches calendar events, passing the days window', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await client.getCalendarEvents(1);

    expect(calls[0]?.url).toBe('http://api/api/calendar/events?days=1');
  });

  it('creates a calendar event with a POST + JSON body', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const created = {
      uid: 'x',
      title: 'Lunch',
      start: '2026-06-15T12:00:00Z',
      end: '2026-06-15T13:00:00Z',
      allDay: false,
    };
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(created), { status: 201 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await expect(
      client.createCalendarEvent({
        title: 'Lunch',
        start: '2026-06-15T12:00:00Z',
        end: '2026-06-15T13:00:00Z',
      }),
    ).resolves.toEqual(created);
    expect(calls[0]?.url).toBe('http://api/api/calendar/events');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body)).title).toBe('Lunch');
  });

  it('deletes a calendar event with a DELETE', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await client.deleteCalendarEvent('abc');

    expect(calls[0]?.url).toBe('http://api/api/calendar/events/abc');
    expect(calls[0]?.init?.method).toBe('DELETE');
  });

  it('fetches tasks, passing the all flag', async () => {
    const calls: Array<{ url: string }> = [];
    const fetchImpl = (async (url: string) => {
      calls.push({ url });
      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await client.getTasks();
    await client.getTasks(true);

    expect(calls[0]?.url).toBe('http://api/api/tasks');
    expect(calls[1]?.url).toBe('http://api/api/tasks?all=true');
  });

  it('updates a task with a PUT + JSON body', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const updated = { uid: 't1', title: 'Done', completed: true };
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(updated), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await expect(client.updateTask('t1', { title: 'Done', completed: true })).resolves.toEqual(
      updated,
    );
    expect(calls[0]?.url).toBe('http://api/api/tasks/t1');
    expect(calls[0]?.init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0]?.init?.body)).completed).toBe(true);
  });

  it('fetches notifications (list + unread)', async () => {
    const body = { notifications: [], unread: 3 };
    const client = createApiClient('http://api', jsonFetch(body));

    await expect(client.getNotifications()).resolves.toEqual(body);
  });

  it('marks a notification read with a POST', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await client.markNotificationRead('abc');

    expect(calls[0]?.url).toBe('http://api/api/notifications/abc/read');
    expect(calls[0]?.init?.method).toBe('POST');
  });

  it('searches, url-encoding the query', async () => {
    const calls: Array<{ url: string }> = [];
    const fetchImpl = (async (url: string) => {
      calls.push({ url });
      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createApiClient('http://api', fetchImpl);

    await client.getSearch('hello world');

    expect(calls[0]?.url).toBe('http://api/api/search?q=hello%20world');
  });
});
