import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export type SproutMood = "happy" | "thinking";

const sizes = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-6",
  lg: "size-16 [&_svg]:size-9",
} as const;

// Placeholder until the AI-generated mascot art (happy / thinking) lands.
export function SproutAvatar({
  mood = "happy",
  size = "md",
  className,
}: {
  mood?: SproutMood;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={mood === "thinking" ? "Sprout is thinking" : "Sprout"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary text-primary ring-2 ring-white shadow-sm",
        mood === "thinking" && "motion-safe:animate-pulse",
        sizes[size],
        className,
      )}
    >
      <Sprout aria-hidden />
    </span>
  );
}
