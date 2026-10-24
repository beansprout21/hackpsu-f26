import Link from "next/link";
import { Sprout } from "lucide-react";
import { StepIndicator } from "./StepIndicator";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="size-4" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sprout</span>
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground md:inline">
            Prototype
          </span>
        </Link>
        <StepIndicator />
        {/* Auth0 user menu mounts here (#7). */}
        <div data-slot="user-menu" className="flex min-w-8 justify-end" />
      </div>
    </header>
  );
}
