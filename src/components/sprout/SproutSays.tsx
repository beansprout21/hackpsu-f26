import { cn } from "@/lib/utils";
import { SproutAvatar, type SproutMood } from "./SproutAvatar";

// large: one size step up on desktop (lg+), for places where Sprout leads the screen.
export function SproutSays({
  children,
  mood = "happy",
  large = false,
  className,
}: {
  children: React.ReactNode;
  mood?: SproutMood;
  large?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", large && "lg:gap-4", className)}>
      <SproutAvatar mood={mood} className={large ? "lg:size-14 lg:[&_svg]:size-7" : undefined} />
      <div
        className={cn(
          "min-w-0 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-body text-secondary-foreground",
          large && "lg:px-5 lg:py-4 lg:text-lead",
        )}
      >
        {children}
      </div>
    </div>
  );
}
