"use client";

import { useActionState, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { submitProposal } from "./actions";
import type { ActionState } from "./actions";
import { proposalFormSchema } from "./schema";
import type { ProposalFormErrors } from "./schema";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastructure",
  research: "Research",
  community: "Community",
  education: "Education",
  creative: "Creative",
};

const DURATION_LABELS: Record<string, string> = {
  "3-weeks": "3 Weeks",
  "4-weeks": "4 Weeks",
  "5-weeks": "5 Weeks",
};

const DESCRIPTION_MAX = 5000;
const PROBLEM_MAX = 3000;
const SOLUTION_MAX = 5000;

interface TeamMember {
  name: string;
  role: string;
}

const initialState: ActionState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Submitting & Evaluating..." : "Submit Proposal for Evaluation"}
    </button>
  );
}

function fieldErrorClass(
  errors: ProposalFormErrors,
  field: keyof ProposalFormErrors
): string {
  const fieldErrors = errors[field];
  return fieldErrors && fieldErrors.length > 0
    ? "border-red-500 focus:ring-red-500"
    : "border-gray-300 focus:ring-indigo-500";
}

function FieldErrors({
  errors,
  field,
}: {
  errors: ProposalFormErrors;
  field: keyof ProposalFormErrors;
}) {
  const fieldErrors = errors[field];
  if (!fieldErrors || fieldErrors.length === 0) return null;
  return (
    <div className="mt-1">
      {fieldErrors.map((err) => (
        <p key={err} className="text-sm text-red-600">
          {err}
        </p>
      ))}
    </div>
  );
}

function TextareaWithCounter({
  id,
  name,
  label,
  placeholder,
  maxLength,
  rows,
  errors,
  field,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  maxLength: number;
  rows: number;
  errors: ProposalFormErrors;
  field: keyof ProposalFormErrors;
}) {
  const [length, setLength] = useState(0);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => setLength(e.target.value.length)}
        className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, field)}`}
        placeholder={placeholder}
      />
      <div className="mt-1 flex justify-between">
        <FieldErrors errors={errors} field={field} />
        <span className="text-xs text-gray-400">
          {length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

export function ProposalSubmitForm() {
  const [state, formAction] = useActionState(submitProposal, initialState);
  const [clientErrors, setClientErrors] = useState<ProposalFormErrors>({});
  const [teamMembers, setTeamMembers] = useState<ReadonlyArray<TeamMember>>([
    { name: "", role: "" },
  ]);
  const [links, setLinks] = useState<ReadonlyArray<string>>([]);

  const errors: ProposalFormErrors = state.errors ?? clientErrors;

  const addTeamMember = useCallback(() => {
    setTeamMembers((prev) => [...prev, { name: "", role: "" }]);
  }, []);

  const removeTeamMember = useCallback((index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTeamMember = useCallback(
    (index: number, field: keyof TeamMember, value: string) => {
      setTeamMembers((prev) =>
        prev.map((member, i) =>
          i === index ? { ...member, [field]: value } : member
        )
      );
    },
    []
  );

  const addLink = useCallback(() => {
    setLinks((prev) => [...prev, ""]);
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateLink = useCallback((index: number, value: string) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? value : link)));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const rawData = {
        title: formData.get("title"),
        description: formData.get("description"),
        problemStatement: formData.get("problemStatement"),
        proposedSolution: formData.get("proposedSolution"),
        teamMembers: teamMembers.filter(
          (m) => m.name.length > 0 || m.role.length > 0
        ),
        budgetAmount: parseFloat(String(formData.get("budgetAmount") ?? "")),
        budgetBreakdown: formData.get("budgetBreakdown"),
        timeline: formData.get("timeline"),
        category: formData.get("category"),
        residencyDuration: formData.get("residencyDuration"),
        demoDayDeliverable: formData.get("demoDayDeliverable"),
        communityContribution: formData.get("communityContribution"),
        priorIpeParticipation:
          formData.get("priorIpeParticipation") === "true",
        links: links.filter((l) => l.length > 0),
      };

      const parsed = proposalFormSchema.safeParse(rawData);

      if (!parsed.success) {
        e.preventDefault();
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const newErrors: ProposalFormErrors = {};

        for (const [key, value] of Object.entries(fieldErrors)) {
          if (value && value.length > 0) {
            const typedKey = key as keyof ProposalFormErrors;
            newErrors[typedKey] = value;
          }
        }

        setClientErrors(newErrors);
        return;
      }

      setClientErrors({});
    },
    [teamMembers, links]
  );

  if (state.success && state.proposalId) {
    return (
      <div className="rounded-md bg-green-50 p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-green-800">
              Proposal Submitted Successfully
            </h3>
            <p className="mt-2 text-sm text-green-700">
              Your proposal has been submitted and evaluated by our AI judges.
            </p>
            <p className="mt-1 text-sm text-green-700">
              Proposal ID:{" "}
              <code className="font-mono text-xs">{state.proposalId}</code>
            </p>
            <div className="mt-4">
              <Link
                href={state.detailUrl ?? "#"}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                View Evaluation Results
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-8">
      {errors.server && errors.server.length > 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              {errors.server.map((err) => (
                <p key={err} className="text-sm text-red-700">
                  {err}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden fields for complex data */}
      <input
        type="hidden"
        name="teamMembers"
        value={JSON.stringify(
          teamMembers.filter((m) => m.name.length > 0 || m.role.length > 0)
        )}
      />
      <input
        type="hidden"
        name="links"
        value={JSON.stringify(links.filter((l) => l.length > 0))}
      />

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Proposal Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          maxLength={200}
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "title")}`}
          placeholder="Enter your proposal title"
        />
        <FieldErrors errors={errors} field="title" />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700"
        >
          Category
        </label>
        <select
          id="category"
          name="category"
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "category")}`}
        >
          <option value="">Select a category</option>
          {PROPOSAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] ?? cat}
            </option>
          ))}
        </select>
        <FieldErrors errors={errors} field="category" />
      </div>

      {/* Description */}
      <TextareaWithCounter
        id="description"
        name="description"
        label="Description"
        placeholder="Describe your proposal in detail (minimum 50 characters)"
        maxLength={DESCRIPTION_MAX}
        rows={6}
        errors={errors}
        field="description"
      />

      {/* Problem Statement */}
      <TextareaWithCounter
        id="problemStatement"
        name="problemStatement"
        label="Problem Statement"
        placeholder="What problem does this proposal address? (minimum 20 characters)"
        maxLength={PROBLEM_MAX}
        rows={4}
        errors={errors}
        field="problemStatement"
      />

      {/* Proposed Solution */}
      <TextareaWithCounter
        id="proposedSolution"
        name="proposedSolution"
        label="Proposed Solution"
        placeholder="How will you solve this problem? (minimum 20 characters)"
        maxLength={SOLUTION_MAX}
        rows={6}
        errors={errors}
        field="proposedSolution"
      />

      {/* Budget Amount */}
      <div>
        <label
          htmlFor="budgetAmount"
          className="block text-sm font-medium text-gray-700"
        >
          Budget Amount (USDC)
        </label>
        <input
          type="number"
          id="budgetAmount"
          name="budgetAmount"
          step="0.01"
          min="0"
          max="1000000"
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "budgetAmount")}`}
          placeholder="10000"
        />
        <FieldErrors errors={errors} field="budgetAmount" />
      </div>

      {/* Budget Breakdown */}
      <TextareaWithCounter
        id="budgetBreakdown"
        name="budgetBreakdown"
        label="Budget Breakdown"
        placeholder="Break down how the budget will be allocated across categories"
        maxLength={3000}
        rows={4}
        errors={errors}
        field="budgetBreakdown"
      />

      {/* Timeline */}
      <TextareaWithCounter
        id="timeline"
        name="timeline"
        label="Timeline"
        placeholder="Describe your project timeline and key milestones"
        maxLength={2000}
        rows={3}
        errors={errors}
        field="timeline"
      />

      {/* Residency Duration */}
      <div>
        <label
          htmlFor="residencyDuration"
          className="block text-sm font-medium text-gray-700"
        >
          IPE Village Residency Duration
        </label>
        <select
          id="residencyDuration"
          name="residencyDuration"
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "residencyDuration")}`}
        >
          <option value="">Select duration</option>
          {RESIDENCY_DURATIONS.map((dur) => (
            <option key={dur} value={dur}>
              {DURATION_LABELS[dur] ?? dur}
            </option>
          ))}
        </select>
        <FieldErrors errors={errors} field="residencyDuration" />
      </div>

      {/* Demo Day Deliverable */}
      <TextareaWithCounter
        id="demoDayDeliverable"
        name="demoDayDeliverable"
        label="Demo Day Deliverable"
        placeholder="What will you present at Demo Day?"
        maxLength={1000}
        rows={3}
        errors={errors}
        field="demoDayDeliverable"
      />

      {/* Community Contribution */}
      <TextareaWithCounter
        id="communityContribution"
        name="communityContribution"
        label="Community Contribution"
        placeholder="How will you contribute to the IPE Village community?"
        maxLength={1000}
        rows={3}
        errors={errors}
        field="communityContribution"
      />

      {/* Prior IPE Participation */}
      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="priorIpeParticipation"
            value="true"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-gray-700">
            I have previously participated in an IPE Village residency
          </span>
        </label>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Team Members
          </label>
          <button
            type="button"
            onClick={addTeamMember}
            disabled={teamMembers.length >= 20}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            + Add Member
          </button>
        </div>
        <FieldErrors errors={errors} field="teamMembers" />
        <div className="mt-2 space-y-4">
          {teamMembers.map((member, index) => (
            <div key={index} className="rounded-md border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  Member {index + 1}
                </span>
                {teamMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(index)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`team-name-${index}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id={`team-name-${index}`}
                    value={member.name}
                    onChange={(e) =>
                      updateTeamMember(index, "name", e.target.value)
                    }
                    maxLength={100}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Alice Smith"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`team-role-${index}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    Role
                  </label>
                  <input
                    type="text"
                    id={`team-role-${index}`}
                    value={member.role}
                    onChange={(e) =>
                      updateTeamMember(index, "role", e.target.value)
                    }
                    maxLength={100}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Lead Developer"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Links <span className="text-gray-400">(optional)</span>
          </label>
          <button
            type="button"
            onClick={addLink}
            disabled={links.length >= 10}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            + Add Link
          </button>
        </div>
        <FieldErrors errors={errors} field="links" />
        <div className="mt-2 space-y-3">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updateLink(index, e.target.value)}
                className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://github.com/your-project"
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
