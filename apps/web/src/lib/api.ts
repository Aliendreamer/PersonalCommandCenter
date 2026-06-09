import { createApiClient } from '@pcc/contracts'

/**
 * Base URL for the core-api. During SSR the server reads `API_URL` at runtime (e.g. the
 * docker service name); otherwise it falls back to the local dev port.
 */
function resolveBaseUrl(): string {
  const fromServerEnv =
    typeof process !== 'undefined' ? process.env.API_URL : undefined
  return (
    fromServerEnv ?? import.meta.env.VITE_API_URL ?? 'http://localhost:5080'
  )
}

export const api = createApiClient(resolveBaseUrl())
