"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proposalSchema } from "@/lib/schemas/proposal";
import { FIELD_LIMITS } from "@/lib/constants/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FieldErrors {
  title?: string[];
  description?: string[];
  teamInfo?: string[];
  budget?: string[];
  externalLinks?: string[];
}

export function ProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamInfo, setTeamInfo] = useState("");
  const [budget, setBudget] = useState("");
  const [externalLinks, setExternalLinks] = useState<string[]>([""]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addLink() {
    if (externalLinks.length >= FIELD_LIMITS.EXTERNAL_LINKS_MAX) return;
    setExternalLinks([...externalLinks, ""]);
  }

  function removeLink(index: number) {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  }

  function updateLink(index: number, value: string) {
    const updated = [...externalLinks];
    updated[index] = value;
    setExternalLinks(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError("");

    const data = {
      title,
      description,
      teamInfo,
      budget: Number(budget),
      externalLinks: externalLinks.filter((link) => link.trim() !== ""),
    };

    const parsed = proposalSchema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      setFormError("Please fix the errors above before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/proposals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const errorData: unknown = await response.json();
        if (
          errorData &&
          typeof errorData === "object" &&
          "error" in errorData
        ) {
          const typed = errorData as { error: string };
          setFormError(typed.error);
        } else {
          setFormError(
            "Failed to submit proposal. Check your connection and try again."
          );
        }
        return;
      }

      const result: unknown = await response.json();
      if (result && typeof result === "object" && "tokenId" in result) {
        const typed = result as { tokenId: string };
        router.push(`/proposals/${typed.tokenId}`);
      }
    } catch {
      setFormError(
        "Failed to submit proposal. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposal Details</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your proposal a clear, descriptive title"
              maxLength={FIELD_LIMITS.TITLE_MAX}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {fieldErrors.title?.[0] && (
                  <span className="text-destructive">
                    {fieldErrors.title[0]}
                  </span>
                )}
              </span>
              <span>
                {title.length}/{FIELD_LIMITS.TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project, its goals, and expected outcomes"
              rows={6}
              maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {fieldErrors.description?.[0] && (
                  <span className="text-destructive">
                    {fieldErrors.description[0]}
                  </span>
                )}
              </span>
              <span>
                {description.length}/{FIELD_LIMITS.DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamInfo">Team Information</Label>
            <Textarea
              id="teamInfo"
              value={teamInfo}
              onChange={(e) => setTeamInfo(e.target.value)}
              placeholder="Who is on your team? What relevant experience do they have?"
              rows={4}
              maxLength={FIELD_LIMITS.TEAM_INFO_MAX}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {fieldErrors.teamInfo?.[0] && (
                  <span className="text-destructive">
                    {fieldErrors.teamInfo[0]}
                  </span>
                )}
              </span>
              <span>
                {teamInfo.length}/{FIELD_LIMITS.TEAM_INFO_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              min={1}
              max={FIELD_LIMITS.BUDGET_MAX}
            />
            {fieldErrors.budget?.[0] && (
              <p className="text-sm text-destructive">
                {fieldErrors.budget[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>External Links</Label>
            <div className="space-y-2">
              {externalLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                  {externalLinks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(index)}
                      className="shrink-0"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {fieldErrors.externalLinks?.[0] && (
              <p className="text-sm text-destructive">
                {fieldErrors.externalLinks[0]}
              </p>
            )}
            {externalLinks.length < FIELD_LIMITS.EXTERNAL_LINKS_MAX && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
              >
                Add link
              </Button>
            )}
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Proposal"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
