// Server-side banker gate for the /banker pages (#54). The role check runs before any shared data is read.
import { connection } from "next/server";
import { auth0 } from "@/lib/auth0";
import { authBypassed, isBanker } from "@/lib/server/auth";
import { getRedis } from "@/lib/server/share";

export type BankerAccess =
  | { kind: "signed_out" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "ok"; redis: NonNullable<ReturnType<typeof getRedis>> };

export async function bankerAccess(): Promise<BankerAccess> {
  await connection(); // always per request, also when the demo bypass skips the session read
  if (!authBypassed()) {
    const session = await auth0.getSession();
    if (!session) return { kind: "signed_out" };
    if (!isBanker(session)) return { kind: "denied" };
  }
  const redis = getRedis();
  return redis ? { kind: "ok", redis } : { kind: "unavailable" };
}
