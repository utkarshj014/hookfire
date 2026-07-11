import React from "react";
import type { WebhookEndpoint } from "../types";

interface EndpointsTabProps {
  loadingEndpoints: boolean;
  endpoints: WebhookEndpoint[];
  onRegisterClick: () => void;
  onToggleStatus: (endpoint: WebhookEndpoint) => void;
  onEditClick: (endpoint: WebhookEndpoint) => void;
  onRotateSecret: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

export const EndpointsTab: React.FC<EndpointsTabProps> = ({
  loadingEndpoints,
  endpoints,
  onRegisterClick,
  onToggleStatus,
  onEditClick,
  onRotateSecret,
  onDeleteClick,
}) => {
  return (
    <section className="content-section animate-fade-in">
      <div className="filter-bar" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Webhook Endpoints</h2>
        <button className="btn btn-primary" onClick={onRegisterClick}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginRight: "4px" }}
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Register Endpoint
        </button>
      </div>

      {loadingEndpoints && endpoints.length === 0 ? (
        <div className="loader-container">
          <svg
            className="animate-spin"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="3"
          >
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.05)" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>Loading endpoints...</span>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No webhook endpoints registered</div>
          <div className="empty-state-desc">
            Configure target servers to start fanning out events matching event subscriptions.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={onRegisterClick}
          >
            Add Your First Endpoint
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="delivery-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Subscribed Events</th>
                <th style={{ width: "120px", textAlign: "center" }}>Status</th>
                <th style={{ width: "240px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.id} style={{ cursor: "default" }}>
                  <td style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {endpoint.url}
                      </span>
                      <span className="mono-text" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ID: {endpoint.id}
                      </span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {endpoint.subscriptions && endpoint.subscriptions.length > 0 ? (
                        endpoint.subscriptions.map((sub, idx) => (
                          <span key={idx} className="event-tag">
                            {sub.eventType}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          No subscriptions
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <label className="switch" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={endpoint.isActive}
                          onChange={() => onToggleStatus(endpoint)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
                        onClick={() => onEditClick(endpoint)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
                        onClick={() => onRotateSecret(endpoint.id)}
                        title="Rotate signing secret"
                      >
                        Rotate Key
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.375rem 0.625rem",
                          color: endpoint._count && endpoint._count.deliveries > 0 ? "#888888" : "var(--danger)",
                          borderColor: endpoint._count && endpoint._count.deliveries > 0 ? "rgba(128, 128, 128, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          opacity: endpoint._count && endpoint._count.deliveries > 0 ? 0.6 : 1,
                          cursor: endpoint._count && endpoint._count.deliveries > 0 ? "not-allowed" : "pointer",
                        }}
                        onClick={() => {
                          if (endpoint._count && endpoint._count.deliveries > 0) {
                            alert("Cannot delete endpoints with delivery history. If you do not want to use this endpoint, please deactivate it instead.");
                            return;
                          }
                          onDeleteClick(endpoint.id);
                        }}
                        title={
                          endpoint._count && endpoint._count.deliveries > 0
                            ? "Cannot delete endpoint with delivery history"
                            : "Delete endpoint"
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
