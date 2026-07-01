import { and, desc, eq } from "drizzle-orm";

import type { DatabaseClient } from "../../db/client.js";
import { templates } from "../../db/schema/index.js";
import type { NotificationRecord } from "../notifications/notification.types.js";

export type TemplateRecord = typeof templates.$inferSelect;

export type TemplateRepositoryPort = {
  findLatestByIdAndChannel(
    templateId: string,
    channel: NotificationRecord["channel"],
  ): Promise<TemplateRecord | null>;
};

export class TemplateRepository implements TemplateRepositoryPort {
  constructor(private readonly db: DatabaseClient) {}

  async findLatestByIdAndChannel(
    templateId: string,
    channel: NotificationRecord["channel"],
  ) {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.channel, channel)))
      .orderBy(desc(templates.version))
      .limit(1);

    return template ?? null;
  }
}
