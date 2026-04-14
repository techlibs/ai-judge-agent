"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import type { ProposalInput } from "@/lib/schemas/proposal";

interface ExtractedProposal {
  title: string;
  description: string;
  teamInfo: string;
  budget: number;
  externalLinks: string[];
}

interface VideoContextData {
  platform: "youtube" | "loom" | "vimeo" | "unknown";
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  description: string | null;
  transcript: string | null;
  url: string;
}

interface GithubRepoData {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  languages: Record<string, number>;
  readmeExcerpt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

function extractVideoContextFromMessages(
  messages: UIMessage[]
): VideoContextData | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (!part.type.startsWith("tool-")) continue;

      const toolPart = part as Record<string, unknown>;
      if (
        toolPart.type !== "tool-extractVideoContext" &&
        toolPart.type !== "dynamic-tool"
      )
        continue;

      if (
        toolPart.type === "dynamic-tool" &&
        toolPart.toolName !== "extractVideoContext"
      )
        continue;

      if (toolPart.state !== "output-available") continue;

      const output = toolPart.output as Record<string, unknown> | undefined;
      if (output && typeof output.url === "string") {
        return output as unknown as VideoContextData;
      }
    }
  }
  return null;
}

function extractGithubRepoFromMessages(
  messages: UIMessage[]
): GithubRepoData | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (!part.type.startsWith("tool-")) continue;

      const toolPart = part as Record<string, unknown>;
      if (
        toolPart.type !== "tool-extractGithubRepo" &&
        toolPart.type !== "dynamic-tool"
      )
        continue;

      if (
        toolPart.type === "dynamic-tool" &&
        toolPart.toolName !== "extractGithubRepo"
      )
        continue;

      if (toolPart.state !== "output-available") continue;

      const output = toolPart.output as Record<string, unknown> | undefined;
      if (output && typeof output.name === "string") {
        return output as unknown as GithubRepoData;
      }
    }
  }
  return null;
}

function extractProposalFromMessages(
  messages: UIMessage[]
): ExtractedProposal | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (!part.type.startsWith("tool-")) continue;

      const toolPart = part as Record<string, unknown>;
      if (
        toolPart.type !== "tool-submit_proposal" &&
        toolPart.type !== "dynamic-tool"
      )
        continue;

      // For dynamic-tool parts, check the toolName
      if (
        toolPart.type === "dynamic-tool" &&
        toolPart.toolName !== "submit_proposal"
      )
        continue;

      if (toolPart.state !== "output-available") continue;

      const output = toolPart.output as Record<string, unknown> | undefined;
      if (output?.success && output.proposal) {
        return output.proposal as ExtractedProposal;
      }
    }
  }
  return null;
}

export function ProposalChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    tokenId: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/proposals/chat" }),
    []
  );

  const {
    messages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractedProposal = extractProposalFromMessages(messages);
  const githubRepo = extractGithubRepoFromMessages(messages);
  const videoContext = extractVideoContextFromMessages(messages);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  }

  const handleProposalSubmit = useCallback(async () => {
    if (!extractedProposal || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const proposalData: ProposalInput = {
        title: extractedProposal.title,
        description: extractedProposal.description,
        teamInfo: extractedProposal.teamInfo,
        budget: extractedProposal.budget,
        externalLinks: extractedProposal.externalLinks,
      };

      const response = await fetch("/api/proposals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as Record<string, unknown>;
        const errorMessage =
          typeof errorData.error === "string"
            ? errorData.error
            : "Failed to submit proposal";
        setSubmitError(errorMessage);
        return;
      }

      const result = (await response.json()) as Record<string, unknown>;
      if (typeof result.tokenId === "string") {
        setSubmitResult({ tokenId: result.tokenId });
      }
    } catch {
      setSubmitError("Failed to submit. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [extractedProposal, submitting]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-center text-sm text-muted-foreground">
              Tell me about your project idea and I will help you put together a
              grant proposal. We will work through it step by step.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[85%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background"
              }`}
            >
              <CardContent className="p-3">
                <p className="text-xs font-medium opacity-70">
                  {message.role === "user" ? "You" : "Proposal Assistant"}
                </p>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {message.parts
                    .filter(
                      (part): part is { type: "text"; text: string } =>
                        part.type === "text"
                    )
                    .map((part, i) => (
                      <span key={i}>{part.text}</span>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="mb-4 flex justify-start">
              <Card className="max-w-[85%] bg-background">
                <CardContent className="p-3">
                  <p className="text-xs font-medium opacity-70">
                    Proposal Assistant
                  </p>
                  <div className="mt-1 flex gap-1">
                    <span className="animate-pulse">Thinking</span>
                    <span className="animate-bounce">...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {githubRepo && !extractedProposal && (
        <Card className="mt-3 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              GitHub Repo Extracted:{" "}
              <a
                href={githubRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {githubRepo.name}
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            {githubRepo.description && <p>{githubRepo.description}</p>}
            <div className="flex flex-wrap gap-3">
              <span>{githubRepo.stars.toLocaleString()} stars</span>
              {githubRepo.language && <span>{githubRepo.language}</span>}
              {Object.keys(githubRepo.languages).length > 0 && (
                <span>
                  {Object.keys(githubRepo.languages)
                    .slice(0, 4)
                    .join(", ")}
                </span>
              )}
            </div>
            {githubRepo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {githubRepo.topics.slice(0, 6).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {videoContext && videoContext.platform !== "unknown" && !extractedProposal && (
        <Card className="mt-3 border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {videoContext.platform.charAt(0).toUpperCase() + videoContext.platform.slice(1)} Video Extracted:{" "}
              {videoContext.title ? (
                <a
                  href={videoContext.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {videoContext.title}
                </a>
              ) : (
                <a
                  href={videoContext.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {videoContext.url}
                </a>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            {videoContext.author && <p>By {videoContext.author}</p>}
            {videoContext.duration && (
              <p>{Math.round(videoContext.duration / 60)} min</p>
            )}
            {videoContext.description && (
              <p>
                {videoContext.description.length > 150
                  ? `${videoContext.description.slice(0, 150)}...`
                  : videoContext.description}
              </p>
            )}
            {videoContext.transcript && (
              <p className="rounded bg-purple-100/60 px-2 py-1 dark:bg-purple-900/30">
                Transcript captured ({videoContext.transcript.length} chars)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {extractedProposal && !submitResult && (
        <Card className="mt-3">
          <CardHeader>
            <CardTitle>Proposal Ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Title:</span>{" "}
              {extractedProposal.title}
            </div>
            <div>
              <span className="font-medium">Budget:</span> $
              {extractedProposal.budget.toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Description:</span>{" "}
              {extractedProposal.description.length > 200
                ? `${extractedProposal.description.slice(0, 200)}...`
                : extractedProposal.description}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleProposalSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Proposal On-Chain"}
            </Button>
          </CardFooter>
          {submitError && (
            <div className="px-4 pb-3">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}
        </Card>
      )}

      {submitResult && (
        <Card className="mt-3 border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <p className="font-medium text-green-700 dark:text-green-400">
              Proposal submitted successfully!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Token ID: {submitResult.tokenId}
            </p>
            <a
              href={`/proposals/${submitResult.tokenId}`}
              className="mt-2 inline-block text-sm underline underline-offset-4"
            >
              View your proposal
            </a>
          </CardContent>
        </Card>
      )}

      {chatError && (
        <p className="mt-2 text-sm text-destructive">
          Error: {chatError.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Tell me about your project idea..."
          disabled={isStreaming || !!submitResult}
        />
        <Button
          type="submit"
          disabled={isStreaming || !inputValue.trim() || !!submitResult}
        >
          {isStreaming ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
