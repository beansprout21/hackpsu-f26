// Auth0 SDK client (@auth0/nextjs-auth0 v4). Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID,
// AUTH0_CLIENT_SECRET, AUTH0_SECRET, and APP_BASE_URL from the environment.
import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";

// Custom ID token claim set by the post-login Action for the banker role (Contracts v2.2).
export const ROLES_CLAIM = "https://sprout-demo/roles";

// v4 strips custom claims from session.user unless beforeSessionSaved is set (finalizeSession in the SDK),
// so keep the default filtering and carry the roles claim through.
export async function keepRolesClaim(session: SessionData): Promise<SessionData> {
  const roles = session.user[ROLES_CLAIM];
  return {
    ...session,
    user: { ...filterDefaultIdTokenClaims(session.user), ...(Array.isArray(roles) ? { [ROLES_CLAIM]: roles } : {}) },
  };
}

export const auth0 = new Auth0Client({ beforeSessionSaved: keepRolesClaim });
