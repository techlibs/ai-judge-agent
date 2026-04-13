"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const NAIVE_OUTPUT_DEMO = `This is a good proposal. I'd give it an 8/10. The team seems capable and the idea is interesting. They should probably provide more details about the budget. Overall it looks promising and I think it could work out well.`;

const STRUCTURED_OUTPUT_DEMO = `Score: 62/100 (Adequate)
Recommendation: Approve

Justification:
The proposal demonstrates a feasible technical approach using established frameworks (Next.js, Solidity). However, the architecture section lacks specificity on scaling beyond the initial deployment. The timeline of 3 months is ambitious given the scope described, with no contingency buffer mentioned. The team has relevant experience in web development but limited blockchain deployment history.

Key Findings:
1. Architecture relies on centralized IPFS pinning with no redundancy plan
2. Timeline lacks contingency buffer for smart contract audit delays
3. Tech stack choices are sound but integration testing plan is absent`;

interface PromptComparisonProps {
  naiveOutput?: string;
  structuredOutput?: string;
}

function OutputPanel({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-y-auto whitespace-pre-wrap font-mono text-sm max-h-[400px]">
          {content}
        </pre>
      </CardContent>
    </Card>
  );
}

export function PromptComparison({
  naiveOutput,
  structuredOutput,
}: PromptComparisonProps) {
  const naive = naiveOutput ?? NAIVE_OUTPUT_DEMO;
  const structured = structuredOutput ?? STRUCTURED_OUTPUT_DEMO;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[20px] font-semibold">
          Prompt Engineering Comparison
        </h3>
        <CardDescription>
          See how structured prompts with calibrated rubrics produce more
          consistent and actionable evaluations compared to simple
          open-ended prompts.
        </CardDescription>
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        <OutputPanel title="Naive Prompt" content={naive} />
        <OutputPanel title="Structured Prompt" content={structured} />
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="naive">
          <TabsList>
            <TabsTrigger value="naive">Naive</TabsTrigger>
            <TabsTrigger value="structured">Structured</TabsTrigger>
          </TabsList>
          <TabsContent value="naive">
            <OutputPanel title="Naive Prompt" content={naive} />
          </TabsContent>
          <TabsContent value="structured">
            <OutputPanel
              title="Structured Prompt"
              content={structured}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
