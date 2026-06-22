import { getEventById } from "../services/event.service.js";

export async function processWebhookJob(eventId: string) {
  const event = await getEventById(eventId);

  if (!event) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  console.log(event);
}
