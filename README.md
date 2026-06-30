# Notification System

## Overview

This project is a functional prototype of a scalable notification system inspired by the notification system problem from _System Design Interview - An Insider's Guide (Vol. 1)_.

The goal is to build an implementation-focused backend system that is:

- scalable enough for interview discussion
- simple enough to avoid overengineering
- easy to test
- explicit about trade-offs

The system will support asynchronous notification delivery for multiple channels, starting with `email` and `sms`.

## Goals

The system should:

- accept notification requests through an HTTP API
- persist notifications in PostgreSQL as the source of truth
- enqueue delivery jobs asynchronously with BullMQ
- process notifications with stateless workers
- respect basic user channel preferences
- support retries for transient failures
- provide idempotency to avoid duplicate notification creation
- expose delivery status for tracking

## Recommended Stack

- `TypeScript`
- `Node.js`
- `Fastify`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `Drizzle ORM`
- `Vitest`
- `Docker Compose`

## Why This Architecture

The recommended architecture is a modular monolith with asynchronous processing.

This is the best fit for the challenge because it:

- demonstrates strong backend design without introducing unnecessary infrastructure
- keeps the HTTP API decoupled from actual delivery work
- allows horizontal scaling of workers
- keeps the system easy to reason about and test
- provides realistic trade-offs for retries, idempotency, and observability

This project should not start as a microservices system. That would add operational and design complexity without improving the evaluation outcome.

## High-Level Architecture

The system has two logical runtime components:

1. `API`
2. `Worker`

Main components:

1. HTTP API
   - receives notification requests
   - validates input
   - applies idempotency rules
   - persists notification data
   - enqueues delivery jobs

2. PostgreSQL
   - source of truth
   - stores notifications, attempts, preferences, and templates

3. Redis + BullMQ
   - asynchronous job queue
   - delayed retries
   - worker concurrency control

4. Worker
   - fetches jobs from the queue
   - loads notification data
   - checks user preferences
   - resolves templates
   - calls the appropriate provider
   - updates final state or schedules retries

5. Channel Providers
   - `EmailProvider`
   - `SmsProvider`
   - fake/mock provider implementations for the challenge prototype

## Delivery Model

The system should use:

- `at-least-once delivery`
- `idempotency`
- `retry with exponential backoff`

The project should not attempt true `exactly-once` delivery. For this challenge, `at-least-once` plus idempotency is a more realistic and defendable choice.

## Scope

### In Scope

- `email` and `sms` channels
- asynchronous delivery
- persistent notification state
- user preferences per channel
- simple templates
- retries for transient failures
- idempotency key support
- notification status lookup
- structured logging
- unit and integration tests

### Out of Scope

- push notifications
- quiet hours
- digest or batch notifications
- multi-region deployment
- provider failover across channels
- advanced dead-letter queue workflows
- distributed tracing
- sharding
- complex marketing segmentation

## Suggested API

### `POST /notifications`

Creates a notification request.

Example request fields:

- `userId`
- `channel`
- `recipient`
- `subject` optional
- `body` optional
- `templateId` optional
- `templateData` optional
- `idempotencyKey`

Validation rule:

- at least one of `body` or `templateId` must be provided

### `GET /notifications/:id`

Returns current notification status and delivery information.

Optional future endpoints:

- `POST /users/:userId/preferences`
- `GET /users/:userId/preferences`
- `POST /notifications/:id/retry`

## Core Flow

1. A client sends `POST /notifications`
2. The API validates the payload
3. The API checks idempotency
4. The API stores the notification with status `PENDING`
5. The API enqueues a BullMQ job
6. A worker consumes the job
7. The worker loads the notification
8. The worker checks user preferences
9. The worker resolves the template or uses the direct body
10. The worker selects the proper provider
11. The worker attempts delivery
12. The worker records the attempt
13. The worker updates status to `SENT`, `RETRY_SCHEDULED`, or `FAILED`

## Data Model

### `notifications`

- `id`
- `user_id`
- `channel`
- `status`
- `recipient`
- `subject`
- `body`
- `template_id` nullable
- `template_data` jsonb
- `idempotency_key`
- `external_ref` nullable
- `scheduled_at` nullable
- `last_error` nullable
- `created_at`
- `updated_at`

### `notification_attempts`

- `id`
- `notification_id`
- `attempt_number`
- `provider`
- `status`
- `error_code` nullable
- `error_message` nullable
- `created_at`

### `user_preferences`

- `user_id`
- `channel`
- `enabled`
- `created_at`
- `updated_at`

### `templates`

- `id`
- `name`
- `channel`
- `subject_template` nullable
- `body_template`
- `version`
- `created_at`

## Notification States

- `PENDING`
- `PROCESSING`
- `SENT`
- `RETRY_SCHEDULED`
- `FAILED`
- `CANCELLED` optional

## Error Handling and Retries

Errors should be classified into two broad categories:

1. transient errors
   - network timeout
   - temporary provider outage
   - connection failure
   - should be retried

2. permanent errors
   - invalid recipient
   - missing template
   - user opted out
   - should not be retried

Retry policy recommendation:

- maximum `3` to `5` attempts
- exponential backoff
- optional jitter if time allows

## BullMQ Design

Start with a single queue:

- `notifications`

Job payload:

- `notificationId`
- `attempt`

Important design rule:

- BullMQ manages delivery scheduling and retries, but PostgreSQL remains the system of record

## Project Structure

```text
notification-system/
  src/
    app/
      server.ts
      worker.ts
    config/
      env.ts
    modules/
      notifications/
        notification.controller.ts
        notification.service.ts
        notification.repository.ts
        notification.schemas.ts
        notification.types.ts
      preferences/
        preference.service.ts
        preference.repository.ts
      templates/
        template.service.ts
        template.repository.ts
      delivery/
        delivery.service.ts
        delivery.repository.ts
        retry.policy.ts
      queue/
        queue.ts
        queue.jobs.ts
        queue.worker.ts
      providers/
        provider.interface.ts
        email.provider.ts
        sms.provider.ts
    db/
      schema/
      client.ts
      migrations/
    shared/
      errors/
      logger/
      utils/
  test/
    unit/
    integration/
  docker-compose.yml
  DESIGN.md
  package.json
  tsconfig.json
  drizzle.config.ts
```

## Testing Strategy

Testing is a core requirement of the challenge, so this project should place strong emphasis on correctness and reliability.

### Unit Tests

- payload validation
- retry policy
- error classification
- idempotency handling
- template rendering
- preference checks

### Integration Tests

- create notification successfully
- persist notification correctly
- enqueue BullMQ job
- process notification with worker
- retry on transient error
- fail immediately on permanent error
- retrieve notification status

### Optional End-to-End Test

If time allows:

- run API, PostgreSQL, and Redis together in containers
- verify the end-to-end notification lifecycle

## Observability

Minimum recommended observability:

- structured logs
- include `notificationId` in all relevant logs
- log delivery attempts and final outcomes

Optional if time allows:

- counters for created, sent, failed, retried notifications
- basic health endpoints

## Trade-Offs

### Why Fastify

- lightweight
- good TypeScript support
- simple and explicit

### Why Drizzle

- lower magic than Prisma
- explicit SQL-oriented modeling
- easier to explain in an interview setting

### Why BullMQ + Redis

- natural fit for TypeScript projects
- supports delayed retries and worker concurrency cleanly
- avoids implementing a custom queue for the challenge

### Why Not Microservices

- too much operational complexity for the challenge
- more moving parts without clear evaluation benefit
- harder to keep implementation focused and well tested

## Scalability Story

This design is scalable without becoming overly complex because:

- the API is decoupled from notification delivery
- Redis absorbs traffic spikes through the queue
- workers can scale horizontally
- PostgreSQL preserves strong delivery state tracking
- providers are abstracted behind interfaces, making new channels easier to add

This is enough to discuss future growth while keeping the prototype realistic.

## Implementation Plan

### Phase 1: Project Bootstrap

- initialize the TypeScript project
- configure package manager, scripts, and TypeScript
- add Fastify, Drizzle, BullMQ, Redis client, and Vitest
- set up linting and formatting if desired

### Phase 2: Local Infrastructure

- add `docker-compose.yml`
- configure PostgreSQL and Redis services
- define environment variables
- create configuration loader

### Phase 3: Database Foundation

- define Drizzle schema
- create migrations
- add database client setup

### Phase 4: Core Notification API

- implement `POST /notifications`
- validate payloads
- implement idempotency checks
- persist notifications with `PENDING` status

### Phase 5: Queue Integration

- configure BullMQ
- create the `notifications` queue
- enqueue notification jobs after persistence

### Phase 6: Worker Processing

- implement worker bootstrap
- load notifications from PostgreSQL
- resolve message content
- call the correct provider
- update notification state

### Phase 7: Delivery Reliability

- implement retry classification
- add exponential backoff
- persist attempt history
- handle permanent failures explicitly

### Phase 8: Read API and Preferences

- implement `GET /notifications/:id`
- implement user preference checks
- optionally add preference endpoints

### Phase 9: Templates and Logging

- add basic template support
- add structured logging
- include correlation fields like `notificationId`

### Phase 10: Tests and Documentation

- add unit tests for core logic
- add integration tests for API and worker flows
- write `DESIGN.md`
- document trade-offs and future improvements

## Key Risks

- adding too many product features too early
- overcomplicating template management
- treating BullMQ as the source of truth instead of PostgreSQL
- failing to distinguish transient and permanent errors cleanly
- underinvesting in integration tests

## Final Recommendation

Use this combination:

- `Fastify`
- `TypeScript`
- `PostgreSQL`
- `Redis + BullMQ`
- `Drizzle ORM`
- `Vitest`
- `email` and `sms` channels
- fake providers for delivery simulation
- strong focus on idempotency, retries, states, and tests

This provides a scalable, interview-ready implementation without unnecessary overengineering.
