import { beforeEach, describe, expect, it, vi } from "vitest";

import { BullMqNotificationQueue } from "../../../../src/modules/queue/queue.js";

describe("BullMqNotificationQueue", () => {
  const add = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues notification delivery jobs with the expected name and payload", async () => {
    add.mockResolvedValueOnce(undefined);

    const publisher = new BullMqNotificationQueue({
      add,
    } as never);

    await publisher.enqueueNotification({
      notificationId: "550e8400-e29b-41d4-a716-446655440010",
      attempt: 1,
    });

    expect(add).toHaveBeenCalledWith(
      "notification.deliver",
      {
        notificationId: "550e8400-e29b-41d4-a716-446655440010",
        attempt: 1,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    );
  });
});
