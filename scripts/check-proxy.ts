// Proxy checks. Run: npx tsx scripts/check-proxy.ts
// 1. Crash test (#97): with DEMO_AUTH_BYPASS=1 and no Auth0 config (a local clone, a preview without env),
//    the proxy must still serve pages instead of throwing DomainResolutionError on every request.
// 2. Sign-in at the end (#157, Contracts v2.5), signed out with the bypass off: /snapshot and /plan are public,
//    /banker redirects to login. Runs in a child process with placeholder Auth0 settings (no network, no secrets).
// 3. Signed-out API checks over HTTP (route handlers need a real request scope), only when CHECK_PROXY_URL is set,
//    e.g. CHECK_PROXY_URL=http://localhost:3000 (a dev server without DEMO_AUTH_BYPASS) or the production URL.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import studentProfile from "../src/data/mocks/profile.student.json";
import { maya } from "../src/data/personas";

const SIGNED_OUT = process.argv.includes("--signed-out");
let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
};

async function bypassCrashTest() {
  for (const name of ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET", "APP_BASE_URL"]) delete process.env[name];
  process.env.DEMO_AUTH_BYPASS = "1";
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../src/proxy");
  console.log("=== Bypass on, no Auth0 config (#97)");
  for (const path of ["/", "/intake", "/snapshot", "/plan", "/banker", "/api/plan"]) {
    try {
      const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
      check(res.status < 500, `${path}: status ${res.status}`);
    } catch (error) {
      check(false, `${path}: threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
    }
  }
}

async function signedOutProxy() {
  delete process.env.DEMO_AUTH_BYPASS;
  // Placeholders so the Auth0 client can be built; a page request without a session cookie never calls Auth0.
  Object.assign(process.env, {
    AUTH0_DOMAIN: "example.invalid",
    AUTH0_CLIENT_ID: "check-proxy",
    AUTH0_CLIENT_SECRET: "check-proxy-placeholder",
    AUTH0_SECRET: "0".repeat(64),
    APP_BASE_URL: "http://localhost:3000",
  });
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../src/proxy");
  console.log("=== Signed out, bypass off (#157)");
  for (const path of ["/", "/intake", "/snapshot", "/plan"]) {
    const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
    check(res.status === 200 && !res.headers.get("location"), `${path}: public (status ${res.status})`);
  }
  for (const path of ["/banker", "/banker/some-id"]) {
    const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
    const location = res.headers.get("location") ?? "";
    check(res.status === 307 && location.includes("/auth/login?returnTo=%2Fbanker"), `${path}: redirects to login (${res.status} ${location.replace("http://localhost:3000", "")})`);
  }
}

async function signedOutApis(base: string) {
  console.log(`=== Signed-out APIs over HTTP (#157): ${base}`);
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    return { status: res.status, json: (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null };
  };
  const plan = await call("POST", "/api/plan", { profile: studentProfile, snapshot: maya.snapshot, intake: maya.intake });
  check(plan.status === 200 && plan.json?.ok === true, `POST /api/plan with a valid body: ${plan.status} ok=${plan.json?.ok}`);
  const badPlan = await call("POST", "/api/plan", {});
  check(badPlan.status === 400, `POST /api/plan with an empty body: ${badPlan.status} (input validation kept)`);
  for (const [method, path] of [["GET", "/api/share"], ["POST", "/api/share"], ["DELETE", "/api/share"], ["GET", "/api/banker/plans"]] as const) {
    const res = await call(method, path, method === "POST" ? {} : undefined);
    check(res.status === 401 && res.json?.ok === false, `${method} ${path}: ${res.status} ${res.json?.error ?? ""}`);
  }
}

async function main() {
  if (SIGNED_OUT) {
    await signedOutProxy();
    process.exit(failures ? 1 : 0);
  }
  await bypassCrashTest();
  // The Auth0 client is a module singleton, so the bypass-off case runs in its own process.
  const child = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--signed-out"], { stdio: "inherit" });
  if (child.status !== 0) failures++;
  const base = process.env.CHECK_PROXY_URL;
  if (base) await signedOutApis(base.replace(/\/$/, ""));
  else console.log("=== Signed-out APIs over HTTP: skipped (set CHECK_PROXY_URL to a running server)");
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
