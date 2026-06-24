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

/** The calendar backend an event lives in. */
export type CalendarSource = 'pcc' | 'google';

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
  /** Which backend owns this event ('pcc' CalDAV or 'google'); writes route here. Always sent by the
   *  backend; optional in the type so existing fixtures keep compiling during the rollout. */
  source?: CalendarSource;
}

/** The writable fields of a calendar event (create/update); the server owns the `uid`. */
export interface CalendarEventInput {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
  /** Target calendar for a create (defaults to 'pcc' when omitted). */
  calendar?: CalendarSource;
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

export type RssTopic = 'technology' | 'bulgaria' | 'world' | 'sports';

/** Mirrors the backend `RssItem` from `GET /api/rss`. */
export interface RssItem {
  title: string;
  link: string;
  published: string;
  source: string;
  topic: RssTopic;
  summary: string;
}

/** Mirrors the backend `UptimeCheck` from `GET /api/uptime`. */
/** Mirrors the backend `ModelsStatus` from `GET /api/models`. */
export interface InstalledModel {
  name: string;
  sizeBytes: number;
  family?: string | null;
  parameterSize?: string | null;
  quantization?: string | null;
}

export interface RunningModel {
  name: string;
  sizeVramBytes: number;
}

export interface GpuStat {
  name: string;
  utilizationPct: number;
  temperatureC: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
}

export interface ModelsStatus {
  version: string;
  installed: InstalledModel[];
  running: RunningModel[];
  gpus: GpuStat[];
}

export interface UptimeCheck {
  name: string;
  url: string;
  up: boolean;
  statusCode?: number | null;
  latencyMs: number;
}

/** Mirrors the backend `CodingStatus` from `GET /api/coding`. Raw seconds; the web layer formats. */
export type CodingRange = 'week' | 'month' | 'year';

export interface CodingBucket {
  name: string;
  seconds: number;
}

export interface CodingDay {
  date: string;
  seconds: number;
  projects: CodingBucket[];
  languages: CodingBucket[];
}

export interface CodingStatus {
  range: CodingRange;
  totalSeconds: number;
  todaySeconds: number;
  days: CodingDay[];
  projects: CodingBucket[];
  languages: CodingBucket[];
}

/** Mirrors the backend `Book` from `GET /api/goodreads`. */
export interface Book {
  title: string;
  author?: string | null;
  link: string;
  coverUrl?: string | null;
  /** Goodreads book description (may contain light HTML — render as stripped text). */
  description?: string | null;
  averageRating?: number | null;
  numPages?: number | null;
  published?: number | null;
}

/** Mirrors the backend `Weather` from `GET /api/weather`. */
export interface Weather {
  current: WeatherCurrent;
  daily: ForecastDay[];
}
