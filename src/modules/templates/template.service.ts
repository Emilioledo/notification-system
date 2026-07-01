import { DeliveryError } from "../delivery/delivery.errors.js";
import type { NotificationRecord } from "../notifications/notification.types.js";

import type {
  TemplateRecord,
  TemplateRepositoryPort,
} from "./template.repository.js";

type ResolvedTemplate = {
  subject: string | null;
  body: string;
};

function renderTemplate(
  template: string,
  data: Record<string, unknown>,
) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = data[key];

    if (value === undefined || value === null) {
      throw new DeliveryError(
        `Missing template variable: ${key}`,
        "permanent",
        "MISSING_TEMPLATE_DATA",
      );
    }

    return String(value);
  });
}

export type TemplateServicePort = {
  resolve(notification: NotificationRecord): Promise<ResolvedTemplate>;
};

export class TemplateService implements TemplateServicePort {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  async resolve(notification: NotificationRecord): Promise<ResolvedTemplate> {
    if (notification.body) {
      return {
        subject: notification.subject,
        body: notification.body,
      };
    }

    if (!notification.templateId) {
      throw new DeliveryError(
        "Notification has no body or template configured",
        "permanent",
        "MISSING_CONTENT",
      );
    }

    const template = await this.templateRepository.findLatestByIdAndChannel(
      notification.templateId,
      notification.channel,
    );

    if (!template) {
      throw new DeliveryError(
        "Template not found for notification",
        "permanent",
        "MISSING_TEMPLATE",
      );
    }

    const templateData = notification.templateData ?? {};

    return {
      subject: template.subjectTemplate
        ? renderTemplate(template.subjectTemplate, templateData)
        : notification.subject,
      body: renderTemplate(template.bodyTemplate, templateData),
    };
  }
}
