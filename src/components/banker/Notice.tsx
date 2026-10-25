import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { BankerAccess } from "./access";

const COPY: Record<Exclude<BankerAccess["kind"], "ok">, { title: string; body: string }> = {
  signed_out: { title: "Sign in to continue", body: "The banker dashboard needs an FNB banker account." },
  denied: {
    title: "Banker access only",
    body: "Only FNB bankers can see shared plans. Ask the Sprout team for a demo.",
  },
  unavailable: { title: "Sharing is unavailable right now", body: "Shared plans can't be loaded at the moment. Try again shortly." },
};

export function BankerNotice({ kind }: { kind: Exclude<BankerAccess["kind"], "ok"> }) {
  const { title, body } = COPY[kind];
  return (
    <section className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lead font-semibold">
        <ShieldAlert className="size-7 text-warning" aria-hidden />
        {title}
      </h2>
      <p className="text-small text-muted-foreground">{body}</p>
      {kind === "signed_out" ? (
        // /auth/login is an Auth0 route handled in src/proxy.ts, not a Next page.
        <a href="/auth/login?returnTo=/banker" className="text-small font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </a>
      ) : (
        <Link href="/plan" className="text-small font-semibold text-primary underline-offset-4 hover:underline">
          Back to my plan
        </Link>
      )}
    </section>
  );
}
