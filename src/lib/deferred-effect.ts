"use client";

import { useEffect, type DependencyList } from "react";

/**
 * Runs `effect` on a microtask so the effect body does not synchronously call setState
 * (react-hooks/set-state-in-effect). Supports optional cleanup return value.
 */
export function useDeferredEffect(effect: () => void | (() => void), deps: DependencyList): void {
  useEffect(() => {
    let disposed = false;
    let cleanup: void | (() => void);
    queueMicrotask(() => {
      if (disposed) return;
      cleanup = effect();
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, deps);
}

/** Schedule work outside the synchronous effect invocation. */
export function deferEffectTask(task: () => void): void {
  queueMicrotask(task);
}
