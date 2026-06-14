/** Mirrors the backend `PluginManifest` returned by `GET /api/plugins`. */
export interface PluginManifest {
  id: string;
  navLabel: string;
  routeBase: string;
  widgets: string[];
}

/** Mirrors the backend `SystemStatus` returned by `GET /api/system/status`. */
export interface SystemStatus {
  apiHealthy: boolean;
  version: string;
  uptimeSeconds: number;
  hostname: string;
}

/** Mirrors the backend `IotEntity` returned by `GET /api/iot/entities`. */
export interface IotEntity {
  entityId: string;
  name: string;
  domain: string;
  state: string;
  unit?: string | null;
}

/** Mirrors the backend `CalendarEvent` returned by `GET /api/calendar/events`. */
export interface CalendarEvent {
  uid: string;
  title: string;
  /** ISO 8601 instant (UTC) or date for all-day events. */
  start: string;
  end: string;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
}

/** The writable fields of a calendar event (create/update); the server owns the `uid`. */
export interface CalendarEventInput {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
}

/** Mirrors the backend `TodoItem` returned by `GET /api/tasks`. */
export interface TodoItem {
  uid: string;
  title: string;
  /** ISO 8601 due instant/date, when set. */
  due?: string | null;
  completed: boolean;
  description?: string | null;
}

/** The writable fields of a to-do (create/update); the server owns the `uid`. */
export interface TodoInput {
  title: string;
  due?: string | null;
  completed?: boolean;
  description?: string | null;
}

export type NotificationSeverity = 'Info' | 'Warning' | 'Error';

/** Mirrors the backend `Notification` from `GET /api/notifications`. */
export interface Notification {
  id: string;
  source: string;
  severity: NotificationSeverity;
  title: string;
  message?: string | null;
  createdAt: string;
  readAt?: string | null;
}

/** The `GET /api/notifications` response: the list plus the current unread count. */
export interface NotificationList {
  notifications: Notification[];
  unread: number;
}

/** Mirrors the backend `SearchResult` from `GET /api/search`. */
export interface SearchResult {
  title: string;
  url: string;
  content?: string | null;
  engine?: string | null;
}

export interface WeatherCurrent {
  temperatureC: number;
  code: number;
  condition: string;
}

export interface ForecastDay {
  date: string;
  code: number;
  condition: string;
  highC: number;
  lowC: number;
}

/** Mirrors the backend `Weather` from `GET /api/weather`. */
export interface Weather {
  current: WeatherCurrent;
  daily: ForecastDay[];
}
