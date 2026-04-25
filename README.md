# ExampleHR Time-Off Microservice

NestJS + SQLite microservice for managing time-off requests while treating the HCM as the authoritative balance system.

## What is in the repo

- Technical requirements document: `docs/TRD.md`
- Coverage and scenario summary: `docs/COVERAGE.md`
- Application code: `src/`
- Mock HCM server used by e2e tests: `test/support/mock-hcm-server.ts`

## Core design

- ExampleHR keeps a local balance snapshot for fast reads.
- Pending requests act as local holds so employees get immediate feedback.
- HCM remains the source of truth for final approval.
- Approval writes to HCM with an idempotency key.
- Transport-ambiguous writes move into `REQUIRES_RECONCILIATION` instead of guessing.
- Batch sync updates the local snapshot and ignores stale or duplicate deliveries.

## Main endpoints

- `GET /health`
- `GET /balances?employeeId=...&locationId=...&refresh=true|false`
- `POST /hcm-sync/batches`
- `POST /time-off-requests`
- `GET /time-off-requests`
- `GET /time-off-requests/:id`
- `POST /time-off-requests/:id/approve`
- `POST /time-off-requests/:id/reject`
- `POST /time-off-requests/:id/cancel`
- `POST /time-off-requests/:id/reconcile`

## Run locally

```bash
npm install
(Do not do npm audit fix even if come)
npm run start:dev
```

Useful environment variables:

- `PORT` default: `3000`
- `DATABASE_PATH` default: `data/timeoff.sqlite`
- `HCM_BASE_URL` default: `http://127.0.0.1:4010`

## Test commands

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:cov
```
