// Auth0 SDK client (@auth0/nextjs-auth0 v4). Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID,
// AUTH0_CLIENT_SECRET, AUTH0_SECRET, and APP_BASE_URL from the environment.
import { NextResponse } from "next/server";
import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import type { OnCallbackHook, SessionData } from "@auth0/nextjs-auth0/types";

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

const AFTER_LOGIN = "/snapshot";

// Only same-origin paths; anything else falls back to /snapshot.
const safePath = (path: string | undefined) => (path && path.startsWith("/") && !path.startsWith("//") ? path : AFTER_LOGIN);

// The SDK's default callback error is a plain-text 500, which OS dark mode renders as a black screen (#68).
// Show a small light page instead, with a way back in. Logs the error code only, never tokens or user data.
function callbackErrorPage(path: string) {
  const returnTo = path.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const retry = `/auth/login?returnTo=${encodeURIComponent(path)}`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><title>Sprout</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
         background: #f7faf8; color: #000; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 28rem; background: #fff; border: 1px solid #dce5e0; border-radius: 1rem; padding: 24px; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p { margin: 0 0 20px; color: #466060; line-height: 1.5; }
  a { display: inline-block; margin: 0 8px 8px 0; padding: 10px 16px; border-radius: 0.75rem; font-weight: 600;
      text-decoration: none; color: #000; }
  .primary { background: #7ebc89; }
  .secondary { background: #e3f1e6; }
</style></head>
<body><main>
  <h1>Sign-in didn't finish</h1>
  <p>Your answers are still saved in this browser. Try signing in again, or continue if you're already signed in.</p>
  <a class="primary" href="${retry}">Try signing in again</a><a class="secondary" href="${returnTo}">Continue</a>
</main></body></html>`;
  return new NextResponse(html, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
}

const onCallback: OnCallbackHook = async (error, ctx) => {
  const returnTo = safePath(ctx.returnTo);
  if (error) {
    console.warn(`[auth0 callback] ${error.code}`);
    return callbackErrorPage(returnTo);
  }
  return NextResponse.redirect(new URL(returnTo, ctx.appBaseUrl));
};

export const auth0 = new Auth0Client({ beforeSessionSaved: keepRolesClaim, onCallback });
