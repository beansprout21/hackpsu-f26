// Share with FNB storage (Contracts v2.2): opt-in plans in Upstash Redis, 30-day TTL, revocable.
// Keys: share:plan:<id> -> SharedPlan (TTL), share:user:<auth0 sub> -> id (TTL), share:index zset of ids by sharedAt.
// Never log anything from here except error classes: plans, numbers, names and emails stay out of logs.
import { Redis } from "@upstash/redis";
import type { ShareContact, SharedPlan, SharedPlanSummary, ShareStatus } from "@/types";
import { ShareRequestSchema, SharedPlanSchema } from "@/types/schemas";
import type { z } from "zod";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";

export const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const SHARING_UNAVAILABLE = "Sharing is unavailable right now";
const LIST_LIMIT = 50;

const planKey = (id: string) => `share:plan:${id}`;
const userKey = (sub: string) => `share:user:${sub}`;
const INDEX_KEY = "share:index";

export type ShareRequest = z.infer<typeof ShareRequestSchema>;

let client: Redis | null | undefined;

// Upstash names first, then the Vercel Marketplace (KV_*) names; null when neither is configured.
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token, enableTelemetry: false }) : null;
  return client;
}

function statusOf(plan: SharedPlan): ShareStatus {
  return { shared: true, id: plan.id, sharedAt: plan.sharedAt, expiresAt: plan.expiresAt };
}

async function readPlan(redis: Redis, id: string): Promise<SharedPlan | null> {
  const raw = await redis.get<unknown>(planKey(id));
  if (raw === null) return null;
  const parsed = SharedPlanSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
  return parsed.success ? parsed.data : null;
}

export async function getShareStatus(redis: Redis, sub: string): Promise<ShareStatus> {
  const id = await redis.get<string>(userKey(sub));
  const plan = id ? await readPlan(redis, id) : null;
  return plan ? statusOf(plan) : { shared: false };
}

// Create or overwrite the user's shared plan. Re-sharing keeps the same id.
export async function sharePlan(redis: Redis, sub: string, contact: ShareContact, req: ShareRequest): Promise<ShareStatus> {
  const existing = await redis.get<string>(userKey(sub));
  const id = existing ?? crypto.randomUUID();
  const now = new Date();
  const plan: SharedPlan = {
    id,
    sharedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SHARE_TTL_SECONDS * 1000).toISOString(),
    consentVersion: "v1",
    contact,
    intake: req.intake,
    snapshot: req.snapshot,
    profile: req.profile,
    plan: req.plan,
  };
  await redis
    .multi()
    .set(planKey(id), JSON.stringify(plan), { ex: SHARE_TTL_SECONDS })
    .set(userKey(sub), id, { ex: SHARE_TTL_SECONDS })
    .zadd(INDEX_KEY, { score: now.getTime(), member: id })
    .exec();
  return statusOf(plan);
}

// "Stop sharing": deletes the plan, the user pointer, and the index entry.
export async function stopSharing(redis: Redis, sub: string): Promise<ShareStatus> {
  const id = await redis.get<string>(userKey(sub));
  const tx = redis.multi().del(userKey(sub));
  if (id) tx.del(planKey(id)).zrem(INDEX_KEY, id);
  await tx.exec();
  return { shared: false };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function summarize(p: SharedPlan): SharedPlanSummary {
  const top = [...p.profile.goals].sort((a, b) => a.priority - b.priority)[0];
  const why = top?.why.trim();
  return {
    id: p.id,
    sharedAt: p.sharedAt,
    contactName: p.contact.name,
    lifeStage: p.intake.lifeStage,
    persona: p.profile.persona,
    topGoalLabel: top ? `${capitalize(GOAL_LABELS[top.id])}${why ? `: ${why}` : ""}` : "",
    stepOneTitle: p.plan.stepOne.title,
    monthlySurplus: p.plan.monthlySurplus,
    isFnbCustomer: p.snapshot.isFnbCustomer,
  };
}

// Banker list (#54): newest first, max 50; ids whose plan expired are skipped and pruned from the index.
export async function listSummaries(redis: Redis, limit = LIST_LIMIT): Promise<SharedPlanSummary[]> {
  await redis.zremrangebyscore(INDEX_KEY, "-inf", Date.now() - SHARE_TTL_SECONDS * 1000);
  const ids = await redis.zrange<string[]>(INDEX_KEY, 0, limit - 1, { rev: true });
  const plans = await Promise.all(ids.map((id) => readPlan(redis, id)));
  const gone = ids.filter((_, i) => plans[i] === null);
  if (gone.length > 0) await redis.zrem(INDEX_KEY, ...gone);
  return plans.filter((p): p is SharedPlan => p !== null).map(summarize);
}

export async function getSharedPlan(redis: Redis, id: string): Promise<SharedPlan | null> {
  return readPlan(redis, id);
}
