"use client";

import { SnapshotFlow } from "@/components/snapshot/SnapshotFlow";
import { useHydrated } from "@/lib/client/state";

export default function SnapshotPage() {
  const hydrated = useHydrated();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 lg:max-w-[90rem] lg:px-10">
      <h1 className="sr-only">Your money snapshot</h1>
      {hydrated && <SnapshotFlow />}
    </main>
  );
}
