import { createApiClient } from '@pcc/contracts'

/**
 * BFF model: the browser calls the API directly at `api.pcc.localhost`, sending the session
 * cookie (`credentials: 'include'`). The FE server is never a data hop. `VITE_API_URL` is the
 * API origin (the contracts client appends `/api/...`).
 */
export const API_ORIGIN =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://api.pcc.localhost'

export const loginUrl = (returnTo: string): string =>
  `${API_ORIGIN}/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`

export const logoutUrl = (): string => `${API_ORIGIN}/api/auth/logout`

/**
 * A credentialed fetch. On 401 it bounces the browser to the API login (preserving the path),
 * except for the `/me` probe (`skipAuthRedirect`), which reports "not signed in" instead.
 */
function credentialedFetch(skipAuthRedirect = false): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, { ...init, credentials: 'include' })
    if (
      response.status === 401 &&
      !skipAuthRedirect &&
      typeof window !== 'undefined'
    ) {
      window.location.assign(
        loginUrl(window.location.pathname + window.location.search),
      )
    }
    return response
  }
}

export const api = createApiClient(API_ORIGIN, credentialedFetch())
