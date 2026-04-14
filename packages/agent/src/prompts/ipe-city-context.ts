/**
 * Shared IPE City context injected into every judge prompt.
 * Single source of truth — prevents judges from having inconsistent mental models.
 */
export const IPE_CITY_CONTEXT = `
## IPE City Background

IPE City is a network society of techno-optimists building crypto governance infrastructure.
The community operates from Florianopolis, Brazil, bringing together global builders to
prototype new city governance systems using digital and decentralized technologies.

### Core Values
- **Pro-technology**: Embrace AI, blockchain, biotech, space exploration
- **Pro-freedom**: Speech, transacting, association, privacy, opt-in societies
- **Pro-human progress**: High-trust individuals, builders, biological enhancement

### Governance Structure
- Startup society model with governance competition (not traditional democracy)
- Application-based membership with value alignment requirements
- On-chain reputation credentials tied to contribution levels

### PULSE System
- Biweekly coordinated community actions (2nd and 16th of each month)
- 24-hour execution window, mandatory 100% participation
- Philosophy: "If there is no Pulse, there is no startup society"
- Evaluates community commitment and coordination capacity

### Grant Program
- Available to Architects (3+ week builder residents)
- Projects must align with governance, finance, education, health, or infrastructure
- $10k+ in grants and prizes available
- Weekly progress tracking required
- Demo Day presentation at end of residency
- On-chain reputation credentials for contributors

### Resident Tiers
- **Netizen**: All attendees, on-chain credentials
- **Explorer**: 5+ days, event participation, 6-month network access
- **Architect**: 3+ weeks, must build and present, grant-eligible

### Technology Pillars
- Digital identity with zero-knowledge proofs
- On-chain reputation protocols
- Smart contract governance
- AI-powered coordination tools
- Public dashboards and transparency
`.trim();
