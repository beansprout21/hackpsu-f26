// Client wrappers for the Sprout API routes. Every call returns the route's `data` or throws an
// ApiError with a message that is safe to show the user. A 401 means the Auth0 session ended,
// so we send the user back through login (returning to /snapshot).
import type { ApiResponse, FinancialSnapshot, GoalProfile, IntakeAnswers, Plan, ShareStatus } from "@/types";
import { GoalProfileSchema, PlanSchema } from "@/types/schemas";
import studentProfileMock from "@/data/mocks/profile.student.json";
import familyProfileMock from "@/data/mocks/profile.family.json";
import studentPlanMock from "@/data/mocks/plan.student.json";
import familyPlanMock from "@/data/mocks/plan.family.json";

// Mocks are off by default now that the real routes exist; set NEXT_PUBLIC_USE_MOCKS=1 to use them.
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

const TIMEOUT_MS = 30_000;
const LOGIN_RETURN_TO_SNAPSHOT = "/auth/login?returnTo=/snapshot";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function send<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError(timedOut ? "Sprout is taking longer than usual. Try again in a moment." : "We couldn't reach Sprout. Check your connection and try again.");
  }
  if (res.status === 401) {
    // /auth/login is an Auth0 route in src/proxy.ts, not a Next page, so it needs a full navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(LOGIN_RETURN_TO_SNAPSHOT);
    throw new ApiError("Your session ended. Sign in again to keep going.", 401);
  }
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Something went wrong on our side. Try again.", res.status);
  }
  if (!json.ok) throw new ApiError(json.error || "Something went wrong on our side. Try again.", res.status);
  return json.data;
}

const post = <T>(path: string, body: unknown) => send<T>("POST", path, body);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProfile(intake: IntakeAnswers): Promise<GoalProfile> {
  if (USE_MOCKS) {
    await delay(1200);
    return GoalProfileSchema.parse(intake.lifeStage === "young_family" ? familyProfileMock : studentProfileMock);
  }
  return post<GoalProfile>("/api/profile", { intake });
}

export async function getPlan(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): Promise<Plan> {
  if (USE_MOCKS) {
    await delay(1800);
    return PlanSchema.parse(intake.lifeStage === "young_family" ? familyPlanMock : studentPlanMock);
  }
  return post<Plan>("/api/plan", { profile, snapshot, intake });
}

export async function askSprout(question: string, profile: GoalProfile, plan: Plan): Promise<{ answer: string; citedProductIds: string[] }> {
  return post("/api/chat", { question, profile, plan });
}

// Share with FNB (v2.2). The server takes the contact from the Auth0 session, never from here.
export function getShareStatus(): Promise<ShareStatus> {
  return send<ShareStatus>("GET", "/api/share");
}

export function sharePlan(data: { intake: IntakeAnswers; snapshot: FinancialSnapshot; profile: GoalProfile; plan: Plan }): Promise<ShareStatus> {
  return post<ShareStatus>("/api/share", { consent: true, ...data });
}

export function stopSharing(): Promise<ShareStatus> {
  return send<ShareStatus>("DELETE", "/api/share");
}
