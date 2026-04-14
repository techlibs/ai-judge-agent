"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProposalChat } from "@/components/proposals/proposal-chat";
import { ProposalForm } from "@/components/proposals/proposal-form";

const TAB_CHAT = "chat";
const TAB_FORM = "form";

export function NewProposalTabs() {
  return (
    <Tabs defaultValue={TAB_CHAT}>
      <TabsList>
        <TabsTrigger value={TAB_CHAT}>Chat with AI</TabsTrigger>
        <TabsTrigger value={TAB_FORM}>Use Form</TabsTrigger>
      </TabsList>

      <TabsContent value={TAB_CHAT}>
        <ProposalChat />
      </TabsContent>

      <TabsContent value={TAB_FORM}>
        <ProposalForm />
      </TabsContent>
    </Tabs>
  );
}
