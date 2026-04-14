import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { extractVideoContext, VideoContextSchema } from "@/lib/agents/tools/extract-video";

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_YOUTUBE_OEMBED = {
  title: "My Solar Grid Demo",
  author_name: "Jane Doe",
  thumbnail_url: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
  duration: 185,
};

const MOCK_TRANSCRIPT = [
  { text: "Welcome to our solar grid project.", offset: 0, duration: 2 },
  { text: "We provide clean energy to villages.", offset: 2, duration: 3 },
];

const MOCK_LOOM_OEMBED = {
  title: "Product Walkthrough",
  author_name: "Alice",
  thumbnail_url: "https://cdn.loom.com/sessions/thumbnails/abc.jpg",
};

const MOCK_VIMEO_OEMBED = {
  title: "Vimeo Project Pitch",
  author_name: "Bob",
  thumbnail_url: "https://i.vimeocdn.com/video/123_200x150.jpg",
  duration: 300,
  description: "A pitch for our sustainable project.",
};

// ─── Schema Tests ────────────────────────────────────────────────────

describe("VideoContextSchema", () => {
  it("validates a complete video object", () => {
    const result = VideoContextSchema.safeParse({
      platform: "youtube",
      title: "My Video",
      author: "Jane Doe",
      thumbnailUrl: "https://example.com/thumb.jpg",
      duration: 120,
      description: null,
      transcript: "Hello world",
      url: "https://youtube.com/watch?v=abc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all nullable fields as null", () => {
    const result = VideoContextSchema.safeParse({
      platform: "unknown",
      title: null,
      author: null,
      thumbnailUrl: null,
      duration: null,
      description: null,
      transcript: null,
      url: "https://example.com/video",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid platform values", () => {
    const result = VideoContextSchema.safeParse({
      platform: "twitch",
      title: null,
      author: null,
      thumbnailUrl: null,
      duration: null,
      description: null,
      transcript: null,
      url: "https://twitch.tv/stream",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Tool Execution Tests ────────────────────────────────────────────

describe("extractVideoContext tool — YouTube", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns metadata and transcript for a youtube.com URL", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_YOUTUBE_OEMBED),
      }),
    ) as unknown as typeof fetch;

    // Mock YoutubeTranscript via module mock — we test the shape, not the library
    const { YoutubeTranscript } = await import("youtube-transcript");
    const original = YoutubeTranscript.fetchTranscript;
    YoutubeTranscript.fetchTranscript = mock(() =>
      Promise.resolve(MOCK_TRANSCRIPT),
    ) as unknown as typeof YoutubeTranscript.fetchTranscript;

    const result = await extractVideoContext.execute({
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(result.platform).toBe("youtube");
    expect(result.title).toBe("My Solar Grid Demo");
    expect(result.author).toBe("Jane Doe");
    expect(result.thumbnailUrl).toBe(
      "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    );
    expect(result.duration).toBe(185);
    expect(result.transcript).toContain("Welcome to our solar grid project.");
    expect(result.url).toBe("https://www.youtube.com/watch?v=abc123");

    YoutubeTranscript.fetchTranscript = original;
  });

  it("returns transcript null when YoutubeTranscript throws", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_YOUTUBE_OEMBED),
      }),
    ) as unknown as typeof fetch;

    const { YoutubeTranscript } = await import("youtube-transcript");
    const original = YoutubeTranscript.fetchTranscript;
    YoutubeTranscript.fetchTranscript = mock(() =>
      Promise.reject(new Error("No transcript available")),
    ) as unknown as typeof YoutubeTranscript.fetchTranscript;

    const result = await extractVideoContext.execute({
      url: "https://youtu.be/abc123",
    });

    expect(result.platform).toBe("youtube");
    expect(result.transcript).toBeNull();

    YoutubeTranscript.fetchTranscript = original;
  });

  it("truncates transcript to 5000 characters", async () => {
    const longText = "word ".repeat(2000); // ~10000 chars
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_YOUTUBE_OEMBED),
      }),
    ) as unknown as typeof fetch;

    const { YoutubeTranscript } = await import("youtube-transcript");
    const original = YoutubeTranscript.fetchTranscript;
    YoutubeTranscript.fetchTranscript = mock(() =>
      Promise.resolve([{ text: longText, offset: 0, duration: 100 }]),
    ) as unknown as typeof YoutubeTranscript.fetchTranscript;

    const result = await extractVideoContext.execute({
      url: "https://www.youtube.com/watch?v=longvideo",
    });

    expect(result.transcript?.length).toBeLessThanOrEqual(5000);

    YoutubeTranscript.fetchTranscript = original;
  });
});

describe("extractVideoContext tool — Loom", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns metadata for a loom share URL", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_LOOM_OEMBED),
      }),
    ) as unknown as typeof fetch;

    const result = await extractVideoContext.execute({
      url: "https://www.loom.com/share/abc123",
    });

    expect(result.platform).toBe("loom");
    expect(result.title).toBe("Product Walkthrough");
    expect(result.author).toBe("Alice");
    expect(result.transcript).toBeNull();
    expect(result.url).toBe("https://www.loom.com/share/abc123");
  });

  it("returns nulls when OEmbed fails for Loom", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 }),
    ) as unknown as typeof fetch;

    const result = await extractVideoContext.execute({
      url: "https://www.loom.com/share/notfound",
    });

    expect(result.platform).toBe("loom");
    expect(result.title).toBeNull();
    expect(result.author).toBeNull();
  });
});

describe("extractVideoContext tool — Vimeo", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns metadata and description for a vimeo URL", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_VIMEO_OEMBED),
      }),
    ) as unknown as typeof fetch;

    const result = await extractVideoContext.execute({
      url: "https://vimeo.com/123456789",
    });

    expect(result.platform).toBe("vimeo");
    expect(result.title).toBe("Vimeo Project Pitch");
    expect(result.author).toBe("Bob");
    expect(result.duration).toBe(300);
    expect(result.description).toBe("A pitch for our sustainable project.");
    expect(result.transcript).toBeNull();
    expect(result.url).toBe("https://vimeo.com/123456789");
  });
});

describe("extractVideoContext tool — unknown platform", () => {
  it("returns unknown platform for unrecognized URL", async () => {
    const result = await extractVideoContext.execute({
      url: "https://twitch.tv/streamer/clip/abc",
    });

    expect(result.platform).toBe("unknown");
    expect(result.title).toBeNull();
    expect(result.transcript).toBeNull();
    expect(result.url).toBe("https://twitch.tv/streamer/clip/abc");
  });
});
