export { evaluateProposal } from "./agents/orchestrator.js";
export { evaluateSecurity } from "./agents/judges/security-judge.js";
export { evaluateImpact } from "./agents/judges/impact-judge.js";
export { evaluateAlignment } from "./agents/judges/alignment-judge.js";
export { identifyDisagreements, runDeliberation } from "./agents/presiding-judge.js";
export { classifyAndSelectCriteria } from "./criteria/selector.js";
export { CORE_CRITERIA, ADAPTIVE_CRITERIA } from "./criteria/registry.js";

// Adaptive judges (spawned based on proposal domain classification)
export { evaluateDefiRisk } from "./agents/judges/adaptive/defi-risk-judge.js";
export { evaluateGovernanceDesign } from "./agents/judges/adaptive/governance-design-judge.js";
export { evaluatePedagogy } from "./agents/judges/adaptive/pedagogy-judge.js";
export { evaluateHealthEthics } from "./agents/judges/adaptive/health-ethics-judge.js";
export { evaluateInfraReliability } from "./agents/judges/adaptive/infra-reliability-judge.js";
