import type {
  ChannelProvider,
  DeliveryRequest,
  DeliveryResult,
} from "./provider.interface.js";

export class EmailProvider implements ChannelProvider {
  async send(input: DeliveryRequest): Promise<DeliveryResult> {
    return {
      externalRef: `email:${input.notificationId}`,
    };
  }
}
