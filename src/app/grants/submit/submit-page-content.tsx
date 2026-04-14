"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalChat } from "@/components/proposal-chat";
import { ProposalForm } from "@/components/proposal-form";

export function SubmitPageContent() {
  return (
    <Tabs defaultValue="chat" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chat" data-testid="tab-chat">
          Chat with AI
        </TabsTrigger>
        <TabsTrigger value="form" data-testid="tab-form">
          Use Form
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="mt-6">
        <ProposalChat />
      </TabsContent>
      <TabsContent value="form" className="mt-6">
        <ProposalForm />
      </TabsContent>
    </Tabs>
  );
}
