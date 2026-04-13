"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MAX_MESSAGE_LENGTH = 2000;

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const proposalId = params.id;

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: { proposalId },
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: `Hello! I'm your Grant Analysis Assistant. I can help you explore the evaluation results for this proposal. Try asking me:\n\n- "What are the scores for this proposal?"\n- "Why did the judge give that score on Technical Feasibility?"\n- "What risks were identified?"\n- "How does this compare to other proposals?"`,
        },
      ],
    });

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
        {messages.map((message) => (
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
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
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
      </Card>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Ask about this proposal's evaluation..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || input.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  );
}
