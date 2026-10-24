# Decisions Log

Append-only. Newest at bottom. Format: `- [HH:MM Sat/Sun] <decision> (why)`

- [12:00 Sat] Stack: Next.js App Router + TS + Tailwind + shadcn/ui, Anthropic API server-side, Vercel deploy. No DB unless spec requires. (Claude Code fluency, one repo/one deploy, minimal failure points)
- [12:00 Sat] Coordination via GitHub Issues + /sync, /next, /ship skills. Tasks pre-assigned by owner label. (Claude sessions on different accounts cannot message each other)
- [14:01 Sat] Staged roadmap: matches and steps carry stage now/next/later; later items require unlockCondition. (User wants 'start here first, then this later' instead of flat recommendations)
- [15:15 Sat] v2: hero = college student (irregular/no income), swipe intake + persona, Sprout agent with advice boundary, spending plan, Step one, life-event unlocks, banker view deferred. User flow in FigJam.
- [15:38 Sat] Persona taxonomy: 6 fixed personas, one per ValueTag, deterministic from top swipe value; single source src/data/personaTaxonomy.ts; AI personalizes description only. (Prevents frontend/backend persona drift)
- [15:52 Sat] Sprout engine rulebook approved: 30/40/30 surplus split, 1-month starter cushion, Step one priority, student unlock triggers, optimism theme. docs/SPROUT.md
- [16:00 Sat] Product renamed Waypoint -> Sprout (app, advisor, mascot). Internal storage key waypoint:v1 unchanged. Maya's persona = Experience Collector (top value experiences).
- [16:40 Sat] Rulebook v2 approved (IWT-inspired): student savings 20%, family savings 10% + Future You ~10% earmark, high-fixed-cost branch + Big Win step, cushion-first savings, P1/P2/P3 60/25/15, gap levers (turn up dial, more time, smaller target), Maya v3. Voice rules + persona taglines in docs/SPROUT.md.
- [16:46 Sat] IWT is a starting guideline, not a copy. 'No-fee accounts first' replaced by fit-first, fee-transparent rule (pro-FNB). Latency: profile on Haiku 5.5, plan timeout 20s.
- [19:35 Sat] Emergency demo switches (#39), both OFF unless set to exactly "1": `AI_DISABLED=1` makes every AI route (profile, plan, chat) return its deterministic/template fallback (`aiUsed: false`); `DEMO_AUTH_BYPASS=1` (server-only) removes the /snapshot and /plan login redirect and makes `requireSession()` return a demo session, logging `[auth bypass] <method> <path>` per request. To flip on Vercel: Project -> Settings -> Environment Variables -> Production, set the variable to `1`, then Redeploy the current production deployment; delete it and redeploy to turn it off. (Keep the demo alive through an Anthropic or Auth0 outage during judging)
