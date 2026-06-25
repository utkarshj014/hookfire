import { markDeliverySuccess } from "../services/delivery.service.js";
import { getEventById } from "../services/event.service.js";
import { deliverWebhookJob } from "../services/webhook.service.js";

export async function processWebhookJob({
  data: { eventId },
  id,
  attemptsMade,
}: {
  data: { eventId: string };
  id?: string;
  attemptsMade: number;
}) {
  // Simulate Failure
  // const randomFailure = Math.random() < 0.5;
  // const sureFailure = true;

  // if (sureFailure) {
  //   console.log(`Job ${id} | Attempt ${attemptsMade + 1} | Failed`);
  //   throw new Error(`Simulated failure for job ID ${id}`);
  // }

  const event = await getEventById(eventId);

  if (!event) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  // console.log(`event.id: ${event.id}, event.Type: ${event.eventType}`);

  const webhookResult = await deliverWebhookJob(
    event.eventType,
    event.payload,
  ).catch((error) => {
    console.error(
      `Failed to deliver webhook for event ID ${event.id}:`,
      error.message,
    );
    throw error;
  });

  console.log(`Webhook delivered for event ID ${event.id}:`, webhookResult);

  await markDeliverySuccess(event.id).catch((error) => {
    console.error(
      `Failed to mark delivery success for event ID ${event.id}:`,
      error.message,
    );

    throw new Error(`Failed to mark delivery success for event ID ${event.id}`);
  });

  // console.log(`Delivered event with ID ${event.id} successfully`);

  console.log(`Job ${id} | Attempt ${attemptsMade + 1} | Success`);
}
