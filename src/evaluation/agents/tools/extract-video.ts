import { createTool } from "@mastra/core/tools";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";

const TRANSCRIPT_MAX_CHARS = 5000;

const VIDEO_PLATFORMS = ["youtube", "loom", "vimeo", "unknown"] as const;

const videoDataOutputSchema = z.object({
  platform: z.enum(VIDEO_PLATFORMS),
  title: z.string().nullable(),
  author: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  duration: z.number().nullable(),
  description: z.string().nullable(),
  transcript: z.string().nullable(),
  url: z.string(),
});

export type VideoData = z.infer<typeof videoDataOutputSchema>;

type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

function detectPlatform(url: string): VideoPlatform {
  if (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts/")
  ) {
    return "youtube";
  }
  if (url.includes("loom.com/share/")) {
    return "loom";
  }
  if (/vimeo\.com\/\d/.test(url)) {
    return "vimeo";
  }
  return "unknown";
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  duration?: number;
  description?: string;
}

async function fetchOEmbed(oembedUrl: string): Promise<OEmbedResponse | null> {
  try {
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "ipe-city-agent-reviewer" },
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
    const joined = segments.map((s) => s.text).join(" ");
    return joined.slice(0, TRANSCRIPT_MAX_CHARS);
  } catch {
    return null;
  }
}

async function extractYoutube(url: string): Promise<Omit<VideoData, "url">> {
  const [oEmbed, transcript] = await Promise.all([
    fetchOEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`),
    fetchYoutubeTranscript(url),
  ]);

  return {
    platform: "youtube",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: null,
    description: null,
    transcript,
  };
}

async function extractLoom(url: string): Promise<Omit<VideoData, "url">> {
  const oEmbed = await fetchOEmbed(
    `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`
  );

  return {
    platform: "loom",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: null,
    description: null,
    transcript: null,
  };
}

async function extractVimeo(url: string): Promise<Omit<VideoData, "url">> {
  const oEmbed = await fetchOEmbed(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
  );

  return {
    platform: "vimeo",
    title: oEmbed?.title ?? null,
    author: oEmbed?.author_name ?? null,
    thumbnailUrl: oEmbed?.thumbnail_url ?? null,
    duration: oEmbed?.duration ?? null,
    description: oEmbed?.description ?? null,
    transcript: null,
  };
}

export const extractVideoContext = createTool({
  id: "extractVideoContext",
  description:
    "Extracts metadata and transcript from a YouTube, Loom, or Vimeo video URL. YouTube videos include a full transcript — use it to understand the project and draft proposal fields. For Loom and Vimeo, only metadata (title, author, thumbnail) is available.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: videoDataOutputSchema,
  execute: async (inputData) => {
    const { url } = inputData;
    const platform = detectPlatform(url);

    if (platform === "youtube") {
      const data = await extractYoutube(url);
      return { ...data, url };
    }

    if (platform === "loom") {
      const data = await extractLoom(url);
      return { ...data, url };
    }

    if (platform === "vimeo") {
      const data = await extractVimeo(url);
      return { ...data, url };
    }

    return {
      platform: "unknown" as const,
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
