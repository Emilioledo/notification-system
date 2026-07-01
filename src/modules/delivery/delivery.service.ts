import type { DeliveryRepositoryPort } from "./delivery.repository.js";
import { DeliveryError, isPermanentDeliveryError } from "./delivery.errors.js";
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
    throw new DeliveryError(
      "Template resolution is not implemented yet",
      "permanent",
      "MISSING_TEMPLATE_RESOLUTION",
    );
  }

  throw new DeliveryError(
    "Notification has no body or template configured",
    "permanent",
    "MISSING_CONTENT",
  );
}

export class DeliveryService {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryRepository: DeliveryRepositoryPort,
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

    const provider = this.providerRegistry[notification.channel];
    const attemptNumber =
      await this.deliveryRepository.getNextAttemptNumber(notification.id);

    try {
      const body = resolveBody(notification);
      const result = await provider.send({
        notificationId: notification.id,
        recipient: notification.recipient,
        subject: notification.subject,
        body,
      });

      await this.deliveryRepository.createAttempt({
        notificationId: notification.id,
        attemptNumber,
        provider: provider.name,
        status: "SENT",
      });

      await this.notificationRepository.updateStatus(notification.id, "SENT", {
        externalRef: result.externalRef,
        lastError: null,
      });
    } catch (error) {
      const lastError =
        error instanceof Error ? error.message : "Unknown delivery error";

      await this.deliveryRepository.createAttempt({
        notificationId: notification.id,
        attemptNumber,
        provider: provider.name,
        status: "FAILED",
        errorCode: error instanceof DeliveryError ? (error.code ?? null) : null,
        errorMessage: lastError,
      });

      await this.notificationRepository.updateStatus(
        notification.id,
        isPermanentDeliveryError(error) ? "FAILED" : "RETRY_SCHEDULED",
        {
          lastError,
        },
      );

      throw error;
    }
  }
}
