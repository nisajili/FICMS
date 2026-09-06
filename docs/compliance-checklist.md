# FICMS — Compliance Review Checklist

This project provides **technical safeguards** aligned with HIPAA-style
controls and GDPR principles. It does **not** claim certification. Formal
legal/compliance review is required before production use involving real
patient data.

## Privacy & data protection (GDPR-style)
- [ ] Document a lawful basis for processing health data.
- [ ] Implement data-subject rights (access, rectification, erasure,
      portability, objection).
- [ ] Maintain a Records of Processing Activities (ROPA).
- [ ] Conduct a Data Protection Impact Assessment (DPIA).
- [ ] Data-retention policy configured per org.
- [ ] Data-export for a single org available (supported).

## Confidentiality & integrity (HIPAA-style)
- [ ] Access controls (RBAC/ABAC) enforced — implemented.
- [ ] Audit logs of PHI access — implemented (immutable `AuditEvent`).
- [ ] Encryption in transit (TLS) and at rest.
- [ ] Minimum necessary access; field-level restrictions.
- [ ] Break-glass emergency access logged with reason and time limit.
- [ ] Integrity: signed records are versioned, never silently overwritten.
- [ ] Sanitization/disposal procedures for media and backups.

## Security management
- [ ] Risk assessment and risk-management program.
- [ ] Incident response and breach-notification procedure.
- [ ] Vulnerability scanning in CI; prompt patching.
- [ ] Business continuity & disaster recovery tested (see `backup-restore.md`).
- [ ] Staff training on privacy/security.
- [ ] Business associate agreements for hosted processor.

## Clinical safety
- [ ] Clinical protocols are configurable per clinic; the system does not make
      autonomous medical decisions.
- [ ] Double-witness verification for identity-sensitive lab events.
- [ ] Traceability of samples, embryos, cryostorage items.
- [ ] Result release requires verified status; critical-result alerts.
- [ ] Denominators + definitions shown for clinical statistics.

## Not in scope / to arrange
- Regulatory certification (ISO, HIPAA attestation, GDPR) requires an
  independent auditor and is **not** claimed here.
- Real SMS/payment/insurance/lab equipment adapters need external setup and
  their own contractual/compliance review.
- If used for assisted reproduction where local law mandates specific
  licensing/registration, that must be obtained by the operator.
