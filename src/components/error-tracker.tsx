"use client";

import { useEffect } from "react";

const MAX_ERRORS = 50;

interface TrackedError {
  readonly message: string;
  readonly source: string;
  readonly timestamp: string;
}

declare global {
  interface Window {
    __console_errors?: TrackedError[];
  }
}

function pushError(entry: TrackedError) {
  if (!window.__console_errors) {
    window.__console_errors = [];
  }
  window.__console_errors.push(entry);
  if (window.__console_errors.length > MAX_ERRORS) {
    window.__console_errors.shift();
  }
}

export function ErrorTracker() {
  useEffect(() => {
    window.__console_errors = window.__console_errors ?? [];

    function handleError(event: ErrorEvent) {
      pushError({
        message: event.message,
        source: `${event.filename ?? "unknown"}:${event.lineno ?? 0}`,
        timestamp: new Date().toISOString(),
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
      pushError({
        message,
        source: "unhandledrejection",
        timestamp: new Date().toISOString(),
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
