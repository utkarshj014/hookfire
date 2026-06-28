import { markDeliverySuccess } from "../services/delivery.service.js";
import { getEventById } from "../services/event.service.js";
import { deliverWebhookJob } from "../services/webhook.service.js";

export async function processWebhookJob({
  data: { eventId, endpointId, deliveryId },
}: {
  data: { eventId: string; endpointId: string; deliveryId: string };
}) {
  const event = await getEventById(eventId);

  if (!event) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  const webhookResult = await deliverWebhookJob(
    endpointId,
    event.eventType,
    event.payload,
    deliveryId,
  );

  console.log(
    `Webhook delivered for event ID ${event.id} at ${endpointId} successfully`,
    webhookResult,
  );

  await markDeliverySuccess(deliveryId).catch((error) => {
    throw new Error(
      `Failed to mark delivery as success for delivery ${deliveryId}. Error: ${error.message}`,
    );
  });

  console.log(`Delivery ${deliveryId} marked as Success!`);
}
