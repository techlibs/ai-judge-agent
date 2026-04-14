import { createTool } from "@mastra/core/tools";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";

const TRANSCRIPT_CHAR_LIMIT = 5000;

const videoOutputSchema = z.object({
  platform: z.enum(["youtube", "loom", "vimeo", "unknown"]),
  title: z.string().nullable(),
  author: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  duration: z.number().nullable(),
  description: z.string().nullable(),
  transcript: z.string().nullable(),
  url: z.string(),
});

type VideoOutput = z.infer<typeof videoOutputSchema>;

type Platform = VideoOutput["platform"];

function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "youtu.be") return "youtube";
    if (hostname === "loom.com" && parsed.pathname.startsWith("/share"))
      return "loom";
    if (hostname === "vimeo.com") return "vimeo";
    return "unknown";
  } catch {
    return "unknown";
  }
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  description?: string;
  duration?: number;
}

async function fetchOEmbed(
  oembedUrl: string
): Promise<OEmbedResponse | null> {
  try {
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "ipe-city-agent-reviewer/1.0" },
    });
    if (!response.ok) return null;
    return response.json() as Promise<OEmbedResponse>;
  } catch {
    return null;
  }
}

async function fetchYoutubeTranscript(url: string): Promise<string | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
    const full = segments.map((s) => s.text).join(" ");
    return full.slice(0, TRANSCRIPT_CHAR_LIMIT);
  } catch {
    return null;
  }
}

async function extractYoutube(url: string): Promise<VideoOutput> {
  const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const [oembed, transcript] = await Promise.all([
    fetchOEmbed(oembedEndpoint),
    fetchYoutubeTranscript(url),
  ]);

  return {
    platform: "youtube",
    title: oembed?.title ?? null,
    author: oembed?.author_name ?? null,
    thumbnailUrl: oembed?.thumbnail_url ?? null,
    duration: oembed?.duration ?? null,
    description: null,
    transcript,
    url,
  };
}

async function extractLoom(url: string): Promise<VideoOutput> {
  const oembedEndpoint = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`;
  const oembed = await fetchOEmbed(oembedEndpoint);

  return {
    platform: "loom",
    title: oembed?.title ?? null,
    author: oembed?.author_name ?? null,
    thumbnailUrl: oembed?.thumbnail_url ?? null,
    duration: oembed?.duration ?? null,
    description: null,
    transcript: null,
    url,
  };
}

async function extractVimeo(url: string): Promise<VideoOutput> {
  const oembedEndpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  const oembed = await fetchOEmbed(oembedEndpoint);

  return {
    platform: "vimeo",
    title: oembed?.title ?? null,
    author: oembed?.author_name ?? null,
    thumbnailUrl: oembed?.thumbnail_url ?? null,
    duration: oembed?.duration ?? null,
    description: oembed?.description ?? null,
    transcript: null,
    url,
  };
}

export const extractVideoContext = createTool({
  id: "extractVideoContext",
  description:
    "Extract metadata and transcript from a video URL (YouTube, Loom, or Vimeo). Use this whenever the user shares a video link to pull in context for their proposal — transcript for YouTube, metadata for all platforms.",
  inputSchema: z.object({
    url: z.string().url().describe("The video URL"),
  }),
  outputSchema: videoOutputSchema,
  execute: async (input): Promise<VideoOutput> => {
    const platform = detectPlatform(input.url);

    if (platform === "youtube") return extractYoutube(input.url);
    if (platform === "loom") return extractLoom(input.url);
    if (platform === "vimeo") return extractVimeo(input.url);

    return {
      platform: "unknown",
      title: null,
      author: null,
      thumbnailUrl: null,
      duration: null,
      description: null,
      transcript: null,
      url: input.url,
    };
  },
});
