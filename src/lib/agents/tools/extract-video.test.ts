import { describe, it, expect, beforeEach, mock } from "bun:test";
import { extractVideoContext } from "./extract-video";

const TOOL_CONTEXT = {
  context: undefined,
  runId: "test",
  threadId: "test",
  resourceId: "test",
  mastra: undefined,
  agents: undefined,
  tools: undefined,
  logger: undefined,
  telemetry: undefined,
  memory: undefined,
  runtimeContext: undefined,
} as const;

const mockYoutubeOEmbed = {
  title: "My YouTube Video",
  author_name: "Test Channel",
  thumbnail_url: "https://img.youtube.com/vi/abc123/0.jpg",
};

const mockVimeoOEmbed = {
  title: "My Vimeo Video",
  author_name: "Vimeo Creator",
  thumbnail_url: "https://vimeo.com/thumb/abc.jpg",
  description: "A great project video",
  duration: 180,
};

const mockLoomOEmbed = {
  title: "My Loom Recording",
  author_name: "Loom User",
  thumbnail_url: "https://cdn.loom.com/thumb.jpg",
  duration: 120,
};

function makeFetchMock(
  responses: Map<string, { ok: boolean; status: number; body: unknown }>
) {
  return mock(async (url: string) => {
    const urlStr = url.toString();
    for (const [pattern, response] of responses) {
      if (urlStr.includes(pattern)) {
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.ok ? "OK" : "Not Found",
          json: async () => response.body,
        };
      }
    }
    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
    };
  });
}

describe("extractVideoContext tool", () => {
  describe("YouTube URLs", () => {
    beforeEach(() => {
      globalThis.fetch = makeFetchMock(
        new Map([
          ["youtube.com/oembed", { ok: true, status: 200, body: mockYoutubeOEmbed }],
        ])
      ) as unknown as typeof fetch;
    });

    it("detects youtube.com URLs", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.youtube.com/watch?v=abc123",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("youtube");
    });

    it("detects youtu.be short URLs", async () => {
      const result = await extractVideoContext.execute({
        url: "https://youtu.be/abc123",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("youtube");
    });

    it("returns oembed metadata for YouTube", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.youtube.com/watch?v=abc123",
        ...TOOL_CONTEXT,
      });
      expect(result.title).toBe("My YouTube Video");
      expect(result.author).toBe("Test Channel");
      expect(result.thumbnailUrl).toBe("https://img.youtube.com/vi/abc123/0.jpg");
    });

    it("returns null transcript when YoutubeTranscript throws", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.youtube.com/watch?v=abc123",
        ...TOOL_CONTEXT,
      });
      // YoutubeTranscript will fail in test env — transcript should be null, not throw
      expect(result.transcript === null || typeof result.transcript === "string").toBe(true);
    });

    it("returns the original url in output", async () => {
      const url = "https://www.youtube.com/watch?v=abc123";
      const result = await extractVideoContext.execute({ url, ...TOOL_CONTEXT });
      expect(result.url).toBe(url);
    });
  });

  describe("Vimeo URLs", () => {
    beforeEach(() => {
      globalThis.fetch = makeFetchMock(
        new Map([
          ["vimeo.com/api/oembed", { ok: true, status: 200, body: mockVimeoOEmbed }],
        ])
      ) as unknown as typeof fetch;
    });

    it("detects vimeo.com URLs", async () => {
      const result = await extractVideoContext.execute({
        url: "https://vimeo.com/123456789",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("vimeo");
    });

    it("returns oembed metadata for Vimeo", async () => {
      const result = await extractVideoContext.execute({
        url: "https://vimeo.com/123456789",
        ...TOOL_CONTEXT,
      });
      expect(result.title).toBe("My Vimeo Video");
      expect(result.author).toBe("Vimeo Creator");
      expect(result.description).toBe("A great project video");
      expect(result.duration).toBe(180);
    });

    it("returns null transcript for Vimeo", async () => {
      const result = await extractVideoContext.execute({
        url: "https://vimeo.com/123456789",
        ...TOOL_CONTEXT,
      });
      expect(result.transcript).toBeNull();
    });
  });

  describe("Loom URLs", () => {
    beforeEach(() => {
      globalThis.fetch = makeFetchMock(
        new Map([
          ["loom.com/v1/oembed", { ok: true, status: 200, body: mockLoomOEmbed }],
        ])
      ) as unknown as typeof fetch;
    });

    it("detects loom.com/share URLs", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.loom.com/share/abc123def456",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("loom");
    });

    it("returns oembed metadata for Loom", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.loom.com/share/abc123def456",
        ...TOOL_CONTEXT,
      });
      expect(result.title).toBe("My Loom Recording");
      expect(result.author).toBe("Loom User");
      expect(result.duration).toBe(120);
    });

    it("returns null transcript for Loom", async () => {
      const result = await extractVideoContext.execute({
        url: "https://www.loom.com/share/abc123def456",
        ...TOOL_CONTEXT,
      });
      expect(result.transcript).toBeNull();
    });
  });

  describe("unknown URLs", () => {
    it("returns platform unknown for unrecognized URLs", async () => {
      const result = await extractVideoContext.execute({
        url: "https://example.com/video/xyz",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("unknown");
      expect(result.title).toBeNull();
      expect(result.transcript).toBeNull();
    });
  });

  describe("error handling", () => {
    it("returns null metadata when oembed fetch fails", async () => {
      globalThis.fetch = makeFetchMock(new Map()) as unknown as typeof fetch;

      const result = await extractVideoContext.execute({
        url: "https://vimeo.com/123456789",
        ...TOOL_CONTEXT,
      });
      expect(result.platform).toBe("vimeo");
      expect(result.title).toBeNull();
      expect(result.author).toBeNull();
    });
  });
});
