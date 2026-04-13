# Data Model: Security Audit Regression Tests

**Feature**: 002-security-audit-tests | **Date**: 2026-04-13

## Entities

### Seed Data Addition: Corrupt JSON Proposal

This feature adds one new seed data entry to the existing `seedTestData()` function.

**Entity**: `proposals` table row

| Field | Value | Purpose |
|-------|-------|---------|
| `id` | `"prop-corrupt-json"` | Stable test identifier |
| `externalId` | `"ext-corrupt-json"` | Platform-side ID |
| `platformSource` | `"test-platform"` | Links to existing test platform |
| `fundingRoundId` | `"round-001"` | Existing funding round |
| `title` | `"Corrupt JSON Test Proposal"` | Descriptive title |
| `description` | `"Proposal with corrupt dimension score data for M-04 testing"` | |
| `status` | `"evaluated"` | Must have dimension scores |
| `overallScore` | `75` | Non-null to appear evaluated |
| `budgetAmount` | `10000` | Arbitrary |
| `budgetCurrency` | `"USD"` | Standard |
| `category` | `"infrastructure"` | Existing category |

**Entity**: `dimension_scores` table rows (4 rows for the corrupt proposal)

| Field | Value (corrupt row) | Value (normal rows) |
|-------|---------------------|---------------------|
| `proposalId` | `"prop-corrupt-json"` | `"prop-corrupt-json"` |
| `dimension` | `"technical_feasibility"` | `"impact_potential"`, `"cost_efficiency"`, `"team_capability"` |
| `score` | `80` | `70`, `75`, `80` |
| `weight` | `0.25` | `0.30`, `0.20`, `0.25` |
| `reasoning` | `"Test reasoning"` | `"Test reasoning"` |
| `rubricApplied` | `"not-valid-json{{"` | `'{"criteria": "test"}'` |
| `inputDataUsed` | `'{"test": true}'` | `'{"test": true}'` |

### Exported Constants

Add to `e2e/fixtures/seed-data.ts`:

```typescript
export const CORRUPT_JSON_PROPOSAL_ID = "prop-corrupt-json";
```

## Relationships

```
proposals (prop-corrupt-json)
  └── dimension_scores (4 rows)
       └── 1 row has corrupt rubricApplied JSON
```

No new tables, no schema changes, no migrations. The corrupt data is inserted via the existing `INSERT OR IGNORE` pattern in `seedTestData()`.

## Validation Rules

- The corrupt JSON value `"not-valid-json{{"` must NOT be valid JSON (verified: `JSON.parse` throws on this input)
- The proposal must have `status: "evaluated"` and `overallScore` set so the detail endpoint attempts to render dimension scores
- All other fields must be valid to ensure the 500 is caused by the corrupt JSON, not a missing field
