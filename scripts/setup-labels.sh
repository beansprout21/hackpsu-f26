#!/usr/bin/env bash
# Creates the coordination labels. Safe to re-run (--force updates existing).
# Each line also works pasted into PowerShell.
gh label create "owner:ben"          --color 1D76DB --description "Ben's queue" --force
gh label create "owner:ethan"        --color 5319E7 --description "Ethan's queue" --force
gh label create "status:ready"       --color 0E8A16 --description "Ready to start" --force
gh label create "status:in-progress" --color FBCA04 --description "Claimed, being worked" --force
gh label create "status:blocked"     --color B60205 --description "Blocked, see comment" --force
gh label create "P0"                 --color D93F0B --description "Must have for demo" --force
gh label create "P1"                 --color F9D0C4 --description "Nice to have" --force
gh label create "contract-change"    --color 000000 --description "Changes shared types or API contracts" --force
gh label create "quick"              --color C5DEF5 --description "Skip plan approval in /next" --force
