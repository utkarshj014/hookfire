import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { Metrics, Delivery, DeliveryDetail, PaginatedResponse } from "../types";
import { MetricCard } from "../components/MetricCard";
import { DeliveryTable } from "../components/DeliveryTable";
import { Pagination } from "../components/Pagination";

export const Dashboard: React.FC = () => {
  // Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetail | null>(null);

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

  // Loading States
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Fetch metrics API
  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const response = await api.get<{ success: boolean; data: Metrics }>("/metrics");
      if (response.data?.success) {
        setMetrics(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch deliveries API
  const fetchDeliveries = useCallback(async (page: number, limit: number) => {
    try {
      setLoadingDeliveries(true);
      const response = await api.get<PaginatedResponse<Delivery>>(
        `/deliveries?page=${page}&limit=${limit}`
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
    await Promise.all([fetchMetrics(), fetchDeliveries(currentPage, itemsPerPage)]);
    setIsRefreshing(false);
  }, [fetchMetrics, fetchDeliveries, currentPage, itemsPerPage]);

  // Initial load & automatic pagination trigger
  useEffect(() => {
    fetchMetrics();
    fetchDeliveries(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, fetchMetrics, fetchDeliveries]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      triggerRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, triggerRefresh]);

  // Fetch delivery detail on-demand
  const handleRowClick = async (id: string) => {
    try {
      setLoadingDetail(true);
      setErrorDetail(null);
      const response = await api.get<DeliveryDetail>(`/deliveries/${id}`);
      setSelectedDelivery(response.data);
    } catch (err: any) {
      console.error("Error fetching delivery details:", err);
      setErrorDetail(err.response?.data?.message || "Failed to load delivery details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setSelectedDelivery(null);
    setErrorDetail(null);
  };

  // Local Filter Logic
  const filteredDeliveries = deliveries.filter((d) => {
    if (statusFilter === "ALL") return true;
    return d.status.toUpperCase() === statusFilter;
  });

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
          value={loadingMetrics && !metrics ? "..." : metrics?.totalEvents ?? 0}
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Deliveries"
          value={loadingMetrics && !metrics ? "..." : metrics?.totalDeliveries ?? 0}
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          }
        />
        <MetricCard
          title="Successful"
          value={loadingMetrics && !metrics ? "..." : metrics?.successfulDeliveries ?? 0}
          type="success"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--success)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <MetricCard
          title="Failed"
          value={loadingMetrics && !metrics ? "..." : metrics?.failedDeliveries ?? 0}
          type="danger"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24">
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
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          }
        />
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
                onClick={() => setStatusFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Showing local status page filters
          </span>
        </div>

        {/* Deliveries Table */}
        {loadingDeliveries && deliveries.length === 0 ? (
          <div className="loader-container">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="3">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.05)" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span>Loading deliveries...</span>
          </div>
        ) : (
          <DeliveryTable
            deliveries={filteredDeliveries}
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
              <div className="modal-title">
                <h2>Delivery Details</h2>
                {selectedDelivery && (
                  <span className={`badge ${selectedDelivery.status.toUpperCase() === "SUCCESS" ? "badge-success" : "badge-failed"}`}>
                    {selectedDelivery.status}
                  </span>
                )}
              </div>
              <button className="modal-close-btn" onClick={closeModal} title="Close Modal">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {loadingDetail ? (
                <div className="loader-container">
                  <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="3">
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
                  {/* Grid details */}
                  <div className="grid-cols-2">
                    <div className="detail-item">
                      <span className="detail-label">Delivery ID</span>
                      <span className="detail-val mono-text">{selectedDelivery.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Attempts</span>
                      <span className="detail-val">{selectedDelivery.attempts}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created At</span>
                      <span className="detail-val">{new Date(selectedDelivery.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Updated At</span>
                      <span className="detail-val">{new Date(selectedDelivery.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Webhook Endpoint section */}
                  <div>
                    <h3 className="modal-section-title">Webhook Endpoint</h3>
                    <div className="detail-item">
                      <span className="detail-label">Target URL</span>
                      <span className="detail-val mono-text" style={{ color: "var(--accent-secondary)" }}>
                        {selectedDelivery.endpoint?.url || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Event details */}
                  <div>
                    <h3 className="modal-section-title">Event Information</h3>
                    <div className="grid-cols-2" style={{ marginBottom: "0.75rem" }}>
                      <div className="detail-item">
                        <span className="detail-label">Event ID</span>
                        <span className="detail-val mono-text">{selectedDelivery.eventId}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Event Type</span>
                        <span className="detail-val mono-text" style={{ color: "var(--accent-primary)" }}>
                          {selectedDelivery.event?.eventType || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {selectedDelivery.errorMessage && (
                    <div>
                      <h3 className="modal-section-title">Error Logs</h3>
                      <div className="error-banner">
                        {selectedDelivery.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Raw Payload code viewer */}
                  <div>
                    <h3 className="modal-section-title">Raw Event Payload</h3>
                    <pre className="code-viewer">
                      {JSON.stringify(selectedDelivery.event?.payload || {}, null, 2)}
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
