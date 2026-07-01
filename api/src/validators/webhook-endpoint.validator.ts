import { z } from "zod";

export const CreateWebhookEndpointSchema = z.object({
  url: z.url("Must be a valid URL"),
  secret: z
    .string()
    .min(8, "Secret must be at least 8 characters long")
    .optional(),
  subscriptions: z
    .array(z.string().min(1, "Subscription topic cannot be empty"))
    .min(1, "At least one subscription is required"),
});

export const UpdateWebhookEndpointSchema = z.object({
  url: z.url("Must be a valid URL").optional(),
  isActive: z.boolean().optional(),
  subscriptions: z
    .array(z.string().min(1, "Subscription topic cannot be empty"))
    .optional(),
});

export const RotateSecretSchema = z.object({
  secret: z
    .string()
    .min(8, "Secret must be at least 8 characters long")
    .optional(),
});
