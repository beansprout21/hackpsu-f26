"use client";

import { IntakeWizard } from "@/components/intake/IntakeWizard";
import { useHydrated } from "@/lib/client/state";

export default function IntakePage() {
  const hydrated = useHydrated();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="sr-only">Your goals</h1>
      {hydrated && <IntakeWizard />}
    </main>
  );
}
