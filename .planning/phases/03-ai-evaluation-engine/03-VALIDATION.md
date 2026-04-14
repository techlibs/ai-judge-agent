---
phase: 3
slug: ai-evaluation-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + ONNX Runtime validation |
| **Config file** | packages/ai-models/pytest.ini (Wave 0 creates) |
| **Quick run command** | `cd packages/ai-models && python -m pytest tests/ -x --tb=short` |
| **Full suite command** | `cd packages/ai-models && python -m pytest tests/ -v --tb=long` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/ai-models && python -m pytest tests/ -x --tb=short`
- **After every plan wave:** Run `cd packages/ai-models && python -m pytest tests/ -v --tb=long`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SECU-01 | — | N/A | unit | `python -m pytest tests/test_security_model.py` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SECU-02 | — | N/A | unit | `python -m pytest tests/test_security_features.py` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | SECU-03 | — | N/A | unit | `python -m pytest tests/test_severity_classification.py` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | SECU-04 | — | N/A | unit | `python -m pytest tests/test_security_report.py` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | FRAD-01 | — | N/A | unit | `python -m pytest tests/test_fraud_model.py` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | FRAD-02 | — | N/A | unit | `python -m pytest tests/test_plagiarism.py` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | FRAD-03 | — | N/A | unit | `python -m pytest tests/test_code_originality.py` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | FRAD-04 | — | N/A | unit | `python -m pytest tests/test_sybil_detection.py` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | IMPT-01 | — | N/A | unit | `python -m pytest tests/test_impact_model.py` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | IMPT-02 | — | N/A | unit | `python -m pytest tests/test_alignment_model.py` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | IMPT-03 | — | N/A | unit | `python -m pytest tests/test_pulse_integration.py` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ai-models/` — Python package directory structure
- [ ] `packages/ai-models/pytest.ini` — pytest configuration
- [ ] `packages/ai-models/requirements.txt` — PyTorch, EZKL, ONNX, sentence-transformers dependencies
- [ ] `packages/ai-models/tests/conftest.py` — shared fixtures (synthetic data generators, model factories)
- [ ] EZKL operator compatibility validation — minimal MLP export + compile test

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ONNX model visual inspection | All models | ONNX graph complexity review | Open exported .onnx in Netron, verify operator count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
