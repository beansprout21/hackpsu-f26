"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="lg" onClick={() => window.print()} className="h-10 gap-2 px-4">
      <Printer aria-hidden /> Prepare for meeting
    </Button>
  );
}
