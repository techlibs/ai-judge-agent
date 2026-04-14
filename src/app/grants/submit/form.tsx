"use client";

import { useActionState, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { submitProposal } from "./actions";
import type { ActionState } from "./actions";
import { proposalFormSchema } from "./schema";
import type { ProposalFormErrors } from "./schema";

const CATEGORIES = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "education", label: "Education" },
  { value: "community", label: "Community" },
  { value: "research", label: "Research" },
  { value: "governance", label: "Governance" },
] as const;

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "ETH", label: "ETH" },
] as const;

const DESCRIPTION_MAX = 10_000;
const TECHNICAL_DESCRIPTION_MAX = 10_000;

interface TeamMember {
  role: string;
  experience: string;
}

interface BudgetBreakdownItem {
  category: string;
  amount: string;
  description: string;
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
      {pending ? "Submitting..." : "Submit Proposal for Evaluation"}
    </button>
  );
}

function fieldErrorClass(errors: ProposalFormErrors, field: keyof ProposalFormErrors): string {
  return errors[field] && errors[field].length > 0
    ? "border-red-500 focus:ring-red-500"
    : "border-gray-300 focus:ring-indigo-500";
}

function FieldErrors({ errors, field }: { errors: ProposalFormErrors; field: keyof ProposalFormErrors }) {
  const fieldErrors = errors[field];
  if (!fieldErrors || fieldErrors.length === 0) return null;
  return (
    <div className="mt-1">
      {fieldErrors.map((err) => (
        <p key={err} className="text-sm text-red-600">{err}</p>
      ))}
    </div>
  );
}

export function ProposalSubmitForm() {
  const [state, formAction] = useActionState(submitProposal, initialState);
  const [clientErrors, setClientErrors] = useState<ProposalFormErrors>({});
  const [teamMembers, setTeamMembers] = useState<ReadonlyArray<TeamMember>>([
    { role: "", experience: "" },
  ]);
  const [budgetBreakdown, setBudgetBreakdown] = useState<ReadonlyArray<BudgetBreakdownItem>>([]);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [technicalDescriptionLength, setTechnicalDescriptionLength] = useState(0);

  const errors: ProposalFormErrors = state.errors ?? clientErrors;

  const addTeamMember = useCallback(() => {
    setTeamMembers((prev) => [...prev, { role: "", experience: "" }]);
  }, []);

  const removeTeamMember = useCallback((index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTeamMember = useCallback((index: number, field: keyof TeamMember, value: string) => {
    setTeamMembers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, [field]: value } : member))
    );
  }, []);

  const addBudgetItem = useCallback(() => {
    setBudgetBreakdown((prev) => [...prev, { category: "", amount: "", description: "" }]);
  }, []);

  const removeBudgetItem = useCallback((index: number) => {
    setBudgetBreakdown((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateBudgetItem = useCallback((index: number, field: keyof BudgetBreakdownItem, value: string) => {
    setBudgetBreakdown((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const rawData = {
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        budgetAmount: parseFloat(String(formData.get("budgetAmount") ?? "")),
        budgetCurrency: formData.get("budgetCurrency"),
        technicalDescription: formData.get("technicalDescription"),
        teamMembers: teamMembers.filter((m) => m.role.length > 0 || m.experience.length > 0),
        budgetBreakdown: budgetBreakdown
          .filter((item) => item.category.length > 0)
          .map((item) => ({
            ...item,
            amount: parseFloat(item.amount) || 0,
          })),
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
    [teamMembers, budgetBreakdown]
  );

  if (state.success && state.proposalId) {
    return (
      <div className="rounded-md bg-green-50 p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-green-800">Proposal Submitted Successfully</h3>
            <p className="mt-2 text-sm text-green-700">
              Your proposal has been submitted and is being evaluated by our AI judges.
            </p>
            <p className="mt-1 text-sm text-green-700">
              Proposal ID: <code className="font-mono text-xs">{state.proposalId}</code>
            </p>
            <div className="mt-4">
              <Link
                href={state.detailUrl ?? "#"}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                View Proposal
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
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              {errors.server.map((err) => (
                <p key={err} className="text-sm text-red-700">{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden fields for complex data */}
      <input
        type="hidden"
        name="teamMembers"
        value={JSON.stringify(teamMembers.filter((m) => m.role.length > 0 || m.experience.length > 0))}
      />
      <input
        type="hidden"
        name="budgetBreakdown"
        value={JSON.stringify(
          budgetBreakdown
            .filter((item) => item.category.length > 0)
            .map((item) => ({
              ...item,
              amount: parseFloat(item.amount) || 0,
            }))
        )}
      />

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
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
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "category")}`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <FieldErrors errors={errors} field="category" />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => setDescriptionLength(e.target.value.length)}
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "description")}`}
          placeholder="Describe your proposal in detail (minimum 50 characters)"
        />
        <div className="mt-1 flex justify-between">
          <FieldErrors errors={errors} field="description" />
          <span className="text-xs text-gray-400">
            {descriptionLength}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Technical Description */}
      <div>
        <label htmlFor="technicalDescription" className="block text-sm font-medium text-gray-700">
          Technical Description
        </label>
        <textarea
          id="technicalDescription"
          name="technicalDescription"
          rows={6}
          maxLength={TECHNICAL_DESCRIPTION_MAX}
          onChange={(e) => setTechnicalDescriptionLength(e.target.value.length)}
          className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "technicalDescription")}`}
          placeholder="Describe the technical approach (minimum 50 characters)"
        />
        <div className="mt-1 flex justify-between">
          <FieldErrors errors={errors} field="technicalDescription" />
          <span className="text-xs text-gray-400">
            {technicalDescriptionLength}/{TECHNICAL_DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700">
            Budget Amount
          </label>
          <input
            type="number"
            id="budgetAmount"
            name="budgetAmount"
            step="0.01"
            min="0"
            defaultValue={10000}
            className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "budgetAmount")}`}
            placeholder="10000"
          />
          <FieldErrors errors={errors} field="budgetAmount" />
        </div>
        <div>
          <label htmlFor="budgetCurrency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select
            id="budgetCurrency"
            name="budgetCurrency"
            className={`mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${fieldErrorClass(errors, "budgetCurrency")}`}
          >
            <option value="">Select currency</option>
            {CURRENCIES.map((cur) => (
              <option key={cur.value} value={cur.value}>
                {cur.label}
              </option>
            ))}
          </select>
          <FieldErrors errors={errors} field="budgetCurrency" />
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Team Members</label>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">Member {index + 1}</span>
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
                  <label htmlFor={`team-role-${index}`} className="block text-xs font-medium text-gray-600">
                    Role
                  </label>
                  <input
                    type="text"
                    id={`team-role-${index}`}
                    value={member.role}
                    onChange={(e) => updateTeamMember(index, "role", e.target.value)}
                    maxLength={100}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Lead Developer"
                  />
                </div>
                <div>
                  <label htmlFor={`team-experience-${index}`} className="block text-xs font-medium text-gray-600">
                    Experience
                  </label>
                  <input
                    type="text"
                    id={`team-experience-${index}`}
                    value={member.experience}
                    onChange={(e) => updateTeamMember(index, "experience", e.target.value)}
                    maxLength={500}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., 5 years in Solidity"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Breakdown (Optional) */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Budget Breakdown <span className="text-gray-400">(optional)</span>
          </label>
          <button
            type="button"
            onClick={addBudgetItem}
            disabled={budgetBreakdown.length >= 20}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            + Add Item
          </button>
        </div>
        <div className="mt-2 space-y-4">
          {budgetBreakdown.map((item, index) => (
            <div key={index} className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeBudgetItem(index)}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor={`budget-cat-${index}`} className="block text-xs font-medium text-gray-600">
                    Category
                  </label>
                  <input
                    type="text"
                    id={`budget-cat-${index}`}
                    value={item.category}
                    onChange={(e) => updateBudgetItem(index, "category", e.target.value)}
                    maxLength={100}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Development"
                  />
                </div>
                <div>
                  <label htmlFor={`budget-amount-${index}`} className="block text-xs font-medium text-gray-600">
                    Amount
                  </label>
                  <input
                    type="number"
                    id={`budget-amount-${index}`}
                    value={item.amount}
                    onChange={(e) => updateBudgetItem(index, "amount", e.target.value)}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label htmlFor={`budget-desc-${index}`} className="block text-xs font-medium text-gray-600">
                    Description
                  </label>
                  <input
                    type="text"
                    id={`budget-desc-${index}`}
                    value={item.description}
                    onChange={(e) => updateBudgetItem(index, "description", e.target.value)}
                    maxLength={500}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="What this covers"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
