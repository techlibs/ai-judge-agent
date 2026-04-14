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

// Import route AFTER mocking
const { POST } = await import("@/app/api/proposals/chat/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/proposals/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    messages: [
      {
        id: "msg-1",
        role: "user",
        parts: [
          {
            type: "text",
            text: "I want to build a solar grid for IPE Village",
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/proposals/chat", () => {
  beforeEach(() => {
    streamTextCalls.length = 0;
    streamTextShouldFail = false;
  });

  it("returns 200 with a stream response for a valid request", async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost:3000/api/proposals/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 when messages array is missing", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when message has invalid role", async () => {
    const res = await POST(
      makeRequest({
        messages: [
          {
            id: "msg-1",
            role: "invalid",
            parts: [{ type: "text", text: "hello" }],
          },
        ],
      }),
    );
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

  it("accepts multiple messages in conversation", async () => {
    const res = await POST(
      makeRequest({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "I want to build a solar grid" }],
          },
          {
            id: "msg-2",
            role: "assistant",
            parts: [
              {
                type: "text",
                text: "Great! Tell me more about the project.",
              },
            ],
          },
          {
            id: "msg-3",
            role: "user",
            parts: [
              {
                type: "text",
                text: "It provides clean energy to village residents",
              },
            ],
          },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(streamTextCalls).toHaveLength(1);
  });
});
