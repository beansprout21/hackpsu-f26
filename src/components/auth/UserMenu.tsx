"use client";

// Header user menu: name + log out when signed in, log in when signed out.
// Plain <a> tags on purpose: the Auth0 SDK warns that prefetching /auth/login can start a login.
import { useUser } from "@auth0/nextjs-auth0/client";
import { buttonVariants } from "@/components/ui/button";

export function UserMenu() {
  const { user, isLoading } = useUser();

  if (isLoading) return <span className="h-8 w-16" aria-hidden />;

  if (!user) {
    return (
      <a href="/auth/login?returnTo=/snapshot" className={buttonVariants({ variant: "ghost" })}>
        Log in
      </a>
    );
  }

  const name = user.given_name || user.name || user.nickname || user.email || "You";
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline" title={user.email ?? undefined}>
        {name}
      </span>
      <a href="/auth/logout" className={buttonVariants({ variant: "ghost" })}>
        Log out
      </a>
    </div>
  );
}
