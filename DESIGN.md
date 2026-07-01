# Notification System Design

This document explains how I approached the challenge, why I made the architectural decisions I made, what I intentionally left out, and how I organized the implementation from the first phase to the final prototype.

For setup and runtime instructions, see `README.md`.

## What I Wanted To Demonstrate

My goal with this repository was not to simulate a full production notification platform. My goal was to build a correct, testable, implementation-oriented system design that translates a high-level architecture into working code.

I wanted the solution to focus on four qualities that matter most for this challenge:

- correct asynchronous processing
- clean separation of responsibilities
- explicit trade-offs instead of accidental complexity
- a delivery plan that moved from core flow to reliability features in controlled phases

## Why I Chose This Problem

I chose the notification system problem because it is a good fit for discussing real backend design concerns without needing artificial complexity.

It naturally exercises:

- asynchronous processing
- persistence and status tracking
- retries and error classification
- idempotency
- interface boundaries with external providers
- scalable runtime decomposition

It is also a problem where overengineering is easy. That made it a good challenge for demonstrating restraint.

## Why TypeScript Instead Of Go

If the only criterion were raw runtime efficiency or a concurrency-first systems language, `Go` would likely be the best choice for this kind of service.

I still chose `TypeScript` and `Node.js` deliberately.

### Why Go Would Be Strong

- excellent concurrency primitives
- low memory footprint for worker-style services
- strong fit for networked backend infrastructure
- very defensible choice for a production notification pipeline

### Why I Chose TypeScript Anyway

- faster implementation velocity for a challenge that emphasizes working, tested code
- strong ecosystem fit for this exact shape of system: `Fastify`, `BullMQ`, `Drizzle`, `Vitest`
- lower ceremony for iterating on API, queue, worker, and tests in parallel
- easier to keep the whole prototype in a single language across HTTP, queueing, persistence, and tests
- better leverage of the JavaScript queueing ecosystem, especially `BullMQ`, which is a natural fit for Redis-backed async work

### The Real Trade-Off

This is not a claim that TypeScript is the universally best language for notification systems.

The claim is narrower and intentional: for this challenge, `TypeScript` provided the best balance of development speed, architectural clarity, library support, and testability while still allowing a serious discussion about system design.

In other words, I optimized for a strong implementation and a strong explanation, not for theoretical maximum runtime performance.

## How I Structured The System

I implemented the system as a modular monolith split into two runtime processes:

1. `API`
2. `Worker`

Both processes share the same codebase, data model, and configuration, but I kept their operational responsibilities clearly separated.

### API Responsibilities I Assigned

- validate incoming notification requests
- enforce idempotency
- persist notifications in PostgreSQL
- enqueue asynchronous delivery jobs in BullMQ
- expose notification status lookup

### Worker Responsibilities I Assigned

- consume queued jobs
- load notification state from PostgreSQL
- check user channel preferences
- resolve templates when present
- call the selected provider
- persist attempts and final outcomes
- rely on retry policy for transient failures

### Infrastructure Responsibilities

- `PostgreSQL`: source of truth for notification state
- `Redis + BullMQ`: queueing, retry scheduling, and worker coordination

This gave me the most important scaling property for the problem: request acceptance is decoupled from delivery execution.

## Why I Chose This Architecture

I intentionally did not implement this as microservices.

For the scope of the challenge, a modular monolith is the right choice because it:

- keeps the implementation focused on core backend behavior
- avoids spending challenge time on deployment topology instead of correctness
- still demonstrates clear boundaries between API, delivery, queueing, persistence, and providers
- preserves an easy path to horizontal scaling at the worker layer

For this challenge, that balance felt right: simple enough to reason about, but realistic enough to discuss future evolution.

## Core Decisions I Made

### 1. PostgreSQL Is The Source Of Truth

I did not want the queue to become the system of record.

Every notification is first persisted in PostgreSQL and then enqueued for asynchronous processing. Delivery status, attempt history, idempotency behavior, and final outcome all live in the database.

That decision matters because:

- queue state is operationally useful but not authoritative
- notification history must survive worker restarts or Redis restarts
- status lookup must be independent of in-memory worker state
- retries and failure analysis need durable records

### 2. Redis And BullMQ Are Delivery Orchestration, Not Business State

`BullMQ` is used for:

- asynchronous dispatch
- retry scheduling
- exponential backoff
- concurrency control

It is intentionally not responsible for durable business truth.

This keeps the design defensible: if Redis is flushed, the database still contains the notification record and its state, even if recovery would require explicit replay tooling in a future version.

### 3. At-Least-Once Delivery Is The Right Model Here

I designed the system around:

- at-least-once processing
- idempotent request creation
- persistent attempt tracking

I did not try to implement exactly-once delivery semantics because that would add complexity disproportionate to the challenge and would not be credible without much heavier infrastructure and reconciliation logic.

### 4. Idempotency Applies To Request Creation

`idempotencyKey` prevents duplicate notification creation for the same logical client request.

This means:

- first request creates the notification
- repeated requests with the same key return the existing notification
- repeated requests do not create a new row
- repeated requests do not implicitly re-enqueue processing

I consider that strict idempotency, and for this challenge I believe it is the correct default behavior for request deduplication.

### 5. Retry Policy Is Based On Error Classification

Errors are separated into:

- transient errors: retried with backoff
- permanent errors: failed immediately

This was an important design choice because retrying everything creates noisy, expensive, and incorrect behavior.

Examples of permanent failures in this prototype:

- user opted out
- missing template data
- invalid template resolution

### 6. Providers Are Behind Narrow Interfaces

I wanted the delivery flow to depend on a provider abstraction, not on channel-specific logic scattered through the worker.

That keeps channel handling isolated and makes the design extensible without forcing premature generalization.

## Scope Of The Providers

I kept the provider layer intentionally narrow in this challenge.

Implemented providers:

- `EmailProvider`
- `SmsProvider`

Current provider behavior:

- fake delivery implementations
- deterministic enough for tests and demos
- return external references for successful sends
- integrate with retry and error handling flow

### Why The Providers Are Fake

I explicitly kept real third-party integrations out of scope.

That was the right decision for the challenge because the evaluation value is in the system design and core flow, not in wiring vendor SDKs.

Using fake providers allowed me to spend effort on:

- notification state transitions
- retry behavior
- idempotency
- persistence design
- tests
- architecture clarity

instead of spending it on:

- provider credentials
- SDK quirks
- network sandbox issues
- low-value integration boilerplate

### What Is Intentionally Missing From Provider Scope

- real vendor APIs
- channel failover between providers
- provider-specific rate limiting
- provider health scoring
- provider routing policies
- webhook ingestion for downstream delivery receipts

Those are valid next steps in a production system, but not necessary for a strong challenge prototype.

## Data Model

I kept the database schema intentionally small and focused.

### `notifications`

Stores the durable business record:

- identity
- channel
- recipient
- content or template reference
- idempotency key
- delivery status
- external reference
- last error
- timestamps

### `notification_attempts`

Stores delivery execution history:

- notification reference
- attempt number
- provider
- attempt status
- error code and message
- timestamp

This table is important because it separates current state from historical execution detail.

### `user_preferences`

Stores whether a user has a given channel enabled.

This allows the worker to reject notifications as permanent failures before hitting the provider when the channel is disabled.

### `templates`

Stores template definitions and versions.

The current implementation supports basic variable interpolation, which is enough to exercise template resolution and failure handling without introducing a full templating subsystem.

## Notification Lifecycle

The state model I implemented is:

- `PENDING`
- `PROCESSING`
- `SENT`
- `RETRY_SCHEDULED`
- `FAILED`

The main flow is:

1. client sends `POST /notifications`
2. API validates payload
3. API checks idempotency
4. API persists notification with `PENDING`
5. API enqueues `notification.deliver`
6. worker consumes the job
7. worker marks notification as `PROCESSING`
8. worker checks preferences and resolves content
9. worker calls provider
10. worker records the attempt
11. worker ends in `SENT`, `RETRY_SCHEDULED`, or `FAILED`

I kept this flow explicit because it makes runtime behavior easier to reason about and easier to test.

## API Surface

The endpoints I implemented are:

- `POST /notifications`
- `GET /notifications/:id`
- `GET /health`

`POST /notifications` supports:

- direct body notifications
- template-driven notifications
- idempotency keys

`GET /notifications/:id` exposes the persisted notification state so the asynchronous lifecycle can be observed externally.

## Testing Strategy

I treated testing as part of the architecture, not as cleanup work at the end.

The project includes:

- unit tests for focused domain behavior
- integration tests for API and module interactions
- optional end-to-end tests against PostgreSQL and Redis

### What The Tests Emphasize

- payload validation
- idempotency behavior
- retry classification
- preference handling
- template rendering
- worker processing flow
- final notification state transitions

The end-to-end suite is intentionally opt-in so the default developer loop remains fast.

This was a practical choice: keep the standard test run cheap and stable, while still proving the full lifecycle when needed.

## Observability

I added structured logging with notification-oriented context.

Notably:

- the worker logs include `notificationId`
- delivery processing emits visible lifecycle events
- failures persist both state and attempt details

I intentionally implemented enough observability to debug the asynchronous flow without trying to build a full telemetry platform.

## How I Planned The Implementation

One of my core goals in this challenge was to avoid building features in an ad hoc order.

I approached the implementation as a phased plan where each phase established a stable layer for the next one.

### Phase 1: Project Bootstrap

Goal:
Create a clean TypeScript project foundation with scripts, dependencies, and test tooling.

Why first:
Without a stable project skeleton, every later phase becomes noisier and harder to verify.

### Phase 2: Local Infrastructure

Goal:
Add PostgreSQL, Redis, environment loading, and process bootstrap.

Why first:
This system is infrastructure-dependent by design. Validating connectivity early removes ambiguity later.

### Phase 3: Database Foundation

Goal:
Define Drizzle schema and migrations.

Why first:
The database is the system of record, so the data model needed to exist before queueing and delivery behavior.

### Phase 4: Core Notification API

Goal:
Implement `POST /notifications`, validation, persistence, and idempotency.

Why first:
Request acceptance is the front door of the system. It had to be correct before async processing mattered.

### Phase 5: Queue Integration

Goal:
Publish notification jobs after persistence.

Why here:
Queueing only becomes meaningful once creation semantics and storage are correct.

### Phase 6: Worker Processing

Goal:
Consume jobs, load notifications, call providers, and update status.

Why here:
This is the first end-to-end version of the system. It converts stored requests into actual asynchronous execution.

### Phase 7: Delivery Reliability

Goal:
Add retry policy, error classification, and attempt persistence.

Why here:
Reliability belongs after the core happy path exists. Otherwise retry logic gets added before there is a clean baseline flow to protect.

### Phase 8: Read API And Preferences

Goal:
Expose notification lookup and enforce opt-out behavior.

Why here:
Once the system could create and process notifications, it was important to make state externally inspectable and behaviorally correct for user preferences.

### Phase 9: Templates And Logging

Goal:
Add template rendering and improve worker observability.

Why here:
Templates are product complexity, not transport complexity. They were intentionally added after the transport pipeline was stable.

### Phase 10: Tests And Documentation

Goal:
Strengthen confidence with tests and document the design explicitly.

Why last:
By this stage the system shape was clear enough to document honestly, based on what was actually built rather than on aspiration.

## Why The Phased Plan Matters

This phased approach was not just project management polish. It directly influenced the quality of the implementation.

It helped avoid three common failure modes:

- adding features before the underlying state model was stable
- mixing infrastructure concerns with domain concerns too early
- writing documentation for an imagined system instead of a real one

The result is a prototype that can be read in the same order I designed it: foundation first, reliability second, features third.

## Trade-Offs I Accepted

### Why Fastify

- lightweight and explicit
- strong TypeScript ergonomics
- simple enough for a challenge without sacrificing structure

### Why Drizzle

- SQL-oriented and easy to reason about
- lower abstraction overhead than heavier ORM approaches
- good fit for a reviewer who wants to see the data model clearly

### Why BullMQ

- natural Redis-backed queue for the TypeScript ecosystem
- clean delayed retry support
- straightforward worker model
- enough power for the challenge without custom queue infrastructure

### Why Not More Features

I intentionally left out features that would increase surface area without improving the signal of the submission.

Examples:

- real provider SDKs
- multiple API resources for preference management
- dead-letter tooling
- metrics dashboards
- distributed tracing
- multi-region concerns

That was not a shortcut. It was a scope decision to keep the implementation centered on correctness and architecture.

## AI Usage

The challenge explicitly allows AI usage, so I used it as an implementation accelerator, not as a substitute for design ownership.

The important boundary was this:

- architecture, scope, trade-offs, and sequencing were intentional decisions
- generated code was kept small enough to understand and review
- undocumented complexity was avoided
- the final structure, tests, and explanations reflect deliberate choices rather than copied output

In practice, that meant using AI to move faster on implementation details while keeping the design decisions and code understanding fully owned.

## What I Would Build Next

If this were extended beyond the challenge, the next improvements would be:

- replay tooling for orphaned `PENDING` notifications
- explicit manual retry endpoint
- provider abstraction for real vendor integrations
- metrics and dashboards
- dead-letter and recovery workflows
- outbox-style guarantees for stronger DB-to-queue consistency

Those are the next logical steps after the current prototype, not prerequisites for it.

## How I Position This Solution

I intentionally position this solution between a toy demo and a production system.

It is more serious than a CRUD exercise because it includes:

- async processing
- retries
- persistent state transitions
- provider boundaries
- idempotency
- templates
- preferences
- tests

It is also intentionally smaller than a production platform because I avoided infrastructure and feature complexity that would weaken the clarity of the challenge submission.

That balance is the main design statement I wanted this repository to make.
