import type { DeliveryRepositoryPort } from "./delivery.repository.js";
import { DeliveryError, isPermanentDeliveryError } from "./delivery.errors.js";
import type { NotificationRepositoryPort } from "../notifications/notification.repository.js";
import type { NotificationRecord } from "../notifications/notification.types.js";
import type { PreferenceRepositoryPort } from "../preferences/preference.repository.js";
import type { ChannelProvider } from "../providers/provider.interface.js";
import { logger } from "../../shared/logger.js";
import type { TemplateServicePort } from "../templates/template.service.js";

type ProviderRegistry = {
  email: ChannelProvider;
  sms: ChannelProvider;
};

export class DeliveryService {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryRepository: DeliveryRepositoryPort,
    private readonly preferenceRepository: PreferenceRepositoryPort,
    private readonly templateService: TemplateServicePort,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async processNotification(notificationId: string) {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new Error(`Notification ${notificationId} was not found`);
    }

    logger.info({ notificationId: notification.id }, "Loaded notification for delivery");

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

    const channelEnabled = await this.preferenceRepository.isChannelEnabled(
      notification.userId,
      notification.channel,
    );

    if (!channelEnabled) {
      const error = new DeliveryError(
        "User has disabled this notification channel",
        "permanent",
        "USER_OPTED_OUT",
      );

      await this.deliveryRepository.createAttempt({
        notificationId: notification.id,
        attemptNumber,
        provider: provider.name,
        status: "FAILED",
        errorCode: error.code ?? null,
        errorMessage: error.message,
      });

      await this.notificationRepository.updateStatus(notification.id, "FAILED", {
        lastError: error.message,
      });

      logger.warn(
        { notificationId: notification.id, channel: notification.channel },
        "Skipping delivery because the user disabled the channel",
      );

      throw error;
    }

    try {
      const content = await this.templateService.resolve(notification);
      const result = await provider.send({
        notificationId: notification.id,
        recipient: notification.recipient,
        subject: content.subject,
        body: content.body,
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

      logger.info(
        {
          notificationId: notification.id,
          provider: provider.name,
          externalRef: result.externalRef,
        },
        "Notification delivered successfully",
      );
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

      logger.error(
        {
          notificationId: notification.id,
          provider: provider.name,
          error: lastError,
          permanent: isPermanentDeliveryError(error),
        },
        "Notification delivery failed",
      );

      throw error;
    }
  }
}
