import React from "react";
import type { DeliveryDetail } from "../types";
import { Modal } from "./Modal";

interface DeliveryDetailModalProps {
  selectedDelivery: DeliveryDetail | null;
  loadingDetail: boolean;
  errorDetail: string | null;
  retrySuccessMessage: string | null;
  isRetrying: boolean;
  onClose: () => void;
  onRetry: (id: string) => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  selectedDelivery,
  loadingDetail,
  errorDetail,
  retrySuccessMessage,
  isRetrying,
  onClose,
  onRetry,
}) => {
  const isOpen = !!(selectedDelivery || loadingDetail || errorDetail);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delivery Details"
      maxWidth="700px"
      headerActions={
        <>
          {selectedDelivery && (
            <span
              className={`badge ${selectedDelivery.status.toUpperCase() === "SUCCESS" ? "badge-success" : "badge-failed"}`}
            >
              {selectedDelivery.status}
            </span>
          )}
          {selectedDelivery && selectedDelivery.status === "FAILED" && (
            <button
              className="btn btn-primary"
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.75rem",
                marginLeft: "auto",
                marginRight: "1rem",
              }}
              onClick={() => onRetry(selectedDelivery.id)}
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry Webhook (DLQ)"}
            </button>
          )}
        </>
      }
    >
      {retrySuccessMessage && (
        <div
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid var(--success)",
            color: "var(--success)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.875rem",
            textAlign: "left",
            marginBottom: "1rem",
          }}
        >
          {retrySuccessMessage}
        </div>
      )}

      {loadingDetail ? (
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
          <span>Fetching full delivery logs...</span>
        </div>
      ) : errorDetail ? (
        <div className="error-banner">
          <strong>Error:</strong> {errorDetail}
        </div>
      ) : selectedDelivery ? (
        <>
          <div className="grid-cols-2">
            <div className="detail-item">
              <span className="detail-label">Delivery ID</span>
              <span className="detail-val mono-text">{selectedDelivery.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Attempt Count</span>
              <span className="detail-val">{selectedDelivery.attemptCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created At</span>
              <span className="detail-val">
                {new Date(selectedDelivery.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Attempt At</span>
              <span className="detail-val">
                {selectedDelivery.lastAttemptAt
                  ? new Date(selectedDelivery.lastAttemptAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>

          <div>
            <h3 className="modal-section-title">Webhook Endpoint</h3>
            <div className="detail-item">
              <span className="detail-label">Target URL</span>
              <span
                className="detail-val mono-text"
                style={{ color: "var(--accent-secondary)" }}
              >
                {selectedDelivery.endpoint?.url || "N/A"}
              </span>
            </div>
          </div>

          <div>
            <h3 className="modal-section-title">Event Information</h3>
            <div className="grid-cols-2" style={{ marginBottom: "0.75rem" }}>
              <div className="detail-item">
                <span className="detail-label">Event ID</span>
                <span className="detail-val mono-text">{selectedDelivery.eventId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Event Type</span>
                <span
                  className="detail-val mono-text"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {selectedDelivery.event?.eventType || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {selectedDelivery.attempts && selectedDelivery.attempts.length > 0 && (
            <div>
              <h3 className="modal-section-title">Attempt History</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {selectedDelivery.attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.015)",
                      border: "1px solid var(--border-color)",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        Attempt #{attempt.attemptNumber}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {new Date(attempt.startedAt).toLocaleString()}
                      </span>
                      {attempt.errorMessage && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--danger)",
                            wordBreak: "break-word",
                          }}
                        >
                          {attempt.errorMessage}
                        </span>
                      )}
                    </div>
                    <span
                      className={`badge ${attempt.status.toUpperCase() === "SUCCESS" ? "badge-success" : "badge-failed"}`}
                    >
                      {attempt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDelivery.latestError && (
            <div>
              <h3 className="modal-section-title">Error Logs</h3>
              <div className="error-banner">{selectedDelivery.latestError}</div>
            </div>
          )}

          <div>
            <h3 className="modal-section-title">Raw Event Payload</h3>
            <pre className="code-viewer">
              {JSON.stringify(selectedDelivery.event?.payload || {}, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </Modal>
  );
};
