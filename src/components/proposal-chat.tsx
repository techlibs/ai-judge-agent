"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── GitHub Repo Preview ─────────────────────────────────────────────

interface GitHubRepoPreview {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  languages: Record<string, number>;
}

function extractGitHubRepoFromParts(
  parts: Array<{ type: string; [key: string]: unknown }>,
): GitHubRepoPreview | null {
  for (const part of parts) {
    if (part.type !== "tool-invocation") continue;
    const toolName = part.toolName as string | undefined;
    const state = part.state as string | undefined;
    if (toolName !== "extractGithubRepo" || state !== "result") continue;

    const result = part.result as Record<string, unknown> | undefined;
    if (!result) continue;

    const name = result.name as string | undefined;
    if (!name) continue;

    return {
      name,
      description: (result.description as string | null) ?? null,
      stars: (result.stars as number) ?? 0,
      language: (result.language as string | null) ?? null,
      topics: (result.topics as string[]) ?? [],
      languages: (result.languages as Record<string, number>) ?? {},
    };
  }
  return null;
}

function GitHubRepoCard({ repo }: { repo: GitHubRepoPreview }) {
  const topLanguages = Object.keys(repo.languages).slice(0, 3);

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>{repo.name}</span>
          <Badge variant="secondary">{repo.stars} stars</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {repo.description && (
          <p className="text-muted-foreground">{repo.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {repo.language && (
            <Badge variant="outline">{repo.language}</Badge>
          )}
          {topLanguages.map((lang) => (
            <Badge key={lang} variant="outline">
              {lang}
            </Badge>
          ))}
        </div>
        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 5).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Proposal Preview ────────────────────────────────────────────────

interface ProposalPreview {
  title: string;
  description: string;
  category: string;
  budgetAmount: number;
  teamMembers: Array<{ name: string; role: string }>;
  residencyDuration: string;
}

function extractProposalFromParts(
  parts: Array<{ type: string; [key: string]: unknown }>,
): ProposalPreview | null {
  for (const part of parts) {
    if (part.type !== "tool-invocation") continue;
    const toolName = part.toolName as string | undefined;
    const state = part.state as string | undefined;
    if (toolName !== "submitProposal" || state !== "result") continue;

    const result = part.result as Record<string, unknown> | undefined;
    if (!result?.submitted) continue;

    const proposal = result.proposal as Record<string, unknown>;
    return {
      title: proposal.title as string,
      description: proposal.description as string,
      category: proposal.category as string,
      budgetAmount: proposal.budgetAmount as number,
      teamMembers: proposal.teamMembers as Array<{
        name: string;
        role: string;
      }>,
      residencyDuration: proposal.residencyDuration as string,
    };
  }
  return null;
}

function ProposalPreviewCard({ proposal }: { proposal: ProposalPreview }) {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Proposal Ready</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Title:</span> {proposal.title}
        </div>
        <div>
          <span className="font-medium">Category:</span>{" "}
          <Badge variant="secondary">{proposal.category}</Badge>
        </div>
        <div>
          <span className="font-medium">Budget:</span>{" "}
          {proposal.budgetAmount.toLocaleString()} USDC
        </div>
        <div>
          <span className="font-medium">Duration:</span>{" "}
          {proposal.residencyDuration.replace("-", " ")}
        </div>
        <div>
          <span className="font-medium">Team:</span>{" "}
          {proposal.teamMembers.map((m) => `${m.name} (${m.role})`).join(", ")}
        </div>
        <p className="text-muted-foreground line-clamp-2">
          {proposal.description}
        </p>
      </CardContent>
    </Card>
  );
}

export function ProposalChat() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/proposals/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const submittedProposal = useMemo(() => {
    for (const message of [...messages].reverse()) {
      if (message.role !== "assistant") continue;
      const proposal = extractProposalFromParts(
        message.parts as Array<{ type: string; [key: string]: unknown }>,
      );
      if (proposal) return proposal;
    }
    return null;
  }, [messages]);

  const extractedRepos = useMemo(() => {
    const repos: GitHubRepoPreview[] = [];
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const repo = extractGitHubRepoFromParts(
        message.parts as Array<{ type: string; [key: string]: unknown }>,
      );
      if (repo) repos.push(repo);
    }
    return repos;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">
              Welcome to the Proposal Assistant
            </p>
            <p>
              Tell me about your project idea, and I will help you build a
              complete grant proposal.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
              data-testid={`chat-message-${message.role}`}
            >
              {message.parts
                .filter(
                  (part): part is { type: "text"; text: string } =>
                    part.type === "text",
                )
                .map((part, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {part.text}
                  </p>
                ))}
            </div>
          </div>
        ))}

        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex justify-start">
              <div
                className="bg-muted rounded-lg px-4 py-2"
                data-testid="typing-indicator"
              >
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

        {error && (
          <div className="text-center text-destructive text-sm py-2">
            Something went wrong. Please try again.
          </div>
        )}
      </div>

      {extractedRepos.length > 0 && (
        <div className="px-4 pb-2 space-y-2">
          {extractedRepos.map((repo) => (
            <GitHubRepoCard key={repo.name} repo={repo} />
          ))}
        </div>
      )}

      {submittedProposal && (
        <div className="px-4 pb-2">
          <ProposalPreviewCard proposal={submittedProposal} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t"
        data-testid="chat-input-form"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe your project idea..."
          disabled={isStreaming}
          data-testid="chat-input"
        />
        <Button
          type="submit"
          disabled={isStreaming || inputValue.trim().length === 0}
        >
          {isStreaming ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
