import { z } from "zod";

export const CreateEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  payload: z.record(z.string(), z.unknown()),
});
