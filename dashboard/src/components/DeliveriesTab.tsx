import React from "react";
import type { Metrics, QueueMetrics, Delivery } from "../types";
import { MetricCard } from "./MetricCard";
import { QueueObservability } from "./QueueObservability";
import { DeliveryTable } from "./DeliveryTable";
import { Pagination } from "./Pagination";

interface DeliveriesTabProps {
  metrics: Metrics | null;
  loadingMetrics: boolean;
  queueMetrics: QueueMetrics | null;
  loadingDeliveries: boolean;
  deliveries: Delivery[];
  currentPage: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  totalItems: number;
  itemsPerPage: number;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onRowClick: (id: string) => void;
}

export const DeliveriesTab: React.FC<DeliveriesTabProps> = ({
  metrics,
  loadingMetrics,
  queueMetrics,
  loadingDeliveries,
  deliveries,
  currentPage,
  totalPages,
  hasPrevPage,
  hasNextPage,
  totalItems,
  itemsPerPage,
  statusFilter,
  onFilterChange,
  onPageChange,
  onLimitChange,
  onRowClick,
}) => {
  return (
    <>
      {/* Metrics Section */}
      <section className="metric-grid animate-fade-in">
        <MetricCard
          title="Total Events"
          value={loadingMetrics && !metrics ? "..." : (metrics?.totalEvents ?? 0)}
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Deliveries"
          value={loadingMetrics && !metrics ? "..." : (metrics?.totalDeliveries ?? 0)}
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
          value={loadingMetrics && !metrics ? "..." : (metrics?.successfulDeliveries ?? 0)}
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
          value={loadingMetrics && !metrics ? "..." : (metrics?.failedDeliveries ?? 0)}
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
          value={loadingMetrics && !metrics ? "..." : `${(metrics?.successRate ?? 0).toFixed(1)}%`}
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

      {/* Queue Observability Panel */}
      <QueueObservability queueMetrics={queueMetrics} />

      {/* Table Section */}
      <section className="content-section">
        {/* Status Filters */}
        <div className="filter-bar">
          <div className="filter-tabs">
            {["ALL", "SUCCESS", "FAILED", "PENDING"].map((tab) => (
              <button
                key={tab}
                className={`filter-tab ${statusFilter === tab ? "active" : ""}`}
                onClick={() => onFilterChange(tab)}
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
          <DeliveryTable deliveries={deliveries} onRowClick={onRowClick} />
        )}

        {/* Pagination Control */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onLimitChange={onLimitChange}
        />
      </section>
    </>
  );
};
