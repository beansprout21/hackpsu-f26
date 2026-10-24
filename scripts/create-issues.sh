#!/usr/bin/env bash
# Creates labels and the first issue batch. Run ONCE from the repo root on a fresh repo
# (issue numbers 1..13 must line up with the "Depends on" references).
#
# Usage:  ETHAN_GH=<ethans-github-username> bash scripts/create-issues.sh
set -euo pipefail

: "${ETHAN_GH:?Set ETHAN_GH to Ethan's GitHub username, e.g. ETHAN_GH=ethan123 bash scripts/create-issues.sh}"
BEN_GH="${BEN_GH:-beansprout21}"

if [ "$(gh issue list --state all --limit 1 --json number --jq 'length')" != "0" ]; then
  echo "Repo already has issues; aborting so numbering does not drift." >&2
  exit 1
fi

bash scripts/setup-labels.sh

mk() { # title owner_gh owner_label priority body_file [extra_label]
  local labels="status:ready,$3,$4"
  [ -n "${6:-}" ] && labels="$labels,$6"
  gh issue create --title "$1" --assignee "$2" --label "$labels" --body-file "$5" >/dev/null
  echo "created: $1"
}

D=docs/issues
mk "[P0] Scaffold app, types, mocks, Vercel deploy"        "$BEN_GH"   owner:ben   P0 $D/01-scaffold.md contract-change
mk "[P0] FNB catalog data + loader"                         "$BEN_GH"   owner:ben   P0 $D/02-catalog.md
mk "[P0] Deterministic matching + plan engine"              "$BEN_GH"   owner:ben   P0 $D/03-engine.md
mk "[P0] POST /api/profile (AI goal profile)"               "$BEN_GH"   owner:ben   P0 $D/04-api-profile.md
mk "[P0] POST /api/plan (engine + AI explanations)"         "$BEN_GH"   owner:ben   P0 $D/05-api-plan.md
mk "[P1] POST /api/chat (why / what if)"                    "$BEN_GH"   owner:ben   P1 $D/06-api-chat.md
mk "[P0] Auth0 login + route protection"                    "$ETHAN_GH" owner:ethan P0 $D/07-auth0.md
mk "[P0] App shell, theme, landing page"                    "$ETHAN_GH" owner:ethan P0 $D/08-shell-landing.md
mk "[P0] Gamified goal intake (/intake)"                    "$ETHAN_GH" owner:ethan P0 $D/09-intake.md
mk "[P0] Financial snapshot + generation flow (/snapshot)"  "$ETHAN_GH" owner:ethan P0 $D/10-snapshot.md
mk "[P0] Plan hero page (/plan) with trust layer"           "$ETHAN_GH" owner:ethan P0 $D/11-plan-page.md
mk "[P1] Chat panel UI"                                     "$ETHAN_GH" owner:ethan P1 $D/12-chat-panel.md
mk "[P1] Demo script + Devpost write-up draft"              "$ETHAN_GH" owner:ethan P1 $D/13-demo-devpost.md

echo "Done. Issue #1 (scaffold) is the blocker: Ben starts it at 2:00 PM."
