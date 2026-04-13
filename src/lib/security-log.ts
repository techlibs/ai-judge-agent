type SecurityEvent =
  | { type: "rate_limited"; ip: string; endpoint: string; limit: string }
  | { type: "auth_failed"; ip: string; endpoint: string; reason: string }
  | { type: "score_anomaly"; proposalId: string; flags: string[] }
  | { type: "pii_detected"; proposalId: string; patterns: string[] }
  | { type: "injection_attempt"; proposalId: string; stripped: string[] }
  | { type: "external_data_injection"; source: string; patterns: string[] }
  | { type: "coherence_review_recommended"; proposalId: string; coherenceScore: number; flags: number };

export function logSecurityEvent(event: SecurityEvent): void {
  console.log(JSON.stringify({ ...event, timestamp: new Date().toISOString(), level: "SECURITY" }));
}
