import { createTool } from "@mastra/core/tools";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";

// ─── Constants ──────────────────────────────────────────────────────

const TRANSCRIPT_MAX_CHARS = 5000;
const OEMBED_YOUTUBE_ENDPOINT = "https://www.youtube.com/oembed";
const OEMBED_VIMEO_ENDPOINT = "https://vimeo.com/api/oembed.json";
const OEMBED_LOOM_ENDPOINT = "https://www.loom.com/v1/oembed";

// ─── Output Schema ───────────────────────────────────────────────────

export const VideoContextSchema = z.object({
  platform: z.enum(["youtube", "loom", "vimeo", "unknown"]),
  title: z.string().nullable(),
  author: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  duration: z.number().nullable(),
  description: z.string().nullable(),
  transcript: z.string().nullable(),
  url: z.string(),
});

export type VideoContext = z.infer<typeof VideoContextSchema>;

// ─── Platform Detection ──────────────────────────────────────────────

type VideoPlatform = "youtube" | "loom" | "vimeo" | "unknown";

function detectPlatform(url: string): VideoPlatform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "youtu.be") return "youtube";
    if (hostname === "loom.com" && parsed.pathname.startsWith("/share"))
      return "loom";
    if (hostname === "vimeo.com") return "vimeo";
  } catch {
    // invalid URL — fall through to unknown
  }
  return "unknown";
}

// ─── OEmbed Response Schema ──────────────────────────────────────────

const OEmbedResponseSchema = z.object({
  title: z.string().optional(),
  author_name: z.string().optional(),
  thumbnail_url: z.string().optional(),
  duration: z.number().optional(),
  description: z.string().optional(),
});

async function fetchOEmbed(
  endpoint: string,
  videoUrl: string,
): Promise<z.infer<typeof OEmbedResponseSchema> | null> {
  try {
    const params = new URLSearchParams({ url: videoUrl, format: "json" });
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) return null;

    const data: unknown = await response.json();
    const parsed = OEmbedResponseSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ─── Platform-Specific Extractors ───────────────────────────────────

async function extractYouTube(url: string): Promise<VideoContext> {
  const [oEmbed, transcriptItems] = await Promise.all([
    fetchOEmbed(OEMBED_YOUTUBE_ENDPOINT, url),
    YoutubeTranscript.fetchTranscript(url).catch(() => null),
  ]);

  const rawTranscript = transcriptItems
    ? transcriptItems.map((item) => item.text).join(" ")
    : null;

  const transcript = rawTranscript
    ? rawTranscript.slice(0, TRANSCRIPT_MAX_CHARS)
    : null;

  return {
    platform: "youtube",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: oEmbed?.duration ?? null,
    description: null,
    transcript,
    url,
  };
}

async function extractLoom(url: string): Promise<VideoContext> {
  const oEmbed = await fetchOEmbed(OEMBED_LOOM_ENDPOINT, url);

  return {
    platform: "loom",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: oEmbed?.duration ?? null,
    description: null,
    transcript: null,
    url,
  };
}

async function extractVimeo(url: string): Promise<VideoContext> {
  const oEmbed = await fetchOEmbed(OEMBED_VIMEO_ENDPOINT, url);

  return {
    platform: "vimeo",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: oEmbed?.duration ?? null,
    description: oEmbed?.description ?? null,
    transcript: null,
    url,
  };
}

// ─── Tool Definition ─────────────────────────────────────────────────

export const extractVideoContext = createTool({
  id: "extractVideoContext",
  description:
    "Extracts metadata and transcript from a video URL (YouTube, Loom, or Vimeo). Use this whenever a user shares a video link to understand their project demo or pitch.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: VideoContextSchema,
  execute: async ({ url }: { url: string }): Promise<VideoContext> => {
    const platform = detectPlatform(url);

    if (platform === "youtube") return extractYouTube(url);
    if (platform === "loom") return extractLoom(url);
    if (platform === "vimeo") return extractVimeo(url);

    return {
      platform: "unknown",
      title: null,
      author: null,
      thumbnailUrl: null,
      duration: null,
      description: null,
      transcript: null,
      url,
    };
  },
});
