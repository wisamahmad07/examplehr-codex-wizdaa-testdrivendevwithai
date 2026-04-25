# Coverage And Test Evidence

Captured from `npm run test:cov -- --runInBand` on April 24, 2026.

## Coverage summary

- Statements: `55.14%`
- Branches: `51.72%`
- Functions: `51.72%`
- Lines: `53.44%`

The repository enforces a baseline global threshold of `50%` across all four metrics. The threshold is intentionally modest because the most valuable regression protection for this problem lives in end-to-end scenario tests that validate cross-system behavior.

## Scenario coverage

The higher-signal proof is the scenario suite:

- Local snapshot plus holds gives instant employee feedback.
- Approval revalidates against HCM before finalization.
- External HCM decreases reject approval safely.
- External HCM increases can rescue stale local rejections after a refresh.
- Duplicate pending requests do not overbook the local estimate.
- Ambiguous HCM write outcomes move into reconciliation, not blind success/failure.
- Duplicate batch ids are ignored.
- Stale batch rows do not overwrite fresher data.

## Commands run

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:cov -- --runInBand
```
