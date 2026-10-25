import Link from "next/link";
import { ArrowRight, Landmark, Route, Shrub, Sprout, Target, TreeDeciduous } from "lucide-react";
import { TypedPhrase } from "@/components/landing/TypedPhrase";
import { LinkPendingIcon } from "@/components/layout/LinkPendingIcon";
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
    text: "Move $20 into your travel fund",
    icon: Sprout,
    size: "size-4",
    dot: "bg-success-soft text-success",
    label: "text-success",
  },
  {
    stage: "Next",
    text: "Build your safety cushion",
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

function StartButton({ className }: { className?: string }) {
  return (
    <Link
      href="/intake"
      className={cn(
        "group inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary px-8 text-lead font-semibold text-primary-foreground shadow-card transition-[background-color,box-shadow,transform] duration-200 outline-none select-none",
        "hover:bg-primary-hover hover:shadow-raised active:translate-y-px active:bg-primary-active",
        "focus-visible:ring-4 focus-visible:ring-ring/40 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "sm:w-auto motion-reduce:transition-none",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        Start my plan
        <LinkPendingIcon className="size-6">
          <ArrowRight
            className="size-6 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            aria-hidden
          />
        </LinkPendingIcon>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-12 sm:px-6 sm:py-24 lg:px-10">
      <section className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-small font-semibold tracking-wide text-brand-700 uppercase">
              Meet Sprout, your money guide
            </p>
            <h1 className="text-title font-semibold text-balance sm:text-display">
              {/* Screen readers get the sentence once; what's shown is decorative. Phones (#180) keep
                  the original static sentence; the typing line is sm+ only. */}
              <span className="sr-only">Most banks start with your credit score. Sprout starts with your life.</span>
              <span aria-hidden className="sm:hidden">
                Most banks start with your credit score.{" "}
              </span>
              <span aria-hidden className="hidden sm:block">
                <TypedPhrase />
              </span>
              <span aria-hidden className="text-brand-700 sm:block">
                Sprout starts with your life.
              </span>
            </h1>
            <p className="max-w-prose text-lead text-muted-foreground">
              Tell Sprout what you&apos;re working toward and get a step-by-step plan, starting with
              something you can do this week.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <StartButton className="sm:self-start" />
            <span className="text-small text-muted-foreground">
              Swipe what you value → Set your goals → Get your plan
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-3xl bg-card p-6 shadow-card">
          <SproutSays>
            Hi, I&apos;m Sprout! Let&apos;s start with what you want, like a trip, a safety cushion,
            or your first place. The numbers come after.
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
