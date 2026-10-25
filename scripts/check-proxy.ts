// Crash test (#97): with DEMO_AUTH_BYPASS=1 and no Auth0 config (a local clone, a preview without env),
// the proxy must still serve pages instead of throwing DomainResolutionError on every request.
// Run: npx tsx scripts/check-proxy.ts
for (const name of ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET", "APP_BASE_URL"]) delete process.env[name];
process.env.DEMO_AUTH_BYPASS = "1";

async function main() {
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../src/proxy");
  let failures = 0;
  for (const path of ["/", "/intake", "/snapshot", "/plan", "/banker", "/api/plan"]) {
    try {
      const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
      const ok = res.status < 500;
      if (!ok) failures++;
      console.log(`${ok ? "  ok  " : "  FAIL"} ${path}: status ${res.status}`);
    } catch (error) {
      failures++;
      console.log(`  FAIL ${path}: threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
    }
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
