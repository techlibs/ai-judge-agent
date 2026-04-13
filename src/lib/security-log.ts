type SecurityEventType =
  | "rate_limited"
  | "auth_failed"
  | "score_anomaly"
  | "pii_detected"
  | "injection_attempt"
  | "webhook_signature_invalid"
  | "dispute_opened"
  | "dispute_resolved";

interface SecurityEvent {
  readonly type: SecurityEventType;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
  readonly requestId?: string;
  readonly ip?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const entry = {
    level: "SECURITY",
    timestamp: new Date().toISOString(),
    type: event.type,
    message: event.message,
    requestId: event.requestId,
    ip: event.ip,
    ...event.metadata,
  };

  console.log(JSON.stringify(entry));
}
