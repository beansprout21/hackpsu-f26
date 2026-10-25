import { Suspense } from "react";
import type { Metadata } from "next";
import { BankerList } from "@/components/banker/BankerList";

export const metadata: Metadata = { title: "Shared plans · Sprout for FNB bankers" };

// Login-gated in src/proxy.ts; BankerList checks the banker role on the server before reading any data.
export default function BankerPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold">Shared plans</h1>
        <p className="text-small text-muted-foreground">
          Customers who chose Share with FNB. Each plan is kept for 30 days or until they stop sharing.
        </p>
      </div>
      <Suspense fallback={<p className="text-small text-muted-foreground">Loading shared plans...</p>}>
        <BankerList />
      </Suspense>
    </main>
  );
}
