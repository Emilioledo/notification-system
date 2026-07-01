import { desc, eq } from "drizzle-orm";

import type { DatabaseClient } from "../../db/client.js";
import { notificationAttempts } from "../../db/schema/index.js";

export type NotificationAttemptStatus = "PENDING" | "SENT" | "FAILED";

export type DeliveryRepositoryPort = {
  createAttempt(input: {
    notificationId: string;
    attemptNumber: number;
    provider: string;
    status: NotificationAttemptStatus;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void>;
  getNextAttemptNumber(notificationId: string): Promise<number>;
};

export class DeliveryRepository implements DeliveryRepositoryPort {
  constructor(private readonly db: DatabaseClient) {}

  async createAttempt(input: {
    notificationId: string;
    attemptNumber: number;
    provider: string;
    status: NotificationAttemptStatus;
    errorCode?: string | null;
    errorMessage?: string | null;
  }) {
    await this.db.insert(notificationAttempts).values(input);
  }

  async getNextAttemptNumber(notificationId: string) {
    const [lastAttempt] = await this.db
      .select({ attemptNumber: notificationAttempts.attemptNumber })
      .from(notificationAttempts)
      .where(eq(notificationAttempts.notificationId, notificationId))
      .orderBy(desc(notificationAttempts.attemptNumber))
      .limit(1);

    return (lastAttempt?.attemptNumber ?? 0) + 1;
  }
}
