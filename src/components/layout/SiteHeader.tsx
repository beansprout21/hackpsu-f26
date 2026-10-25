import Link from "next/link";
import { Sprout } from "lucide-react";
import { StepIndicator } from "./StepIndicator";
import { UserMenu } from "@/components/auth/UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Equal 1fr side columns keep the step indicator centered on the page, whatever the logo and menu widths. */}
      <div className="mx-auto grid h-16 w-full max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="col-start-1 flex items-center gap-2 justify-self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="size-4" aria-hidden />
          </span>
          <span className="text-lead font-semibold tracking-tight">Sprout</span>
          <span className="hidden rounded-full border border-border px-2 py-1 text-caption text-muted-foreground md:inline">
            Prototype built for FNB
          </span>
        </Link>
        <div className="col-start-2">
          <StepIndicator />
        </div>
        {/* Auth0 user menu mounts here (#7). */}
        <div data-slot="user-menu" className="col-start-3 flex min-w-8 justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
