import type { NotificationRepositoryPort } from "../notifications/notification.repository.js";
import type { NotificationRecord } from "../notifications/notification.types.js";
import type { ChannelProvider } from "../providers/provider.interface.js";

type ProviderRegistry = {
  email: ChannelProvider;
  sms: ChannelProvider;
};

function resolveBody(notification: NotificationRecord) {
  if (notification.body) {
    return notification.body;
  }

  if (notification.templateId) {
    throw new Error("Template resolution is not implemented yet");
  }

  throw new Error("Notification has no body or template configured");
}

export class DeliveryService {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async processNotification(notificationId: string) {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new Error(`Notification ${notificationId} was not found`);
    }

    await this.notificationRepository.updateStatus(
      notification.id,
      "PROCESSING",
      {
        lastError: null,
      },
    );

    try {
      const provider = this.providerRegistry[notification.channel];
      const body = resolveBody(notification);
      const result = await provider.send({
        notificationId: notification.id,
        recipient: notification.recipient,
        subject: notification.subject,
        body,
      });

      await this.notificationRepository.updateStatus(notification.id, "SENT", {
        externalRef: result.externalRef,
        lastError: null,
      });
    } catch (error) {
      const lastError =
        error instanceof Error ? error.message : "Unknown delivery error";

      await this.notificationRepository.updateStatus(
        notification.id,
        "FAILED",
        {
          lastError,
        },
      );

      throw error;
    }
  }
}
