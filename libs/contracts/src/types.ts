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
