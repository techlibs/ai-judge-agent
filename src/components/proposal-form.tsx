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

type FieldErrors = Partial<Record<string, string>>;

function validateForm(formData: FormData, teamMembers: TeamMember[]): FieldErrors {
  const errors: FieldErrors = {};

  const title = String(formData.get("title") ?? "");
  if (title.length < 5) errors["title"] = "Title must be at least 5 characters";

  const description = String(formData.get("description") ?? "");
  if (description.length < 50) errors["description"] = "Description must be at least 50 characters";

  const problemStatement = String(formData.get("problemStatement") ?? "");
  if (problemStatement.length < 20) errors["problemStatement"] = "Problem statement must be at least 20 characters";

  const proposedSolution = String(formData.get("proposedSolution") ?? "");
  if (proposedSolution.length < 20) errors["proposedSolution"] = "Proposed solution must be at least 20 characters";

  const budgetAmount = Number(formData.get("budgetAmount"));
  if (!budgetAmount || budgetAmount < 100) errors["budgetAmount"] = "Budget must be at least 100 USDC";
  else if (budgetAmount > 1000000) errors["budgetAmount"] = "Budget cannot exceed 1,000,000 USDC";

  const budgetBreakdown = String(formData.get("budgetBreakdown") ?? "");
  if (budgetBreakdown.length < 20) errors["budgetBreakdown"] = "Budget breakdown must be at least 20 characters";

  const timeline = String(formData.get("timeline") ?? "");
  if (timeline.length < 10) errors["timeline"] = "Timeline must be at least 10 characters";

  const demoDayDeliverable = String(formData.get("demoDayDeliverable") ?? "");
  if (demoDayDeliverable.length < 10) errors["demoDayDeliverable"] = "Demo day deliverable must be at least 10 characters";

  const communityContribution = String(formData.get("communityContribution") ?? "");
  if (communityContribution.length < 10) errors["communityContribution"] = "Community contribution must be at least 10 characters";

  if (!formData.get("category")) errors["category"] = "Please select a category";
  if (!formData.get("residencyDuration")) errors["residencyDuration"] = "Please select a residency duration";
  if (!formData.get("priorIpeParticipation")) errors["priorIpeParticipation"] = "Please select an option";

  const filledMembers = teamMembers.filter((m) => m.name.length > 0);
  if (filledMembers.length === 0) errors["teamMembers"] = "At least one team member is required";

  return errors;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function ProposalForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

    const formData = new FormData(e.currentTarget);
    const errors = validateForm(formData, teamMembers);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

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
            <Input id="title" name="title" aria-invalid={!!fieldErrors["title"]} />
            <FieldError message={fieldErrors["title"]} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} aria-invalid={!!fieldErrors["description"]} />
            <FieldError message={fieldErrors["description"]} />
          </div>
          <div>
            <Label htmlFor="problemStatement">Problem Statement</Label>
            <Textarea id="problemStatement" name="problemStatement" rows={3} aria-invalid={!!fieldErrors["problemStatement"]} />
            <FieldError message={fieldErrors["problemStatement"]} />
          </div>
          <div>
            <Label htmlFor="proposedSolution">Proposed Solution</Label>
            <Textarea id="proposedSolution" name="proposedSolution" rows={3} aria-invalid={!!fieldErrors["proposedSolution"]} />
            <FieldError message={fieldErrors["proposedSolution"]} />
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
                <Input value={member.name} onChange={(e) => updateTeamMember(i, "name", e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Role</Label>
                <Input value={member.role} onChange={(e) => updateTeamMember(i, "role", e.target.value)} />
              </div>
              {teamMembers.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeTeamMember(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {fieldErrors["teamMembers"] && (
            <FieldError message={fieldErrors["teamMembers"]} />
          )}
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
            <Input id="budgetAmount" name="budgetAmount" type="number" aria-invalid={!!fieldErrors["budgetAmount"]} />
            <FieldError message={fieldErrors["budgetAmount"]} />
          </div>
          <div>
            <Label htmlFor="budgetBreakdown">Budget Breakdown</Label>
            <Textarea id="budgetBreakdown" name="budgetBreakdown" rows={3} aria-invalid={!!fieldErrors["budgetBreakdown"]} />
            <FieldError message={fieldErrors["budgetBreakdown"]} />
          </div>
          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Textarea id="timeline" name="timeline" rows={2} aria-invalid={!!fieldErrors["timeline"]} />
            <FieldError message={fieldErrors["timeline"]} />
          </div>
        </CardContent>
      </Card>

      {/* IPE Village */}
      <Card>
        <CardHeader><CardTitle>IPE Village</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="residencyDuration">Residency Duration</Label>
            <Select name="residencyDuration">
              <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                {RESIDENCY_DURATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d.replace("-", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors["residencyDuration"]} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select name="category">
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {PROPOSAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors["category"]} />
          </div>
          <div>
            <Label htmlFor="demoDayDeliverable">Demo Day Deliverable</Label>
            <Textarea id="demoDayDeliverable" name="demoDayDeliverable" rows={2} aria-invalid={!!fieldErrors["demoDayDeliverable"]} />
            <FieldError message={fieldErrors["demoDayDeliverable"]} />
          </div>
          <div>
            <Label htmlFor="communityContribution">Community Contribution</Label>
            <Textarea id="communityContribution" name="communityContribution" rows={2} aria-invalid={!!fieldErrors["communityContribution"]} />
            <FieldError message={fieldErrors["communityContribution"]} />
          </div>
          <div>
            <Label htmlFor="priorIpeParticipation">Prior IPE Participation</Label>
            <Select name="priorIpeParticipation">
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No (first time)</SelectItem>
                <SelectItem value="true">Yes (returning Architect)</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors["priorIpeParticipation"]} />
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
