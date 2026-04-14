import type { Proposal } from "@ipe-city/common";

export const DEFI_GOVERNANCE_DASHBOARD: Proposal = {
  proposalId: "test-defi-governance-001",
  submitter: "0x1234567890abcdef1234567890abcdef12345678",
  title: "DeFi Governance Dashboard for IPE City",
  summary:
    "A transparent, on-chain governance dashboard that integrates with IPE City's PULSE system to enable coordinated community voting on treasury allocation, grant distribution, and protocol upgrades. Built with Solana and Base for cross-chain governance.",
  content: `
# DeFi Governance Dashboard for IPE City

## Problem Statement
IPE City currently lacks a unified interface for community governance decisions.
Treasury allocation, grant distribution, and protocol upgrades are discussed
informally without transparent on-chain voting. This creates opacity and reduces
community trust in decision-making processes.

## Proposed Solution
We propose building a cross-chain governance dashboard that:
1. Enables on-chain voting for treasury allocation on both Solana and Base
2. Integrates with the PULSE biweekly system for coordinated governance actions
3. Provides real-time transparency into proposal status, voting power distribution, and execution

## Technical Architecture
- **Frontend**: Next.js 16 with shadcn/ui for the dashboard interface
- **Smart Contracts**: Solidity (Base) and Anchor (Solana) for on-chain voting
- **Cross-chain**: Wormhole messaging for vote synchronization
- **Identity**: Integration with IPE City's on-chain reputation credentials
- **Data**: On-chain event indexing for transparent audit trails

### Security Measures
- Time-locked execution (48h delay after vote passes)
- Multi-sig requirement for treasury movements over $10k
- Rate limiting on vote submission to prevent spam
- ZK proof of reputation score for Sybil-resistant voting
- All smart contracts will be audited before mainnet deployment

### Privacy Considerations
- Vote content is public (transparent governance)
- Voter identity linked to on-chain reputation (pseudonymous)
- No PII stored — only wallet addresses and on-chain credentials
- LGPD compliant: no personal data processing beyond public blockchain records

## Impact Metrics
- **KPI 1**: 80% of Architects participate in at least one governance vote within 30 days
- **KPI 2**: Average vote turnaround time under 72 hours
- **KPI 3**: 100% of treasury movements executed through on-chain governance by month 3
- **KPI 4**: Community satisfaction score above 4/5 in monthly surveys

## Timeline
- Week 1-2: Smart contract development and testing
- Week 3: Frontend dashboard development
- Week 4: PULSE integration and cross-chain bridge
- Week 5: Security audit and community testing
- Week 6: Mainnet deployment and Demo Day presentation

## Budget
- Smart contract development: $3,000
- Frontend development: $2,000
- Security audit: $2,500
- Cross-chain infrastructure: $1,500
- Total: $9,000

## Team
- Lead developer: 5 years of Solidity/Anchor experience
- Frontend developer: 3 years of Next.js, previously built governance UIs
- Security reviewer: Certified smart contract auditor

## PULSE Integration
The dashboard will include a "Governance Pulse" feature where the biweekly PULSE
action becomes a community vote on the most urgent governance proposal. This ties
individual participation to collective decision-making, reinforcing the startup society model.
`.trim(),
  domain: "Governance",
  requestedAmount: 9000,
  submittedAt: Math.floor(Date.now() / 1000),
  status: "Submitted",
};
