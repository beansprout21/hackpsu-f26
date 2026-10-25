import Link from "next/link";
import { Landmark, Route, Shrub, Sprout, Target, TreeDeciduous } from "lucide-react";
import { GoalChoices } from "@/components/landing/GoalChoices";
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

// Stage colors are semantic: success = start here, brand = next, warning = later.
// The growing icon sizes (seedling, shrub, tree) are a deliberate exception to "icon = line height".
const PREVIEW = [
  {
    stage: "Start here",
    text: "Open an everyday account",
    icon: Sprout,
    size: "size-4",
    dot: "bg-success-soft text-success",
    label: "text-success",
  },
  {
    stage: "Next",
    text: "Build a 3-month cushion",
    icon: Shrub,
    size: "size-5",
    dot: "bg-brand-100 text-brand-600",
    label: "text-brand-600",
  },
  {
    stage: "Later",
    text: "Your first home",
    icon: TreeDeciduous,
    size: "size-6",
    dot: "bg-warning-soft text-warning",
    label: "text-warning",
    when: "Once your cushion is in place",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-12 sm:px-6 sm:py-24 lg:px-10">
      <section className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-small font-semibold tracking-wide text-brand-700 uppercase">
              Meet Sprout, your money guide
            </p>
            <h1 className="text-title font-semibold text-balance sm:text-display">
              Most banks start with your credit score.{" "}
              <span className="text-brand-700">Sprout starts with your life.</span>
            </h1>
            <p className="max-w-prose text-lead text-muted-foreground">
              Tell Sprout what you&apos;re working toward and get a step-by-step plan, starting with
              something you can do this week.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <GoalChoices />
            <span className="text-small text-muted-foreground">
              About 90 seconds · No sign-up to start · No credit check
            </span>
            <Link
              href="/intake"
              className="self-start rounded text-small text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Something else
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-3xl bg-card p-6 shadow-card">
          <SproutSays>
            Hi, I&apos;m Sprout! Pick what you&apos;re working toward and I&apos;ll map out the steps. The
            numbers come after.
          </SproutSays>
          <p className="-mb-2 text-caption text-muted-foreground">Your plan will look like this</p>
          <ol className="flex flex-col" aria-label="Example plan">
            {PREVIEW.map(({ icon: Icon, ...item }, i) => (
              <li key={item.stage} className="flex gap-4">
                <div className="flex flex-col items-center" aria-hidden>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", item.dot)}>
                    <Icon className={item.size} />
                  </span>
                  {i < PREVIEW.length - 1 && <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />}
                </div>
                <div className={cn("flex min-w-0 flex-col pt-1", i < PREVIEW.length - 1 && "pb-6")}>
                  <span className={cn("text-caption font-semibold tracking-wide uppercase", item.label)}>
                    {item.stage}
                  </span>
                  <span className="text-small">{item.text}</span>
                  {"when" in item && <span className="text-caption text-muted-foreground">{item.when}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Why Sprout" className="mt-24 grid gap-8 sm:mt-32 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-2 rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-start gap-2">
              <Icon className="size-6 shrink-0 text-brand-600" aria-hidden />
              <h2 className="text-body font-semibold">{title}</h2>
            </div>
            <p className="text-small text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
