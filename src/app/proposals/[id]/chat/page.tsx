"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildProposalContext,
  parseProposalResponse,
  parseEvaluationData,
  type ProposalApiResponse,
  type EvaluationData,
} from "@/lib/chat/context";

const SUGGESTED_QUESTIONS = [
  "What are the main strengths of this proposal?",
  "Which dimension scored the lowest and why?",
  "What could be improved to get a higher score?",
  "Summarize the evaluation in simple terms.",
];

export default function ProposalChatPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [proposal, setProposal] = useState<ProposalApiResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [proposalContext, setProposalContext] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        const proposalRes = await fetch(`/api/proposals/${id}`);
        if (!proposalRes.ok) {
          setFetchError("Failed to load proposal data.");
          return;
        }
        const proposalData: unknown = await proposalRes.json();
        const parsed = parseProposalResponse(proposalData);
        if (!parsed) {
          setFetchError("Invalid proposal data.");
          return;
        }
        setProposal(parsed);

        let evalData: EvaluationData | null = null;
        try {
          const reputationRes = await fetch(`/api/reputation/${id}`);
          if (reputationRes.ok) {
            const repData: unknown = await reputationRes.json();
            evalData = parseEvaluationData(repData);
          }
        } catch {
          // Evaluation data is optional
        }
        setEvaluation(evalData);

        const context = buildProposalContext(parsed, evalData);
        setProposalContext(context);
      } catch {
        setFetchError("Failed to load proposal.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const proposalContextRef = useRef(proposalContext);
  proposalContextRef.current = proposalContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: new Proxy({} as Record<string, string>, {
          get(_target, prop) {
            if (prop === "proposalContext") return proposalContextRef.current;
            return undefined;
          },
          ownKeys() {
            return ["proposalContext"];
          },
          getOwnPropertyDescriptor(_target, prop) {
            if (prop === "proposalContext") {
              return { configurable: true, enumerable: true, value: proposalContextRef.current };
            }
            return undefined;
          },
        }),
      }),
    [],
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || !proposalContext) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  }

  function handleSuggestedQuestion(question: string) {
    if (isStreaming || !proposalContext) return;
    sendMessage({ text: question });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (fetchError || !proposal) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 text-center">
        <p className="text-sm text-destructive">
          {fetchError ?? "Proposal not found."}
        </p>
        <Link
          href="/proposals"
          className="text-sm underline underline-offset-4"
        >
          Back to proposals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col p-6" style={{ height: "calc(100vh - 120px)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href={`/proposals/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Proposal
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            Chat about: {proposal.content.title}
          </h1>
        </div>
        <Link href={`/proposals/${id}/evaluation`}>
          <Button variant="outline" size="sm">
            View Evaluation
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-center text-sm text-muted-foreground">
              Ask anything about this proposal and its evaluation. The assistant
              has access to all scores, justifications, and findings.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSuggestedQuestion(question)}
                  disabled={!proposalContext}
                  className="rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
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
                  {message.role === "user" ? "You" : "Judge Assistant"}
                </p>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {message.parts
                    .filter(
                      (part): part is { type: "text"; text: string } =>
                        part.type === "text",
                    )
                    .map((part, i) => (
                      <span key={i}>{part.text}</span>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="mb-4 flex justify-start">
            <Card className="max-w-[85%] bg-background">
              <CardContent className="p-3">
                <p className="text-xs font-medium opacity-70">Judge Assistant</p>
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

      {chatError && (
        <p className="mt-2 text-sm text-destructive">
          Error: {chatError.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about this proposal..."
          disabled={isStreaming || !proposalContext}
          className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={isStreaming || !inputValue.trim() || !proposalContext}
        >
          {isStreaming ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
