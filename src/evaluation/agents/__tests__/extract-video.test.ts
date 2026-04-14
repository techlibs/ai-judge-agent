import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isValidationError } from "@mastra/core/tools";
import { extractVideoContext } from "../tools/extract-video";

vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

import { YoutubeTranscript } from "youtube-transcript";

const MOCK_YOUTUBE_OEMBED = {
  title: "Building a Grant Evaluation System",
  author_name: "IPE City",
  thumbnail_url: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
};

const MOCK_VIMEO_OEMBED = {
  title: "IPE City Demo",
  author_name: "Carlos Libardo",
  thumbnail_url: "https://i.vimeocdn.com/video/123456.jpg",
  duration: 312,
  description: "A walkthrough of the IPE City grant evaluation platform.",
};

const MOCK_LOOM_OEMBED = {
  title: "Product Walkthrough",
  author_name: "Team IPE",
  thumbnail_url: "https://cdn.loom.com/sessions/thumbnails/abc.jpg",
};

const MOCK_TRANSCRIPT_SEGMENTS = [
  { text: "Hello and welcome to IPE City.", offset: 0, duration: 2000 },
  { text: "Today we explore grant evaluation.", offset: 2000, duration: 3000 },
];

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function runTool(url: string) {
  if (!extractVideoContext.execute) throw new Error("execute not defined");
  const result = await extractVideoContext.execute({ url }, {} as never);
  if (isValidationError(result)) throw new Error(result.message);
  return result;
}

describe("extractVideoContext tool", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has the correct id", () => {
    expect(extractVideoContext.id).toBe("extractVideoContext");
  });

  describe("YouTube", () => {
    it("fetches metadata and transcript for a youtube.com/watch URL", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_YOUTUBE_OEMBED));
      vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValueOnce(MOCK_TRANSCRIPT_SEGMENTS);

      const result = await runTool("https://www.youtube.com/watch?v=abc123");

      expect(result.platform).toBe("youtube");
      expect(result.title).toBe("Building a Grant Evaluation System");
      expect(result.author).toBe("IPE City");
      expect(result.thumbnailUrl).toBe("https://img.youtube.com/vi/abc123/hqdefault.jpg");
      expect(result.transcript).toBe("Hello and welcome to IPE City. Today we explore grant evaluation.");
      expect(result.url).toBe("https://www.youtube.com/watch?v=abc123");
    });

    it("fetches metadata and transcript for a youtu.be short URL", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_YOUTUBE_OEMBED));
      vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValueOnce(MOCK_TRANSCRIPT_SEGMENTS);

      const result = await runTool("https://youtu.be/abc123");

      expect(result.platform).toBe("youtube");
      expect(result.transcript).toContain("Hello and welcome");
    });

    it("truncates transcript to 5000 characters", async () => {
      const longSegments = [{ text: "x".repeat(6000), offset: 0, duration: 1000 }];
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_YOUTUBE_OEMBED));
      vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValueOnce(longSegments);

      const result = await runTool("https://www.youtube.com/watch?v=abc123");

      expect(result.transcript?.length).toBe(5000);
    });

    it("returns null transcript when transcript fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_YOUTUBE_OEMBED));
      vi.mocked(YoutubeTranscript.fetchTranscript).mockRejectedValueOnce(
        new Error("Transcript disabled")
      );

      const result = await runTool("https://www.youtube.com/watch?v=abc123");

      expect(result.platform).toBe("youtube");
      expect(result.title).toBe("Building a Grant Evaluation System");
      expect(result.transcript).toBeNull();
    });

    it("returns null metadata fields when OEmbed fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse({}, 404));
      vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValueOnce(MOCK_TRANSCRIPT_SEGMENTS);

      const result = await runTool("https://www.youtube.com/watch?v=abc123");

      expect(result.platform).toBe("youtube");
      expect(result.title).toBeNull();
      expect(result.author).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
    });
  });

  describe("Vimeo", () => {
    it("fetches metadata via OEmbed for a Vimeo URL", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_VIMEO_OEMBED));

      const result = await runTool("https://vimeo.com/123456789");

      expect(result.platform).toBe("vimeo");
      expect(result.title).toBe("IPE City Demo");
      expect(result.author).toBe("Carlos Libardo");
      expect(result.thumbnailUrl).toBe("https://i.vimeocdn.com/video/123456.jpg");
      expect(result.duration).toBe(312);
      expect(result.description).toBe("A walkthrough of the IPE City grant evaluation platform.");
      expect(result.transcript).toBeNull();
      expect(result.url).toBe("https://vimeo.com/123456789");
    });

    it("returns null fields when Vimeo OEmbed fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse({}, 403));

      const result = await runTool("https://vimeo.com/123456789");

      expect(result.platform).toBe("vimeo");
      expect(result.title).toBeNull();
      expect(result.duration).toBeNull();
    });
  });

  describe("Loom", () => {
    it("fetches metadata via OEmbed for a Loom URL", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeJsonResponse(MOCK_LOOM_OEMBED));

      const result = await runTool("https://www.loom.com/share/abc123def456");

      expect(result.platform).toBe("loom");
      expect(result.title).toBe("Product Walkthrough");
      expect(result.author).toBe("Team IPE");
      expect(result.thumbnailUrl).toBe("https://cdn.loom.com/sessions/thumbnails/abc.jpg");
      expect(result.transcript).toBeNull();
      expect(result.url).toBe("https://www.loom.com/share/abc123def456");
    });
  });

  describe("Unknown platform", () => {
    it("returns unknown platform with all null fields for unrecognized URLs", async () => {
      const result = await runTool("https://example.com/some-video");

      expect(result.platform).toBe("unknown");
      expect(result.title).toBeNull();
      expect(result.author).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
      expect(result.transcript).toBeNull();
      expect(result.url).toBe("https://example.com/some-video");
    });
  });
});
