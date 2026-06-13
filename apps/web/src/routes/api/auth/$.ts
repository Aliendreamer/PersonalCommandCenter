import { createFileRoute } from '@tanstack/react-router'
// Activates the TanStack Start `server` route-option augmentation (declared in start-client-core)
// for `tsc`; type-only, so no runtime cost.
import type {} from '@tanstack/react-start'

import { proxyAuth } from '../../../lib/server/auth-proxy'

// SSR-BFF auth ingress: the browser only ever calls `app.pcc.localhost/api/auth/*`. This server
// route proxies the OIDC dance (login → Keycloak, callback, logout) to core-api over the internal
// compose network, re-homing the session/PKCE cookies on the way out. core-api is never publicly
// routable. See lib/server/auth-proxy.ts + lib/server/cookies.ts.
const handler = ({
  request,
  params,
}: {
  request: Request
  params: { _splat?: string }
}): Promise<Response> => proxyAuth(request, params._splat ?? '')

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
