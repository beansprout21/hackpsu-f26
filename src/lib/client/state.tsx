"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { FinancialSnapshot, GoalProfile, IntakeAnswers, Plan } from "@/types";

export interface AppState {
  intake?: IntakeAnswers;
  snapshot?: FinancialSnapshot;
  profile?: GoalProfile;
  plan?: Plan;
}

// Key is part of the frozen contract (docs/CONTRACTS.md); the old product name is intentional.
const STORAGE_KEY = "waypoint:v1";
const EMPTY: AppState = {};

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as AppState) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateAppState(patch: Partial<AppState>) {
  const next = { ...read(), ...patch };
  cache = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: keep the in-memory copy so the flow still works.
  }
  listeners.forEach((l) => l());
}

export function useAppState(): [AppState, (patch: Partial<AppState>) => void] {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  const update = useCallback((patch: Partial<AppState>) => updateAppState(patch), []);
  return [state, update];
}

const noopSubscribe = () => () => {};

// False during SSR and hydration, true once running in the browser with storage readable.
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
