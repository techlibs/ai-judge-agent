"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

interface TeamMember {
  name: string;
  role: string;
}

export function ProposalForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ name: "", role: "" }]);
  const [links, setLinks] = useState<string[]>([""]);

  const addTeamMember = () => setTeamMembers((prev) => [...prev, { name: "", role: "" }]);
  const removeTeamMember = (index: number) =>
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) =>
    setTeamMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  const addLink = () => setLinks((prev) => [...prev, ""]);
  const removeLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));
  const updateLink = (index: number, value: string) =>
    setLinks((prev) => prev.map((l, i) => (i === index ? value : l)));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      problemStatement: formData.get("problemStatement"),
      proposedSolution: formData.get("proposedSolution"),
      teamMembers: teamMembers.filter((m) => m.name.length > 0),
      budgetAmount: Number(formData.get("budgetAmount")),
      budgetBreakdown: formData.get("budgetBreakdown"),
      timeline: formData.get("timeline"),
      category: formData.get("category"),
      residencyDuration: formData.get("residencyDuration"),
      demoDayDeliverable: formData.get("demoDayDeliverable"),
      communityContribution: formData.get("communityContribution"),
      priorIpeParticipation: formData.get("priorIpeParticipation") === "true",
      links: links.filter((l) => l.length > 0),
    };

    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/grants/${data.id}/evaluate`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* Project Info */}
      <Card>
        <CardHeader><CardTitle>Project Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required minLength={5} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required minLength={50} rows={4} />
          </div>
          <div>
            <Label htmlFor="problemStatement">Problem Statement</Label>
            <Textarea id="problemStatement" name="problemStatement" required minLength={20} rows={3} />
          </div>
          <div>
            <Label htmlFor="proposedSolution">Proposed Solution</Label>
            <Textarea id="proposedSolution" name="proposedSolution" required minLength={20} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {teamMembers.map((member, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Name</Label>
                <Input value={member.name} onChange={(e) => updateTeamMember(i, "name", e.target.value)} required />
              </div>
              <div className="flex-1">
                <Label>Role</Label>
                <Input value={member.role} onChange={(e) => updateTeamMember(i, "role", e.target.value)} required />
              </div>
              {teamMembers.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeTeamMember(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTeamMember}>
            Add team member
          </Button>
        </CardContent>
      </Card>

      {/* Funding */}
      <Card>
        <CardHeader><CardTitle>Funding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="budgetAmount">Budget (USDC)</Label>
            <Input id="budgetAmount" name="budgetAmount" type="number" required min={100} max={1000000} />
          </div>
          <div>
            <Label htmlFor="budgetBreakdown">Budget Breakdown</Label>
            <Textarea id="budgetBreakdown" name="budgetBreakdown" required minLength={20} rows={3} />
          </div>
          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Textarea id="timeline" name="timeline" required minLength={10} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* IPE Village */}
      <Card>
        <CardHeader><CardTitle>IPE Village</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="residencyDuration">Residency Duration</Label>
            <Select name="residencyDuration" required>
              <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                {RESIDENCY_DURATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d.replace("-", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select name="category" required>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {PROPOSAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="demoDayDeliverable">Demo Day Deliverable</Label>
            <Textarea id="demoDayDeliverable" name="demoDayDeliverable" required minLength={10} rows={2} />
          </div>
          <div>
            <Label htmlFor="communityContribution">Community Contribution</Label>
            <Textarea id="communityContribution" name="communityContribution" required minLength={10} rows={2} />
          </div>
          <div>
            <Label htmlFor="priorIpeParticipation">Prior IPE Participation</Label>
            <Select name="priorIpeParticipation" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No (first time)</SelectItem>
                <SelectItem value="true">Yes (returning Architect)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader><CardTitle>Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
                placeholder="https://..."
                type="url"
                className="flex-1"
              />
              {links.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeLink(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLink}>
            Add link
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? "Submitting..." : "Submit Proposal"}
      </Button>
    </form>
  );
}
