import { describe, it, expect } from "vitest";
import { ChainErrorBoundary } from "./error-boundary";

// NOTE: Full rendering tests require @testing-library/react and a DOM environment.
// If those dependencies are not installed, install them with:
//   bun add -d @testing-library/react @testing-library/jest-dom jsdom
// and add { environment: "jsdom" } to vitest.config.ts test options.

describe("ChainErrorBoundary", () => {
  it("can be imported and is a class component", () => {
    expect(ChainErrorBoundary).toBeDefined();
    expect(typeof ChainErrorBoundary).toBe("function");
    // Class components have a prototype with render
    expect(ChainErrorBoundary.prototype.render).toBeDefined();
  });

  it("has getDerivedStateFromError static method", () => {
    expect(ChainErrorBoundary.getDerivedStateFromError).toBeDefined();
    expect(typeof ChainErrorBoundary.getDerivedStateFromError).toBe("function");
  });

  it("getDerivedStateFromError returns error state", () => {
    const error = new Error("test error");
    const state = ChainErrorBoundary.getDerivedStateFromError(error);

    expect(state).toEqual({
      hasError: true,
      error,
    });
  });
});
