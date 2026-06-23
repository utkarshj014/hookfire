import { markDeliverySuccess } from "../services/delivery.service.js";
import { getEventById } from "../services/event.service.js";

export async function processWebhookJob(eventId: string) {
  const event = await getEventById(eventId);

  if (!event) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  console.log(event);

  await markDeliverySuccess(event.id).catch((error) => {
    console.error(
      `Failed to mark delivery success for event ID ${event.id}:`,
      error.message,
    );
  });

  console.log(`Delivered event with ID ${event.id} successfully`);
}
