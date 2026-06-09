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
