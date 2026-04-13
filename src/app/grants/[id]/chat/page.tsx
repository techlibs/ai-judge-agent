"use client";

import { useChat } from "ai/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef, useEffect } from "react";

const SUGGESTED_QUESTIONS = [
  "Why did the judge give this score?",
  "What are the strengths of this proposal?",
  "What could be improved?",
  "How does this compare to other proposals?",
];

export default function ProposalChatPage() {
  const params = useParams();
  const proposalId =
    typeof params.id === "string" ? params.id : "";

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useChat({
    api: "/api/chat",
    body: { proposalId },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSuggestedQuestion(question: string) {
    void append({ role: "user", content: question });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <Link
            href={`/grants/${proposalId}`}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            &larr; Back to proposal
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-gray-900">
            Evaluation Assistant
          </h1>
          <p className="text-sm text-gray-500">
            Ask questions about this proposal&apos;s evaluation
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Grant Evaluation Assistant
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Ask me anything about this proposal&apos;s evaluation, scores,
                or how it compares to other grants.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSuggestedQuestion(question)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
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
            className={`mb-4 flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.parts
                  .filter((part) => part.type === "text")
                  .map((part, index) => (
                    <span key={index}>
                      {part.type === "text" ? part.text : null}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500 [animation-delay:0.2s]" />
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500 [animation-delay:0.4s]" />
                <span className="ml-1">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        id="chat-form"
        onSubmit={handleSubmit}
        className="mt-4 flex gap-2 border-t border-gray-200 pt-4"
      >
        <input
          name="message"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the evaluation..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || input.trim().length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
