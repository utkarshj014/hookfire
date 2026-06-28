import React from "react";
import type { Delivery } from "../types";

interface DeliveryTableProps {
  deliveries: Delivery[];
  onRowClick: (deliveryId: string) => void;
}

export const DeliveryTable: React.FC<DeliveryTableProps> = ({
  deliveries,
  onRowClick,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return (
          <span className="badge badge-success">
            <span className="badge-dot" />
            SUCCESS
          </span>
        );
      case "FAILED":
        return (
          <span className="badge badge-failed">
            <span className="badge-dot" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="badge badge-pending">
            <span className="badge-dot" />
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (deliveries.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-state-title">No deliveries found</div>
        <div className="empty-state-desc">
          There are no webhook delivery records matching your search or filters at the moment.
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrapper animate-fade-in">
      <table className="delivery-table">
        <thead>
          <tr>
            <th>Delivery ID</th>
            <th>Event ID</th>
            <th>Endpoint ID</th>
            <th style={{ textAlign: "center" }}>Attempts</th>
            <th>Status</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr key={delivery.id} onClick={() => onRowClick(delivery.id)}>
              <td>
                <span className="mono-text" style={{ color: "var(--accent-secondary)" }}>
                  {delivery.id.substring(0, 8)}...
                </span>
              </td>
              <td>
                <span className="mono-text">{delivery.eventId.substring(0, 8)}...</span>
              </td>
              <td>
                <span className="mono-text">{delivery.endpointId.substring(0, 8)}...</span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span style={{ fontWeight: 600 }}>{delivery.attempts}</span>
              </td>
              <td>{getStatusBadge(delivery.status)}</td>
              <td>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  {formatDate(delivery.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
