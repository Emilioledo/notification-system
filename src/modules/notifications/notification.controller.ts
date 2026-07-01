import type { FastifyInstance } from "fastify";

import {
  createNotificationSchema,
  type CreateNotificationRequest,
} from "./notification.schemas.js";
import type { CreateNotificationResult } from "./notification.types.js";

export type NotificationService = {
  createNotification(
    input: CreateNotificationRequest,
  ): Promise<CreateNotificationResult>;
};

type RegisterNotificationRoutesOptions = {
  notificationService: NotificationService;
};

export function registerNotificationRoutes(
  server: FastifyInstance<any, any, any, any>,
  options: RegisterNotificationRoutesOptions,
) {
  server.post("/notifications", async (request, reply) => {
    const parsedPayload = createNotificationSchema.safeParse(request.body);

    if (!parsedPayload.success) {
      return reply.code(400).send({
        message: "Invalid notification payload",
        issues: parsedPayload.error.issues,
      });
    }

    const payload = parsedPayload.data;
    const result =
      await options.notificationService.createNotification(payload);

    return reply.code(result.created ? 201 : 200).send(result.notification);
  });
}
