import { Suspense } from "react";
import type { Metadata } from "next";
import { BankerPlanDetail } from "@/components/banker/BankerPlanDetail";

export const metadata: Metadata = { title: "Shared plan · Sprout for FNB bankers" };

// Dynamic [id] with no static params: the root header's usePathname() is runtime data here, so this
// segment renders as a blocking route instead of prerendering a shell (Next "allow blocking route" fix).
export const instant = false;

// Login-gated in src/proxy.ts; BankerPlanDetail checks the banker role on the server before reading the plan.
export default function BankerPlanPage({ params }: PageProps<"/banker/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<p className="text-small text-muted-foreground">Loading plan...</p>}>
        <BankerPlanDetail params={params} />
      </Suspense>
    </main>
  );
}
