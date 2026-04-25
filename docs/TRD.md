# Technical Requirements Document

## 1. Problem Statement

ExampleHR owns the employee-facing time-off workflow, but the HCM remains the source of truth for employment balances. The service must let employees and managers move quickly without allowing ExampleHR and the HCM to drift silently apart.

The hard part is not the happy path. The hard part is handling:

- balance changes that happen outside ExampleHR
- stale local reads
- race conditions between pending requests
- ambiguous write outcomes when HCM times out after a booking call
- duplicate deliveries and retries

## 2. Goals

- Give employees fast balance feedback when creating a request.
- Give managers an approval flow that revalidates with the HCM.
- Keep a usable local balance view without making ExampleHR the source of truth.
- Be defensive when the HCM misses a validation or responds ambiguously.
- Make failure states explicit and recoverable.
- Provide a test suite that focuses on failure-mode coverage, not just CRUD.

## 3. Non-Goals

- multi-step accrual policy calculation inside ExampleHR
- PTO calendar overlap rules
- partial-day scheduling beyond decimal day quantities
- refunding already approved requests back into the HCM
- production-ready distributed locking and job scheduling

## 4. Key Assumptions

- Balances are per employee per location.
- HCM exposes:
  - realtime balance reads
  - realtime booking writes
  - batch corpus export/delivery
- ExampleHR can rely on HCM for final balance authority, but not for perfect validation or perfect network behavior.
- This take-home is a single NestJS service backed by SQLite.

## 5. Architecture Summary

The service uses a hybrid integrity model:

- `balance_snapshots` stores the latest known HCM balance per employee/location.
- `time_off_requests` stores workflow state and also acts as the local hold ledger.
- `hcm_commands` stores outbound booking intent, status, attempt metadata, and the stable idempotency key.
- `sync_batches` stores processed batch ids so duplicate deliveries are harmless.

Decision logic:

- Employee create flow uses the local snapshot plus active holds for instant feedback.
- If the local estimate says "insufficient", the service refreshes from HCM once before rejecting. This avoids false negatives when HCM granted a bonus outside ExampleHR.
- Manager approval always calls HCM before finalizing.
- Transport-ambiguous booking outcomes become `REQUIRES_RECONCILIATION`.
- Reconciliation replays the same HCM booking request with the same idempotency key.

## 6. Why These Choices

### REST over GraphQL

The system is command-heavy and state-transition-heavy. Explicit endpoints like `POST /time-off-requests/:id/approve` are easier to make idempotent, audit, and test than a mutation-based GraphQL API for this take-home.

### TypeORM + SQLite

SQLite keeps the repo runnable with almost no setup. TypeORM integrates directly with NestJS and keeps the implementation short enough to spend time on failure handling and tests rather than infrastructure wiring.

### Local snapshot + local holds + HCM final authority

Three alternatives were considered:

1. HCM-only reads with no local snapshot.
   This guarantees freshness but adds latency to every user interaction and weakens resilience during transient HCM issues.
2. Local balance as the source of truth.
   This conflicts with the problem statement and creates drift risk when balances change elsewhere.
3. Hybrid model.
   This gives fast reads, defensive local checks, and final HCM authority on approval.

The implementation chooses the hybrid model.

### Booking at approval time, not at request creation

Booking at request creation would make pending requests authoritative in HCM even before manager approval. That creates awkward reversal semantics and noisy write traffic. Booking at approval time keeps HCM aligned with business approval and lets pending requests stay as local holds only.

### Request row as the hold

Instead of a separate holds table, pending and ambiguous request states are treated as active holds:

- `PENDING_APPROVAL`
- `APPROVAL_IN_PROGRESS`
- `REQUIRES_RECONCILIATION`

This keeps the data model smaller and makes hold math inspectable directly from request records.

## 7. Domain Model

### Balance snapshot

- `employeeId`
- `locationId`
- `balanceUnits`
- `sourceType` (`REALTIME` or `BATCH`)
- `sourceUpdatedAt`
- `updatedAt`

### Time-off request

- `employeeId`
- `locationId`
- `amountUnits`
- `status`
- optional reason and actor metadata
- timestamps for approval, rejection, cancellation, reconciliation-needed
- optional `externalBookingId`

### HCM command

- `requestId`
- `commandType`
- `status`
- stable `idempotencyKey`
- `attemptCount`
- last error metadata
- timestamps

### Sync batch

- `batchId`
- `generatedAt`
- `receivedAt`
- `appliedRows`
- `skippedRows`

## 8. State Machine

Request states:

- `PENDING_APPROVAL`
- `APPROVAL_IN_PROGRESS`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `REQUIRES_RECONCILIATION`

Allowed transitions:

- create -> `PENDING_APPROVAL`
- approve start -> `APPROVAL_IN_PROGRESS`
- approval success -> `APPROVED`
- approval validation failure -> `REJECTED`
- approval transport ambiguity -> `REQUIRES_RECONCILIATION`
- reconcile success -> `APPROVED`
- reconcile validation failure -> `REJECTED`
- reject from pending -> `REJECTED`
- cancel from pending -> `CANCELLED`

Explicitly disallowed:

- approving a cancelled or rejected request
- cancelling an already approved request
- silently guessing approval outcome after HCM timeout

## 9. Balance Rules

Balances are stored as scaled integer units internally to avoid floating-point drift.

Formula:

`estimated_available = latest_snapshot - active_holds`

Rules:

- active holds include pending, in-progress, and reconciliation-needed requests
- local estimated insufficiency triggers one realtime refresh before rejection
- approval never trusts local math alone; it always asks HCM to book the request
- approval success updates the local snapshot with HCM's returned remaining balance

## 10. API Contract

### `GET /balances`

Query params:

- `employeeId`
- `locationId`
- optional `refresh`

Response includes:

- snapshot balance
- active hold amount
- estimated available balance
- source metadata

### `POST /hcm-sync/batches`

Request body:

- `batchId`
- `generatedAt`
- `balances[]`

Behavior:

- ignores duplicate batch ids
- ignores stale rows older than the current snapshot's source timestamp
- upserts newer rows

### `POST /time-off-requests`

Creates a pending request if local estimate allows it.

Behavior:

- warms the snapshot from HCM if needed
- refreshes once before rejecting an insufficient local estimate

### `POST /time-off-requests/:id/approve`

Behavior:

- idempotent on already approved requests
- moves to `APPROVAL_IN_PROGRESS`
- books against HCM using a stable idempotency key
- resolves to `APPROVED`, `REJECTED`, or `REQUIRES_RECONCILIATION`

### `POST /time-off-requests/:id/reject`

Rejects a pending request.

### `POST /time-off-requests/:id/cancel`

Cancels a pending request.

### `POST /time-off-requests/:id/reconcile`

Retries the same HCM booking request with the same idempotency key to safely resolve an ambiguous prior outcome.

## 11. Concurrency and Integrity

The implementation uses an in-process keyed mutex per employee/location. This is enough for the single-instance take-home and prevents obvious local races between create/approve/cancel/reconcile operations on the same balance bucket.

Production note:

- for multi-instance deployment, replace this with a database-backed or distributed lock strategy
- alternatively use stronger transactional serialization on the balance bucket

## 12. Failure Handling

### HCM validation failure

Examples:

- invalid employee/location
- insufficient balance

Behavior:

- create path returns a client error
- approval path marks the request `REJECTED`

### HCM timeout or ambiguous transport failure

Behavior:

- never assume success or failure
- request moves to `REQUIRES_RECONCILIATION`
- outbound command remains recorded with the same idempotency key
- reconciliation replays the same booking request

### External balance change

Examples:

- anniversary bonus
- start-of-year refresh
- manual admin correction

Behavior:

- batch sync updates local snapshots
- realtime approval catches the latest HCM truth even if the local snapshot is stale

### Duplicate deliveries and retries

Behavior:

- duplicate HCM batch ids are ignored
- duplicate approval after success is effectively idempotent
- reconciliation reuses the same HCM idempotency key

## 13. Observability and Auditability

The code persists enough state to answer:

- what request was attempted
- which HCM command was sent
- whether the outcome was known, failed, or ambiguous
- which batch deliveries were processed

Recommended production additions:

- correlation ids across inbound and outbound calls
- metrics for reconciliation backlog and stale-snapshot age
- alerting on repeated transport ambiguity
- structured audit events for every state transition

## 14. Alternatives Considered

### Batch-only synchronization

Rejected because employee feedback and manager approval would be too stale.

### Realtime-only with no local cache

Rejected because it creates unnecessary HCM dependence for every screen load and removes the ability to show a fast local estimate when HCM is healthy but distant.

### Booking into HCM at request creation

Rejected because it complicates rejection/cancellation semantics and over-commits pending requests.

### Separate hold table

Rejected for this scope because request state already expresses the hold lifecycle clearly enough.

### GraphQL API

Rejected because command-style state transitions are clearer as REST resources and actions here.

## 15. Test Strategy

The suite is intentionally layered:

### Unit tests

- balance unit conversion
- hold/availability math helpers

### Integration tests

- stale batch rows are skipped
- duplicate batch ids are ignored
- pending requests act as local holds
- HCM transport ambiguity moves a request into reconciliation

### E2E tests with a real HTTP mock HCM

- happy-path create + approve
- external balance decrease before approval
- stale local snapshot refreshed after external bonus
- local hold prevents obvious overbooking
- timeout-after-apply enters reconciliation, then resolves with the same idempotency key
- batch corpus import and duplicate batch handling

## 16. Coverage Philosophy

Raw percentage is not the main success metric for this problem; failure-mode scenario coverage is. The repository still includes a coverage gate so the suite catches broad regressions, but the stronger signal is the scenario matrix above.

See `docs/COVERAGE.md` for the latest captured numbers from this workspace.

## 17. Future Work

- replace in-memory mutex with distributed locking
- add scheduled reconciliation job and dead-letter handling
- add approval/rejection authorization boundaries
- add cancellation-of-approved-request flow with HCM credit reversal
- add OpenAPI generation and structured audit event export
