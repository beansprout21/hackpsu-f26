import { cn } from "@/lib/utils";
import { SproutAvatar, type SproutMood } from "./SproutAvatar";

export function SproutSays({
  children,
  mood = "happy",
  className,
}: {
  children: React.ReactNode;
  mood?: SproutMood;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <SproutAvatar mood={mood} />
      <div className="min-w-0 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground sm:text-base">
        {children}
      </div>
    </div>
  );
}
