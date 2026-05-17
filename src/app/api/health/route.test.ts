import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  it("returns status 200 with healthy response", async () => {
    const response = GET();

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      status: "healthy",
      timestamp: "2026-01-15T12:00:00.000Z",
      version: "0.1.0",
    });
  });

  it("returns JSON content type", () => {
    const response = GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
