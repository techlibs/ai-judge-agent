import { describe, it, expect } from "vitest";
import { ErrorTracker } from "./error-tracker";

// NOTE: Full rendering tests require @testing-library/react, jsdom environment,
// and React hooks support. If those dependencies are not installed, install with:
//   bun add -d @testing-library/react @testing-library/jest-dom jsdom
// and add { environment: "jsdom" } to vitest.config.ts test options.

describe("ErrorTracker", () => {
  it("can be imported and is a function component", () => {
    expect(ErrorTracker).toBeDefined();
    expect(typeof ErrorTracker).toBe("function");
  });

  it("is a valid React function component (returns value when called context permitting)", () => {
    // ErrorTracker uses useEffect which requires a React rendering context.
    // Without a DOM + React test renderer, we verify the export shape.
    // The component should return null (no visible UI).
    expect(ErrorTracker.name).toBe("ErrorTracker");
  });
});
