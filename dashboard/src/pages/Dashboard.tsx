import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type {
  Metrics,
  Delivery,
  DeliveryDetail,
  PaginatedResponse,
  QueueMetrics,
} from "../types";
import { MetricCard } from "../components/MetricCard";
import { DeliveryTable } from "../components/DeliveryTable";
import { Pagination } from "../components/Pagination";

export const Dashboard: React.FC = () => {
  // Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryDetail | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Filter & Refresh States
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Loading & Retry States
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySuccessMessage, setRetrySuccessMessage] = useState<string | null>(null);

  // Fetch metrics API
  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const response = await api.get<{ data: Metrics }>("/metrics");
      setMetrics(response.data.data);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch queue metrics API
  const fetchQueueMetrics = useCallback(async () => {
    try {
      const response = await api.get<{ data: QueueMetrics }>("/metrics/queues");
      setQueueMetrics(response.data.data);
    } catch (err) {
      console.error("Error fetching queue metrics:", err);
    }
  }, []);

  // Fetch deliveries API
  const fetchDeliveries = useCallback(async (page: number, limit: number, status: string) => {
    try {
      setLoadingDeliveries(true);
      const statusParam = status !== "ALL" ? `&status=${status}` : "";
      const response = await api.get<PaginatedResponse<Delivery>>(
        `/deliveries?page=${page}&limit=${limit}${statusParam}`,
      );
      const { data, meta } = response.data;
      setDeliveries(data);
      setTotalItems(meta.totalItems);
      setTotalPages(meta.totalPages);
      setHasPrevPage(meta.hasPrevPage);
      setHasNextPage(meta.hasNextPage);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  // Consolidated refresh trigger
  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchMetrics(),
      fetchQueueMetrics(),
      fetchDeliveries(currentPage, itemsPerPage, statusFilter),
    ]);
    setIsRefreshing(false);
  }, [fetchMetrics, fetchQueueMetrics, fetchDeliveries, currentPage, itemsPerPage, statusFilter]);

  // Initial load & automatic pagination trigger
  useEffect(() => {
    fetchMetrics();
    fetchQueueMetrics();
    fetchDeliveries(currentPage, itemsPerPage, statusFilter);
  }, [currentPage, itemsPerPage, statusFilter, fetchMetrics, fetchQueueMetrics, fetchDeliveries]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      triggerRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, triggerRefresh]);

  // Reset page when filter changes
  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  // Fetch delivery detail on-demand
  const handleRowClick = async (id: string) => {
    try {
      setLoadingDetail(true);
      setErrorDetail(null);
      setRetrySuccessMessage(null);
      const response = await api.get<{ data: DeliveryDetail }>(
        `/deliveries/${id}`,
      );
      setSelectedDelivery(response.data.data);
    } catch (err: any) {
      console.error("Error fetching delivery details:", err);
      setErrorDetail(
        err.response?.data?.message || "Failed to load delivery details",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // DLQ Retry Trigger
  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      setIsRetrying(true);
      setRetrySuccessMessage(null);
      const response = await api.post<{ message: string }>(`/dlq/${deliveryId}/retry`);
      setRetrySuccessMessage(response.data.message);
      
      // Auto refresh list/detail
      setTimeout(() => {
        handleRowClick(deliveryId);
        triggerRefresh();
      }, 1000);
    } catch (err: any) {
      console.error("Failed to retry delivery:", err);
      alert(err.response?.data?.message || "Failed to retry delivery");
    } finally {
      setIsRetrying(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setSelectedDelivery(null);
    setErrorDetail(null);
    setRetrySuccessMessage(null);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">H</div>
          <div className="title-desc">
            <h1>Hookfire Dashboard</h1>
            <p>Reliable webhook delivery engine & logs</p>
          </div>
        </div>

        <div className="actions-section">
          {/* Auto Refresh Toggle */}
          <div className="toggle-container">
            <span>Auto Refresh (5s)</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Refresh Button */}
          <button
            className="btn"
            onClick={triggerRefresh}
            disabled={isRefreshing}
          >
            <svg
              className={isRefreshing ? "animate-spin" : ""}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="metric-grid">
        <MetricCard
          title="Total Events"
          value={
            loadingMetrics && !metrics ? "..." : (metrics?.totalEvents ?? 0)
          }
          icon={
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Deliveries"
          value={
            loadingMetrics && !metrics ? "..." : (metrics?.totalDeliveries ?? 0)
          }
          icon={
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          }
        />
        <MetricCard
          title="Successful"
          value={
            loadingMetrics && !metrics
              ? "..."
              : (metrics?.successfulDeliveries ?? 0)
          }
          type="success"
          icon={
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="var(--success)"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <MetricCard
          title="Failed"
          value={
            loadingMetrics && !metrics
              ? "..."
              : (metrics?.failedDeliveries ?? 0)
          }
          type="danger"
          icon={
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="var(--danger)"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
        />
        <MetricCard
          title="Success Rate"
          value={
            loadingMetrics && !metrics
              ? "..."
              : `${(metrics?.successRate ?? 0).toFixed(1)}%`
          }
          type={(metrics?.successRate ?? 0) >= 95 ? "success" : "warning"}
          progressBar
          progressValue={metrics?.successRate ?? 0}
          icon={
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          }
        />
      </section>

      {/* Queue Observability Panel */}
      <section
        className="animate-fade-in"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Queue Observability (BullMQ)
          </h2>
          <span
            className="badge badge-pending"
            style={{ fontSize: "0.75rem" }}
          >
            Active Webhook Workers
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              label: "Active",
              value: queueMetrics?.active ?? 0,
              color: "var(--accent-secondary)",
            },
            {
              label: "Waiting",
              value: queueMetrics?.waiting ?? 0,
              color: "var(--warning)",
            },
            {
              label: "Delayed",
              value: queueMetrics?.delayed ?? 0,
              color: "var(--accent-primary)",
            },
            {
              label: "Completed",
              value: queueMetrics?.completed ?? 0,
              color: "var(--success)",
            },
            {
              label: "Failed (DLQ)",
              value: queueMetrics?.failed ?? 0,
              color: "var(--danger)",
            },
          ].map((q) => (
            <div
              key={q.label}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.015)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {q.label}
              </span>
              <span
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: q.color,
                }}
              >
                {q.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Table Section */}
      <section className="content-section">
        {/* Status Filters */}
        <div className="filter-bar">
          <div className="filter-tabs">
            {["ALL", "SUCCESS", "FAILED", "PENDING"].map((tab) => (
              <button
                key={tab}
                className={`filter-tab ${statusFilter === tab ? "active" : ""}`}
                onClick={() => handleFilterChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Server-side filter query active
          </span>
        </div>

        {/* Deliveries Table */}
        {loadingDeliveries && deliveries.length === 0 ? (
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
            <span>Loading deliveries...</span>
          </div>
        ) : (
          <DeliveryTable
            deliveries={deliveries}
            onRowClick={handleRowClick}
          />
        )}

        {/* Pagination Control */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onLimitChange={setItemsPerPage}
        />
      </section>

      {/* Detail Modal */}
      {(selectedDelivery || loadingDetail || errorDetail) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div
                className="modal-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  width: "100%",
                }}
              >
                <h2>Delivery Details</h2>
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
                    onClick={() => handleRetryDelivery(selectedDelivery.id)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying..." : "Retry Webhook (DLQ)"}
                  </button>
                )}
              </div>
              <button
                className="modal-close-btn"
                onClick={closeModal}
                title="Close Modal"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {/* Toast messages */}
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
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="rgba(255,255,255,0.05)"
                    />
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
                  {/* Grid details */}
                  <div className="grid-cols-2">
                    <div className="detail-item">
                      <span className="detail-label">Delivery ID</span>
                      <span className="detail-val mono-text">
                        {selectedDelivery.id}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Attempt Count</span>
                      <span className="detail-val">
                        {selectedDelivery.attemptCount}
                      </span>
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
                          ? new Date(
                              selectedDelivery.lastAttemptAt,
                            ).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Webhook Endpoint section */}
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

                  {/* Event details */}
                  <div>
                    <h3 className="modal-section-title">Event Information</h3>
                    <div
                      className="grid-cols-2"
                      style={{ marginBottom: "0.75rem" }}
                    >
                      <div className="detail-item">
                        <span className="detail-label">Event ID</span>
                        <span className="detail-val mono-text">
                          {selectedDelivery.eventId}
                        </span>
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

                  {/* Attempt Timeline */}
                  {selectedDelivery.attempts &&
                    selectedDelivery.attempts.length > 0 && (
                      <div>
                        <h3 className="modal-section-title">Attempt History</h3>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
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
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  Attempt #{attempt.attemptNumber}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
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

                  {/* Error Banner */}
                  {selectedDelivery.latestError && (
                    <div>
                      <h3 className="modal-section-title">Error Logs</h3>
                      <div className="error-banner">
                        {selectedDelivery.latestError}
                      </div>
                    </div>
                  )}

                  {/* Raw Payload code viewer */}
                  <div>
                    <h3 className="modal-section-title">Raw Event Payload</h3>
                    <pre className="code-viewer">
                      {JSON.stringify(
                        selectedDelivery.event?.payload || {},
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
