type SecurityEventType =
  | "rate_limited"
  | "auth_failed"
  | "score_anomaly"
  | "pii_detected"
  | "injection_attempt"
  | "external_data_injection"
  | "coherence_review_recommended"
  | "webhook_signature_invalid"
  | "dispute_opened"
  | "dispute_resolved";

interface SecurityEvent {
  readonly type: SecurityEventType;
  readonly [key: string]: unknown;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const entry = {
    level: "SECURITY",
    timestamp: new Date().toISOString(),
    ...event,
  };

  console.log(JSON.stringify(entry));
}
