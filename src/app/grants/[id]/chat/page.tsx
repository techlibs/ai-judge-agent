"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MAX_MESSAGE_LENGTH = 2000;

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const proposalId = params.id;
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { proposalId },
      }),
    [proposalId],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const welcomeMessage = {
    id: "welcome",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: `Hello! I'm your Grant Analysis Assistant. I can help you explore the evaluation results for this proposal. Try asking me:\n\n- "What are the scores for this proposal?"\n- "Why did the judge give that score on Technical Feasibility?"\n- "What risks were identified?"\n- "How does this compare to other proposals?"`,
      },
    ],
  };

  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Grant Analysis Chat</h1>
          <p className="text-sm text-muted-foreground">
            Proposal: {proposalId}
          </p>
        </div>
        <Link href={`/grants/${proposalId}`}>
          <Button variant="outline" size="sm">
            Back to Proposal
          </Button>
        </Link>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.parts
                .filter(
                  (part): part is { type: "text"; text: string } =>
                    part.type === "text",
                )
                .map((part, i) => (
                  <span key={i}>{part.text}</span>
                ))}
            </div>
          </div>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
              Something went wrong. Please try again.
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Ask about this proposal's evaluation..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isStreaming}
        />
        <Button type="submit" disabled={isStreaming || !inputValue.trim()}>
          {isStreaming ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
