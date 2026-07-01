export type DeliveryErrorKind = "transient" | "permanent";

export class DeliveryError extends Error {
  constructor(
    message: string,
    public readonly kind: DeliveryErrorKind,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "DeliveryError";
  }
}

export function isPermanentDeliveryError(error: unknown) {
  return error instanceof DeliveryError && error.kind === "permanent";
}
