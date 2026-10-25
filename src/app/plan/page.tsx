"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlanView } from "@/components/plan/PlanView";
import planFamily from "@/data/mocks/plan.family.json";
import planStudent from "@/data/mocks/plan.student.json";
import profileFamily from "@/data/mocks/profile.family.json";
import profileStudent from "@/data/mocks/profile.student.json";
import { useAppState, useHydrated } from "@/lib/client/state";
import { GoalProfileSchema, PlanSchema } from "@/types/schemas";

// Until #10 wires real generation, /plan?mock=student|family renders the contract mocks.
function mockFromUrl() {
  const which = new URLSearchParams(window.location.search).get("mock");
  if (which !== "student" && which !== "family") return null;
  return {
    plan: PlanSchema.parse(which === "family" ? planFamily : planStudent),
    profile: GoalProfileSchema.parse(which === "family" ? profileFamily : profileStudent),
  };
}

export default function PlanPage() {
  const hydrated = useHydrated();
  const [app] = useAppState();
  const router = useRouter();
  const data =
    !hydrated ? null : app.plan && app.profile ? { plan: app.plan, profile: app.profile } : mockFromUrl();

  const missing = hydrated && !data;
  useEffect(() => {
    if (missing) router.replace("/intake");
  }, [missing, router]);

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      {data ? <PlanView plan={data.plan} profile={data.profile} /> : <h1 className="sr-only">Your plan</h1>}
    </main>
  );
}
