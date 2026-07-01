import { and, eq } from "drizzle-orm";

import type { DatabaseClient } from "../../db/client.js";
import { userPreferences } from "../../db/schema/index.js";
import type { NotificationRecord } from "../notifications/notification.types.js";

export type PreferenceRepositoryPort = {
  isChannelEnabled(
    userId: string,
    channel: NotificationRecord["channel"],
  ): Promise<boolean>;
};

export class PreferenceRepository implements PreferenceRepositoryPort {
  constructor(private readonly db: DatabaseClient) {}

  async isChannelEnabled(
    userId: string,
    channel: NotificationRecord["channel"],
  ) {
    const [preference] = await this.db
      .select({ enabled: userPreferences.enabled })
      .from(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, userId),
          eq(userPreferences.channel, channel),
        ),
      )
      .limit(1);

    return preference?.enabled ?? true;
  }
}
