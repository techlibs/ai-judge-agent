import { http, HttpResponse } from "msw";

const OPENAI_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

const MOCK_IPFS_HASH = "QmTest123MockHashForE2ETesting456789abcdef";

/**
 * Mock judge evaluation matching JudgeEvaluationSchema from src/lib/judges/schemas.ts.
 * Score is in basis points (0-10000), confidence and recommendation are enums.
 */
const mockJudgeEvaluation = {
  score: 7500,
  confidence: "high",
  recommendation: "fund",
  justification:
    "The proposal demonstrates strong technical feasibility with a clear implementation plan and experienced team.",
  keyFindings: [
    "Well-defined sensor architecture with proven IoT components",
    "On-chain attestation adds transparency and verifiability",
    "Open-source commitment strengthens community value",
  ],
  risks: [
    "Hardware supply chain delays could impact timeline",
    "Sensor calibration in field conditions requires expertise",
  ],
  ipeAlignment: {
    proTechnology: 85,
    proFreedom: 70,
    proHumanProgress: 80,
  },
};

function createOpenAiCompletionResponse(content: unknown) {
  return {
    id: "chatcmpl-mock-e2e-test",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify(content),
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 200,
      total_tokens: 700,
    },
  };
}

function createAnthropicMessageResponse(content: unknown) {
  return {
    id: "msg-mock-e2e-test",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: JSON.stringify(content),
      },
    ],
    model: "claude-sonnet-4-20250514",
    stop_reason: "end_turn",
    usage: {
      input_tokens: 500,
      output_tokens: 200,
    },
  };
}

export const defaultHandlers = [
  http.post(OPENAI_COMPLETIONS_URL, () => {
    return HttpResponse.json(
      createOpenAiCompletionResponse(mockJudgeEvaluation)
    );
  }),

  http.post(ANTHROPIC_MESSAGES_URL, () => {
    return HttpResponse.json(
      createAnthropicMessageResponse(mockJudgeEvaluation)
    );
  }),

  http.post(PINATA_PIN_JSON_URL, () => {
    return HttpResponse.json({
      IpfsHash: MOCK_IPFS_HASH,
      PinSize: 1234,
      Timestamp: new Date().toISOString(),
    });
  }),
];

export const aiFailureHandlers = [
  http.post(OPENAI_COMPLETIONS_URL, () => {
    return HttpResponse.json(
      {
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      },
      { status: 429 }
    );
  }),

  http.post(ANTHROPIC_MESSAGES_URL, () => {
    return HttpResponse.json(
      {
        type: "error",
        error: {
          type: "overloaded_error",
          message: "Overloaded",
        },
      },
      { status: 529 }
    );
  }),

  http.post(PINATA_PIN_JSON_URL, () => {
    return HttpResponse.json({
      IpfsHash: MOCK_IPFS_HASH,
      PinSize: 1234,
      Timestamp: new Date().toISOString(),
    });
  }),
];

export const ipfsFailureHandlers = [
  http.post(OPENAI_COMPLETIONS_URL, () => {
    return HttpResponse.json(
      createOpenAiCompletionResponse(mockJudgeEvaluation)
    );
  }),

  http.post(ANTHROPIC_MESSAGES_URL, () => {
    return HttpResponse.json(
      createAnthropicMessageResponse(mockJudgeEvaluation)
    );
  }),

  http.post(PINATA_PIN_JSON_URL, () => {
    return HttpResponse.json(
      { error: "Pinata service unavailable" },
      { status: 503 }
    );
  }),
];
