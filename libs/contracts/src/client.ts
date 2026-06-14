import type {
  CalendarEvent,
  CalendarEventInput,
  IotEntity,
  NotificationList,
  PluginManifest,
  SearchResult,
  SystemStatus,
  TodoInput,
  TodoItem,
} from './types';

type FetchLike = typeof fetch;

export interface ApiClient {
  getPlugins(): Promise<PluginManifest[]>;
  getSystemStatus(): Promise<SystemStatus>;
  getIotEntities(): Promise<IotEntity[]>;
  getCalendarEvents(days?: number): Promise<CalendarEvent[]>;
  createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent>;
  updateCalendarEvent(uid: string, input: CalendarEventInput): Promise<CalendarEvent>;
  deleteCalendarEvent(uid: string): Promise<void>;
  getTasks(all?: boolean): Promise<TodoItem[]>;
  createTask(input: TodoInput): Promise<TodoItem>;
  updateTask(uid: string, input: TodoInput): Promise<TodoItem>;
  deleteTask(uid: string): Promise<void>;
  getNotifications(): Promise<NotificationList>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  getSearch(q: string): Promise<SearchResult[]>;
}

/**
 * A tiny typed client over the core-api. `fetchImpl` is injectable so the shell and tests
 * can supply their own fetch.
 */
export function createApiClient(baseUrl: string, fetchImpl: FetchLike = fetch): ApiClient {
  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const response = await fetchImpl(`${baseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Request to ${path} failed with status ${response.status}`);
    }
    return response;
  };

  const getJson = async <T>(path: string): Promise<T> => (await request(path)).json() as Promise<T>;

  const sendJson = async <T>(path: string, method: string, body: unknown): Promise<T> =>
    (
      await request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    ).json() as Promise<T>;

  return {
    getPlugins: () => getJson<PluginManifest[]>('/api/plugins'),
    getSystemStatus: () => getJson<SystemStatus>('/api/system/status'),
    getIotEntities: () => getJson<IotEntity[]>('/api/iot/entities'),
    getCalendarEvents: (days) =>
      getJson<CalendarEvent[]>(
        days === undefined ? '/api/calendar/events' : `/api/calendar/events?days=${days}`,
      ),
    createCalendarEvent: (input) => sendJson<CalendarEvent>('/api/calendar/events', 'POST', input),
    updateCalendarEvent: (uid, input) =>
      sendJson<CalendarEvent>(`/api/calendar/events/${uid}`, 'PUT', input),
    deleteCalendarEvent: async (uid) => {
      await request(`/api/calendar/events/${uid}`, { method: 'DELETE' });
    },
    getTasks: (all) => getJson<TodoItem[]>(all ? '/api/tasks?all=true' : '/api/tasks'),
    createTask: (input) => sendJson<TodoItem>('/api/tasks', 'POST', input),
    updateTask: (uid, input) => sendJson<TodoItem>(`/api/tasks/${uid}`, 'PUT', input),
    deleteTask: async (uid) => {
      await request(`/api/tasks/${uid}`, { method: 'DELETE' });
    },
    getNotifications: () => getJson<NotificationList>('/api/notifications'),
    markNotificationRead: async (id) => {
      await request(`/api/notifications/${id}/read`, { method: 'POST' });
    },
    markAllNotificationsRead: async () => {
      await request('/api/notifications/read-all', { method: 'POST' });
    },
    getSearch: (q) => getJson<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  };
}
