# Feature Specification: ARWF Judge System

**Feature Branch**: `001-arwf-judge-system`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "AI Judge System for Grant Proposal Evaluation (ARWF)"

## User Scenarios & Testing

### User Story 1 - Submit and Evaluate a Grant Proposal (Priority: P1)

A funding platform operator integrates with the ARWF system. When a grant applicant submits a proposal through the platform, the system automatically ingests the proposal data and triggers an evaluation. Four specialized Judge Agents independently score the proposal across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability. The system produces a weighted final score with structured justifications for each dimension, visible to all stakeholders.

**Why this priority**: This is the core value proposition — without automated evaluation, no other feature has meaning. It delivers the fundamental AI Judge capability.

**Independent Test**: Submit a sample grant proposal and verify that four dimension scores, justifications, and a weighted final score are produced within the expected timeframe.

**Acceptance Scenarios**:

1. **Given** a funding platform has registered an integration, **When** a grant proposal is submitted via webhook, **Then** the system ingests the proposal and queues it for evaluation within 30 seconds.
2. **Given** a proposal is queued for evaluation, **When** the four Judge Agents complete scoring, **Then** the system produces a final weighted score (0-10) using weights: Technical 25%, Impact 30%, Cost 20%, Team 25%.
3. **Given** a Judge Agent evaluates a dimension, **When** the scoring completes, **Then** a structured justification is stored containing: input data considered, rubric applied, dimension score (0-10), and reasoning chain.
4. **Given** a project has prior reputation history, **When** the final score is calculated, **Then** the reputation multiplier is applied: multiplier = 1 + (reputationIndex / 10000), capped at 1.05.
5. **Given** all scoring is complete, **When** a stakeholder views the proposal, **Then** they see the final score, all four dimension scores, and each justification.

---

### User Story 2 - View Proposals and Scores on Dashboard (Priority: P1)

Grant applicants, funding operators, and community reviewers visit ipe.city/grants to browse proposals, view evaluation scores, read AI-generated justifications, check fund release status, and see reputation badges. The dashboard provides transparency into every funding decision.

**Why this priority**: The dashboard is the primary user-facing surface. Without it, evaluations are invisible to stakeholders. Co-priority with US1 because evaluation without visibility delivers no value.

**Independent Test**: Navigate to ipe.city/grants and verify that proposals display with scores, justifications, fund status indicators, and reputation badges.

**Acceptance Scenarios**:

1. **Given** a user visits the grants dashboard, **When** the page loads, **Then** they see a list of proposals with summary scores, sorted by most recent.
2. **Given** a user selects a proposal, **When** the detail view opens, **Then** they see: final score, four dimension scores with justifications, milestone status, fund release percentage, and team reputation badge.
3. **Given** a proposal has been evaluated, **When** any stakeholder views the justification, **Then** the full reasoning chain for each dimension is readable and references specific proposal data points.
4. **Given** a funding round is active, **When** a user filters by round, **Then** only proposals from that round are displayed with aggregate statistics.

---

### User Story 3 - On-Chain Fund Release Based on Scores (Priority: P2)

After evaluation, the system submits scores to the on-chain MilestoneManager contract. The contract releases funds proportionally: projects scoring above the threshold receive funds at a ratio of score/1000. Unreleased funds flow to the MatchingPool, which distributes bonuses to top performers (score >= 9.0).

**Why this priority**: Fund release is the financial outcome that makes evaluations actionable. Depends on US1 (evaluation) being functional first.

**Independent Test**: After a proposal receives a score above threshold, verify that the on-chain MilestoneManager releases the correct fund percentage and unreleased funds appear in the MatchingPool.

**Acceptance Scenarios**:

1. **Given** a proposal scores above the release threshold, **When** the score is submitted on-chain, **Then** the MilestoneManager releases funds at releasePercentage = score / 1000.
2. **Given** a proposal scores below the release threshold, **When** the score is submitted on-chain, **Then** no funds are released and the full amount is forwarded to the MatchingPool.
3. **Given** the MatchingPool has accumulated unreleased funds, **When** a distribution cycle runs, **Then** bonuses are allocated to projects with scores >= 9.0, proportional to their score relative to the sum of all qualifying scores.
4. **Given** a new project is registered, **When** the system creates the project wallet, **Then** an identity is minted in the Identity Registry and linked to the project wallet.

---

### User Story 4 - Monitor Agent Continuous Tracking (Priority: P2)

After initial evaluation, Monitor Agents periodically check project progress by analyzing GitHub activity (commit frequency, issue velocity, releases), on-chain transactions from the project wallet, and social signals (announcements, community engagement). Each monitoring cycle produces an updated score that can trigger additional fund releases or flag underperformance.

**Why this priority**: Monitoring ensures ongoing accountability beyond initial evaluation. Depends on US1 and US3 being functional.

**Independent Test**: After a project receives initial funding, verify that a monitoring cycle runs on schedule, produces an updated score with justification, and the updated score triggers appropriate fund release adjustments.

**Acceptance Scenarios**:

1. **Given** a funded project exists, **When** a scheduled monitoring cycle triggers, **Then** the Monitor Agent collects metrics from GitHub, on-chain activity, and social channels.
2. **Given** a Monitor Agent has collected metrics, **When** the analysis completes, **Then** an updated score (0-10) with justification and risk flags is produced.
3. **Given** an updated monitoring score is produced, **When** the score is submitted on-chain, **Then** the MilestoneManager recalculates fund release for the current milestone.
4. **Given** a project shows declining metrics, **When** the monitoring score drops below the threshold, **Then** a risk flag is raised and visible on the dashboard.

---

### User Story 5 - Dispute Resolution (Priority: P3)

A grant applicant who disagrees with their evaluation score can initiate a dispute within a defined time window. The dispute is registered on-chain via the Validation Registry. Independent validators stake tokens, review evidence, and vote. The registry computes a verdict (uphold or overturn) and publishes a new score if overturned. Off-chain records are reconciled.

**Why this priority**: Dispute resolution is essential for fairness but is lower priority because the core system must function first. It serves as a safety valve for edge cases.

**Independent Test**: Submit a dispute for an evaluated proposal, have validators vote, and verify that the verdict updates the score and fund release calculations.

**Acceptance Scenarios**:

1. **Given** a project has been scored, **When** the applicant initiates a dispute within the allowed time window, **Then** the system registers the dispute on-chain with staked collateral and evidence URI.
2. **Given** a dispute is active, **When** validators review evidence and submit votes, **Then** the Validation Registry tallies votes and computes a verdict (uphold or overturn).
3. **Given** a dispute verdict is "overturn," **When** the new score is published, **Then** the off-chain records are updated (old score archived, new score inserted) and milestone fund releases are recalculated.
4. **Given** a dispute verdict is "uphold," **When** the dispute closes, **Then** the original score remains and the applicant's stake is distributed to validators.

---

### User Story 6 - Reputation Persistence and Portability (Priority: P3)

After each evaluation and monitoring cycle, the system writes reputation feedback to the on-chain Reputation Registry via the ReputationBridge. Reputation is tied to portable identities (ERC-8004) and persists across funding rounds and platforms. Projects with strong track records receive a reputation multiplier on future evaluations.

**Why this priority**: Reputation is a long-term value accumulator. It enhances the system over multiple rounds but is not required for a single-round MVP.

**Independent Test**: Complete an evaluation cycle for a project, verify reputation feedback is written on-chain, and confirm the reputation multiplier applies correctly in a subsequent evaluation.

**Acceptance Scenarios**:

1. **Given** a project completes an evaluation cycle, **When** the score is finalized, **Then** reputation feedback is posted to the Reputation Registry linked to the project's ERC-8004 identity.
2. **Given** a project has accumulated reputation, **When** a new proposal is submitted by the same identity, **Then** the reputation multiplier (1 + reputationIndex/10000, max 1.05) is applied to the final score.
3. **Given** a project's identity exists on one platform, **When** the same identity submits on a different integrated platform, **Then** the reputation history is recognized and the multiplier applies.

---

### Edge Cases

- What happens when a Judge Agent fails mid-evaluation (partial scores)?
  The system MUST retry the failed agent up to 3 times. If all retries fail, the evaluation is marked as incomplete and an operator is notified. Partial scores are not published.
- What happens when a proposal contains adversarial or manipulative content?
  LLM inputs MUST be sanitized. The system applies content filters and anomaly detection. Flagged proposals are queued for manual review before scores are published.
- What happens when the on-chain transaction to submit a score fails?
  The system MUST retry with exponential backoff (up to 5 attempts). Failed transactions are logged and an alert is raised. Scores remain in off-chain storage until confirmed on-chain.
- What happens when a dispute is initiated after the time window closes?
  The system MUST reject the dispute and return a clear error indicating the window has passed.
- What happens when no validators participate in a dispute?
  If no validators stake within the dispute period, the dispute expires and the original score is upheld by default.

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept grant proposals via webhook from registered funding platforms, ingesting proposal metadata, budget, team information, and category.
- **FR-002**: System MUST evaluate each proposal using four independent scoring dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%).
- **FR-003**: Each scoring dimension MUST produce a score from 0 to 10 and a structured justification containing the input data considered, rubric applied, and reasoning chain.
- **FR-004**: System MUST compute a weighted final score: S = 0.25 x Technical + 0.30 x Impact + 0.20 x Cost + 0.25 x Team.
- **FR-005**: System MUST apply a reputation multiplier for projects with prior history: multiplier = 1 + (reputationIndex / 10000), capped at maximum 1.05.
- **FR-006**: System MUST sanitize all inputs before evaluation: hash team member identifiers, obfuscate emails, replace sensitive URLs with placeholders.
- **FR-007**: System MUST display proposals, scores, justifications, fund status, and reputation badges on a public dashboard at ipe.city/grants.
- **FR-008**: System MUST submit finalized scores to the on-chain MilestoneManager for fund release calculation.
- **FR-009**: System MUST release funds proportionally when score meets threshold: releasePercentage = score / 1000.
- **FR-010**: System MUST forward unreleased funds to the MatchingPool and distribute bonuses to projects scoring >= 9.0.
- **FR-011**: System MUST deploy project wallets using account abstraction and mint identity records in the Identity Registry for each new project.
- **FR-012**: System MUST run Monitor Agent cycles on configurable schedules to track project progress via code activity, on-chain transactions, and social signals.
- **FR-013**: System MUST support dispute initiation within a defined time window, with on-chain staking, validator voting, and verdict publication.
- **FR-014**: System MUST write reputation feedback to the Reputation Registry after each evaluation and monitoring cycle.
- **FR-015**: System MUST persist all scoring metadata (inputs, outputs, justifications, timestamps) for audit purposes.
- **FR-016**: System MUST retry failed evaluations up to 3 times before marking as incomplete.
- **FR-017**: System MUST retry failed on-chain transactions with exponential backoff up to 5 attempts.

### Key Entities

- **Proposal**: A grant application submitted by a team, containing metadata, budget breakdown, technical description, team profile, and category. Linked to a funding platform and round.
- **Evaluation**: The complete scoring result for a proposal, containing four dimension scores, justifications, weighted final score, reputation multiplier applied, and timestamp. Linked to one proposal.
- **Judge Agent**: A specialized evaluator assigned to one scoring dimension. Produces a score (0-10) and structured justification per evaluation.
- **Monitor Agent**: A periodic evaluator that tracks funded project progress and produces updated scores with risk flags.
- **Project Wallet**: An on-chain account abstraction wallet deployed per project, linked to the project's identity. Receives and holds funds.
- **Milestone**: A funded project checkpoint with defined deliverables, time lock, and weight. Score submissions trigger proportional fund releases.
- **Reputation Record**: An on-chain feedback entry linked to a project's portable identity (ERC-8004). Accumulates across evaluation cycles and platforms.
- **Dispute**: A challenge to an evaluation score, registered on-chain with staked collateral, evidence URI, validator votes, and verdict.
- **Funding Round**: A time-bounded period during which proposals are accepted and evaluated. Contains configuration for scoring thresholds and matching pool parameters.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Proposals receive a complete evaluation (all four dimension scores + justifications) within 5 minutes of submission.
- **SC-002**: System processes at least 1,000 proposals per funding round without degradation in evaluation quality or timing.
- **SC-003**: 100% of published scores include structured justifications that reference specific proposal data points.
- **SC-004**: Fund release calculations match the defined formula (score / 1000) with zero discrepancy between off-chain scores and on-chain releases.
- **SC-005**: Dashboard loads proposal listings within 2 seconds and detail views within 3 seconds under normal traffic.
- **SC-006**: Monitor Agent cycles execute on schedule with less than 5 minutes deviation from configured frequency.
- **SC-007**: Dispute resolution completes within the defined time window, with verdicts accurately reflected in both on-chain and off-chain records.
- **SC-008**: Zero instances of team member PII appearing in stored evaluation records, justifications, or on-chain data.
- **SC-009**: Reputation multipliers are correctly applied in 100% of evaluations for projects with prior history.
- **SC-010**: 90% of funding platform operators report that evaluation justifications are clear and useful for decision-making.

## Assumptions

- Funding platforms (Gitcoin, Optimism RetroPGF) provide webhook integrations with structured proposal data including metadata, budget, team info, and category.
- The on-chain deployment targets an EVM-compatible chain that supports ERC-4337 (account abstraction) and has reasonable gas costs for frequent score submissions.
- Judge Agents use hosted LLM providers with structured output capabilities and sufficient rate limits for batch evaluation.
- The dispute time window is configurable per funding round (default: 7 days after score publication).
- Community validators are incentivized through the staking/reward mechanism and a sufficient validator pool exists for each round.
- The MatchingPool bonus distribution runs once per funding round at round close, not continuously.
- Monitor Agent scheduling is configurable per project type: daily for software projects, weekly for research projects.
- Standard OAuth2 authentication is used for platform operator access; the public dashboard is accessible without authentication.
- Mobile support is out of scope for v1; the dashboard targets desktop and tablet browsers.
