/**
 * Auth navigations target the SSR-BFF proxy on the *same* origin (`app.pcc.localhost/api/auth/*`),
 * which forwards to core-api server-to-server. The browser never talks to the API directly.
 */
export function login(returnTo: string): void {
  window.location.assign(
    `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
  )
}

export function logout(): void {
  window.location.assign('/api/auth/logout')
}
