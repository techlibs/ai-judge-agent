# Data Model: Proposal Submission Form

## Entities

### ProposalSubmission (form input)

The raw form data before processing. Maps directly to form fields.

| Field | Type | Constraints | Maps to DB column |
|-------|------|------------|-------------------|
| title | string | 1-200 chars, required | proposals.title |
| description | string | 50-10000 chars, required | proposals.description |
| category | enum | infrastructure, education, community, research, governance | proposals.category |
| budgetAmount | number | > 0, <= 100,000,000, required | proposals.budgetAmount |
| budgetCurrency | string | USD or ETH, required | proposals.budgetCurrency |
| technicalDescription | string | 50-10000 chars, required | proposals.technicalDescription |
| teamMembers | array | 1-20 items, each has role (1-100 chars) + experience (1-500 chars) | hashed into proposals.teamProfileHash |
| budgetBreakdown | array | 0-20 items, each has category + amount + description | passed to IPFS content |

### Derived Fields (computed on server)

| Field | Derivation |
|-------|-----------|
| id | `computeProposalId()` from content hash |
| externalId | Same as id (no external platform) |
| fundingRoundId | Fixed: `"open-submissions"` |
| platformSource | Fixed: `"web-form"` |
| teamProfileHash | SHA256 of sorted `role:experience` pairs |
| teamSize | `teamMembers.length` |
| proposalContentCid | From IPFS pinning |
| status | Fixed: `"pending"` |
| submittedAt | Current ISO timestamp |

## State Transitions

```
[Form Submit] → pending → [AI Evaluation] → evaluated → [Funding Decision] → funded
                                                      → [Dispute Filed] → disputed
```

The form only creates proposals in `pending` state. All subsequent transitions are handled by existing pipelines.

## Validation Schema

Shared Zod schema used by both client and server:

```
ProposalFormSchema:
  title: string, min 1, max 200, trimmed
  description: string, min 50, max 10000, trimmed
  category: enum [infrastructure, education, community, research, governance]
  budgetAmount: number, positive, max 100000000
  budgetCurrency: enum [USD, ETH]
  technicalDescription: string, min 50, max 10000, trimmed
  teamMembers: array, min 1, max 20
    role: string, min 1, max 100, trimmed
    experience: string, min 1, max 500, trimmed
  budgetBreakdown: array, optional, max 20
    category: string, min 1, max 100
    amount: number, positive, max 100000000
    description: string, min 1, max 500
```
