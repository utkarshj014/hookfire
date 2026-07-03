export interface EndpointSubscription {
  id: string;
  endpointId: string;
  eventType: string;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  rotatedAt?: string;
  subscriptions?: EndpointSubscription[];
  rawSecret?: string;
  _count?: {
    deliveries: number;
  };
}

export interface Event {
  id: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface Delivery {
  id: string;
  eventId: string;
  endpointId: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  attemptCount: number;
  latestError: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  status: "SUCCESS" | "FAILED" | "PENDING" | string;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string;
}

export interface DeliveryDetail extends Delivery {
  event: Event;
  endpoint: WebhookEndpoint;
  attempts: DeliveryAttempt[];
}

export interface Metrics {
  totalEvents: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}
