import { GlobalRegistrator } from "@happy-dom/global-registrator";
import "@testing-library/jest-dom";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

GlobalRegistrator.register();

// ScoreRadarChart uses window.matchMedia for prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// recharts uses ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
});
