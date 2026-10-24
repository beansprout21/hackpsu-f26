import Link from "next/link";
import {
  ArrowRight,
  Landmark,
  Route,
  Shrub,
  Sprout,
  Target,
  TreeDeciduous,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SproutSays } from "@/components/sprout/SproutSays";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    icon: Target,
    title: "Built around what matters to you",
    body: "Share what you're working toward, and your plan takes shape around it.",
  },
  {
    icon: Route,
    title: "Always know your next step",
    body: "A clear path from today to your bigger goals, one step at a time.",
  },
  {
    icon: Landmark,
    title: "Walk in feeling prepared",
    body: "Bring your plan to an FNB banker who can help you get there.",
  },
] as const;

const PREVIEW = [
  {
    stage: "Start here",
    text: "Open an everyday account",
    icon: Sprout,
    tone: "text-stage-now",
    size: "size-4",
  },
  {
    stage: "Next",
    text: "Build a 3-month cushion",
    icon: Shrub,
    tone: "text-stage-next",
    size: "size-5",
  },
  {
    stage: "Later",
    text: "Your first home",
    icon: TreeDeciduous,
    tone: "text-muted-foreground",
    size: "size-6",
    when: "Once your cushion is in place",
  },
] as const;

function StartButton({ className }: { className?: string }) {
  return (
    <Link
      href="/intake"
      className={cn(
        buttonVariants({ size: "lg" }),
        "group h-14 w-full rounded-xl px-8 text-lg font-semibold shadow-lg shadow-primary/40 hover:-translate-y-0.5 hover:bg-primary hover:shadow-xl hover:brightness-95 sm:w-auto motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        Plant your first goal
        <ArrowRight
          className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden
        />
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-20">
      <section className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold tracking-wide text-highlight uppercase">
            Meet Sprout, your money guide
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Most banks start with your credit score.{" "}
            <span className="text-primary">Sprout starts with your life.</span>
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Tell Sprout what you&apos;re working toward and get a step-by-step plan, starting with
            something you can do this week.
          </p>
          <div className="flex flex-col gap-3">
            <StartButton className="sm:self-start" />
            <span className="text-sm text-muted-foreground">
              About 90 seconds · No sign-up to start · No credit check
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <SproutSays>
            Hi, I&apos;m Sprout! Let&apos;s start with what you want, like a trip, a safety cushion,
            or your first place. The numbers come after.
          </SproutSays>
          <ol className="flex flex-col pl-1" aria-label="Example plan">
            {PREVIEW.map(({ icon: Icon, ...item }, i) => (
              <li key={item.stage} className="flex gap-4">
                <div className="flex flex-col items-center" aria-hidden>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary",
                      item.tone,
                    )}
                  >
                    <Icon className={item.size} />
                  </span>
                  {i < PREVIEW.length - 1 && <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />}
                </div>
                <div className={cn("flex min-w-0 flex-col pt-0.5", i < PREVIEW.length - 1 && "pb-5")}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {item.stage}
                  </span>
                  <span className="text-sm">{item.text}</span>
                  {"when" in item && (
                    <span className="text-xs text-muted-foreground">{item.when}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Why Sprout" className="mt-16 grid gap-4 sm:mt-24 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
