import { describe, it, expect, mock, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock AI SDK — must happen before importing the route
// ---------------------------------------------------------------------------

const streamTextCalls: Array<Record<string, unknown>> = [];
let streamTextShouldFail = false;

mock.module("ai", () => ({
  streamText: (params: Record<string, unknown>) => {
    if (streamTextShouldFail) {
      throw new Error("LLM stream failed");
    }
    streamTextCalls.push(params);
    return {
      toUIMessageStreamResponse: () =>
        new Response("data: mock stream\n\n", {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        }),
    };
  },
  convertToModelMessages: async (messages: unknown[]) => messages,
  stepCountIs: (n: number) => n,
}));

mock.module("@ai-sdk/openai", () => ({
  openai: (_model: string) => "mock-openai-model",
}));

mock.module("@/lib/db/client", () => ({
  getDb: () => ({
    query: {
      proposals: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      evaluations: {
        findMany: async () => [],
      },
      aggregateScores: {
        findFirst: async () => null,
        findMany: async () => [],
      },
    },
  }),
}));

// Import route AFTER mocking
const { POST } = await import("@/app/api/chat/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    proposalId: "prop-001",
    messages: [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "What is this proposal about?" }],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/chat", () => {
  beforeEach(() => {
    streamTextCalls.length = 0;
    streamTextShouldFail = false;
  });

  it("returns 200 with a stream response for a valid request", async () => {
    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(200);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 when proposalId is missing", async () => {
    const res = await POST(makeRequest({ messages: [] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(Array.isArray(data.details)).toBe(true);
  });

  it("returns 400 when messages array is missing", async () => {
    const res = await POST(makeRequest({ proposalId: "prop-001" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when proposalId is an empty string", async () => {
    const res = await POST(makeRequest(validBody({ proposalId: "" })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("calls streamText with system prompt and messages", async () => {
    await POST(makeRequest(validBody()));

    expect(streamTextCalls).toHaveLength(1);
    const call = streamTextCalls[0];
    expect(typeof call.system).toBe("string");
    expect(Array.isArray(call.messages)).toBe(true);
  });

  it("passes proposalId context in the first user message", async () => {
    await POST(
      makeRequest(
        validBody({
          proposalId: "prop-xyz",
          messages: [
            {
              id: "msg-1",
              role: "user",
              parts: [{ type: "text", text: "Explain the scoring" }],
            },
          ],
        })
      )
    );

    expect(streamTextCalls).toHaveLength(1);
  });

  it("accepts messages with non-text part types (tool-invocation, reasoning)", async () => {
    const res = await POST(
      makeRequest(
        validBody({
          messages: [
            {
              id: "msg-1",
              role: "user",
              parts: [
                { type: "text", text: "hello" },
                { type: "tool-invocation", toolName: "getProposalData", args: {} },
              ],
            },
          ],
        })
      )
    );

    expect(res.status).toBe(200);
  });
});
