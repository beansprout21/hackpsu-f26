"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

// Render inside a <Link>: shows its icon child, or a spinner while that link's page is loading.
export function LinkPendingIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className={`animate-spin ${className ?? ""}`} aria-label="Loading" /> : children;
}
