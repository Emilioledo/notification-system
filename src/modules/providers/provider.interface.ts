export type DeliveryRequest = {
  notificationId: string;
  recipient: string;
  subject?: string | null;
  body: string;
};

export type DeliveryResult = {
  externalRef: string;
};

export type ChannelProvider = {
  name: string;
  send(input: DeliveryRequest): Promise<DeliveryResult>;
};
