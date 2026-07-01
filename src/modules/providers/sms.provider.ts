import type {
  ChannelProvider,
  DeliveryRequest,
  DeliveryResult,
} from "./provider.interface.js";

export class SmsProvider implements ChannelProvider {
  async send(input: DeliveryRequest): Promise<DeliveryResult> {
    return {
      externalRef: `sms:${input.notificationId}`,
    };
  }
}
