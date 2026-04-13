# Contract: Proposal Submission API

## Server Action: submitProposal

**Trigger**: Form submission from /grants/submit
**Input**: ProposalFormSchema (Zod-validated form data)
**Output**: `{ success: true, proposalId: string, detailUrl: string }` or `{ success: false, errors: FieldErrors }`

### Happy Path

1. Validate form data against ProposalFormSchema (server-side)
2. Rate-limit by IP (existing Upstash limiter)
3. Sanitize text fields (existing sanitization pipeline)
4. Hash team profile (SHA256 of sorted role:experience pairs)
5. Pin proposal content to IPFS via Pinata
6. Insert proposal into cache DB with status "pending"
7. Trigger AI evaluation via orchestrateEvaluation()
8. Return success with proposal ID and detail URL

### Error Cases

| Error | HTTP-equivalent | User Message |
|-------|----------------|-------------|
| Validation failure | 400 | Inline field errors |
| Rate limit exceeded | 429 | "Too many submissions. Please wait and try again." |
| IPFS pinning failed | 502 | "Failed to store proposal. Please try again." |
| Database error | 500 | "Server error. Please try again later." |
| PII detected after sanitization | 400 | "Submission contains personal information that cannot be processed. Please remove email addresses, phone numbers, or personal IDs." |

### Rate Limiting

- 5 submissions per IP per hour
- Uses existing Upstash Redis rate limiter
