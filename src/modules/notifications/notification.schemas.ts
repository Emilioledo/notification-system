import { z } from "zod";

export const createNotificationSchema = z
  .object({
    userId: z.uuid(),
    channel: z.enum(["email", "sms"]),
    recipient: z.string().trim().min(1).max(320),
    subject: z.string().trim().min(1).max(998).optional(),
    body: z.string().trim().min(1).optional(),
    templateId: z.uuid().optional(),
    templateData: z.record(z.string(), z.unknown()).optional(),
    idempotencyKey: z.string().trim().min(1).max(255),
  })
  .refine((value) => value.body !== undefined || value.templateId !== undefined, {
    message: "At least one of body or templateId must be provided",
    path: ["body"],
  });

export type CreateNotificationRequest = z.infer<typeof createNotificationSchema>;
