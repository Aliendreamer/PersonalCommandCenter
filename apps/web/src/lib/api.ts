import { createApiClient } from '@pcc/contracts'

/**
 * Base URL for the core-api.
 * - Server (SSR): call core-api directly via `API_URL` (the compose service / dev port).
 * - Browser: same-origin (empty base); the web server proxies `/api/*` to core-api
 *   (see `routes/api/$.ts`), so no API host is hardcoded in client code.
 */
function resolveBaseUrl(): string {
  const isServer = typeof window === 'undefined'
  if (isServer) {
    return process.env.API_URL ?? 'http://localhost:5080'
  }
  return ''
}

export const api = createApiClient(resolveBaseUrl())
