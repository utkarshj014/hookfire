import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type {
  Metrics,
  Delivery,
  DeliveryDetail,
  PaginatedResponse,
  QueueMetrics,
  WebhookEndpoint,
} from "../types";
import { MetricCard } from "../components/MetricCard";
import { DeliveryTable } from "../components/DeliveryTable";
import { Pagination } from "../components/Pagination";

export const Dashboard: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "deliveries" | "endpoints" | "test-event"
  >("deliveries");

  // Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryDetail | null>(null);

  // Webhook Endpoints state
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [endpointModalOpen, setEndpointModalOpen] = useState(false);
  const [endpointToEdit, setEndpointToEdit] = useState<WebhookEndpoint | null>(
    null,
  );

  // Webhook Endpoint Form State
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointSecret, setEndpointSecret] = useState("");
  const [endpointSubscriptions, setEndpointSubscriptions] = useState("");
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [endpointFormError, setEndpointFormError] = useState<string | null>(
    null,
  );

  // Raw Secret Copy State (For create/rotate secret)
  const [secretDisplayOpen, setSecretDisplayOpen] = useState(false);
  const [displayedSecret, setDisplayedSecret] = useState("");
  const [secretDisplayTitle, setSecretDisplayTitle] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Test Event State
  const [testEventType, setTestEventType] = useState("user.created");
  const [testEventPayload, setTestEventPayload] = useState(
    JSON.stringify(
      { id: "usr_123", email: "alice@example.com", name: "Alice" },
      null,
      2,
    ),
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

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
  const [retrySuccessMessage, setRetrySuccessMessage] = useState<string | null>(
    null,
  );

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
  const fetchDeliveries = useCallback(
    async (page: number, limit: number, status: string) => {
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
    },
    [],
  );

  // Fetch endpoints API
  const fetchEndpoints = useCallback(async () => {
    try {
      setLoadingEndpoints(true);
      const response = await api.get<{ data: WebhookEndpoint[] }>("/endpoints");
      setEndpoints(response.data.data);
    } catch (err) {
      console.error("Error fetching webhooks:", err);
    } finally {
      setLoadingEndpoints(false);
    }
  }, []);

  // Consolidated refresh trigger
  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (activeTab === "deliveries") {
      await Promise.all([
        fetchMetrics(),
        fetchQueueMetrics(),
        fetchDeliveries(currentPage, itemsPerPage, statusFilter),
      ]);
    } else if (activeTab === "endpoints") {
      await fetchEndpoints();
    }
    setIsRefreshing(false);
  }, [
    activeTab,
    fetchMetrics,
    fetchQueueMetrics,
    fetchDeliveries,
    fetchEndpoints,
    currentPage,
    itemsPerPage,
    statusFilter,
  ]);

  // Initial load & automatic pagination trigger
  useEffect(() => {
    if (activeTab === "deliveries") {
      fetchMetrics();
      fetchQueueMetrics();
      fetchDeliveries(currentPage, itemsPerPage, statusFilter);
    } else if (activeTab === "endpoints") {
      fetchEndpoints();
    }
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    statusFilter,
    fetchMetrics,
    fetchQueueMetrics,
    fetchDeliveries,
    fetchEndpoints,
  ]);

  // Auto-refresh interval (only active on Deliveries tab)
  useEffect(() => {
    if (!autoRefresh || activeTab !== "deliveries") return;
    const interval = setInterval(() => {
      triggerRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, triggerRefresh]);

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
      const response = await api.post<{ message: string }>(
        `/dlq/${deliveryId}/retry`,
      );
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

  // Toggle Endpoint Status (Active/Inactive)
  const handleToggleEndpoint = async (endpoint: WebhookEndpoint) => {
    try {
      const response = await api.patch<{ data: WebhookEndpoint }>(
        `/endpoints/${endpoint.id}`,
        {
          isActive: !endpoint.isActive,
        },
      );
      setEndpoints((prev) =>
        prev.map((e) => (e.id === endpoint.id ? response.data.data : e)),
      );
    } catch (err: any) {
      console.error("Failed to toggle endpoint status:", err);
      alert(err.response?.data?.message || "Failed to toggle endpoint status");
    }
  };

  // Rotate Secret Trigger
  const handleRotateSecret = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to rotate this endpoint's secret? The current secret will enter a 24-hour grace period, and the new secret will sign all future requests.",
      )
    ) {
      return;
    }
    try {
      const response = await api.post<{ data: { rawSecret: string } }>(
        `/endpoints/${id}/rotate-secret`,
        {},
      );
      setDisplayedSecret(response.data.data.rawSecret);
      setSecretDisplayTitle("Secret Rotated Successfully");
      setSecretDisplayOpen(true);
      setCopiedSecret(false);
      fetchEndpoints();
    } catch (err: any) {
      console.error("Failed to rotate secret:", err);
      alert(err.response?.data?.message || "Failed to rotate secret");
    }
  };

  // Delete Endpoint Trigger
  const handleDeleteEndpoint = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this webhook endpoint? All subscription mappings will be destroyed.",
      )
    ) {
      return;
    }
    try {
      await api.delete(`/endpoints/${id}`);
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      console.error("Failed to delete endpoint:", err);
      alert(err.response?.data?.message || "Failed to delete endpoint");
    }
  };

  // Open Endpoint Modal for Create
  const openCreateModal = () => {
    setEndpointToEdit(null);
    setEndpointUrl("");
    setEndpointSecret("");
    setEndpointSubscriptions("user.created, user.updated");
    setEndpointFormError(null);
    setEndpointModalOpen(true);
  };

  // Open Endpoint Modal for Edit
  const openEditModal = (endpoint: WebhookEndpoint) => {
    setEndpointToEdit(endpoint);
    setEndpointUrl(endpoint.url);
    setEndpointSecret("");
    const subTopics =
      endpoint.subscriptions?.map((s) => s.eventType).join(", ") || "";
    setEndpointSubscriptions(subTopics);
    setEndpointFormError(null);
    setEndpointModalOpen(true);
  };

  // Save Endpoint Handler
  const handleSaveEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEndpoint(true);
    setEndpointFormError(null);

    const subList = endpointSubscriptions
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subList.length === 0) {
      setEndpointFormError("At least one subscription event type is required.");
      setIsSavingEndpoint(false);
      return;
    }

    try {
      if (endpointToEdit) {
        // Edit Endpoint URL/Subscriptions
        const response = await api.patch<{ data: WebhookEndpoint }>(
          `/endpoints/${endpointToEdit.id}`,
          {
            url: endpointUrl,
            subscriptions: subList,
          },
        );
        setEndpoints((prev) =>
          prev.map((e) =>
            e.id === endpointToEdit.id ? response.data.data : e,
          ),
        );
        setEndpointModalOpen(false);
      } else {
        // Create Endpoint
        const response = await api.post<{
          data: WebhookEndpoint & { rawSecret: string };
        }>("/endpoints", {
          url: endpointUrl,
          secret: endpointSecret || undefined,
          subscriptions: subList,
        });
        setEndpoints((prev) => [response.data.data, ...prev]);
        setEndpointModalOpen(false);

        // Show new secret to user
        setDisplayedSecret(response.data.data.rawSecret);
        setSecretDisplayTitle("Webhook Endpoint Registered");
        setSecretDisplayOpen(true);
        setCopiedSecret(false);
      }
    } catch (err: any) {
      console.error("Failed to save webhook endpoint:", err);
      setEndpointFormError(
        err.response?.data?.errors?.join(", ") ||
          err.response?.data?.message ||
          "An unexpected error occurred while saving the endpoint",
      );
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  // Dispatch Test Event Handler
  const handleDispatchEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setDispatchSuccess(null);
    setDispatchError(null);

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(testEventPayload);
    } catch (err) {
      setDispatchError(
        "Invalid JSON payload syntax. Please verify JSON format.",
      );
      setIsDispatching(false);
      return;
    }

    try {
      await api.post<{ success: boolean; message: string }>("/events", {
        eventType: testEventType,
        payload: parsedPayload,
      });

      setDispatchSuccess(
        "Event successfully created and fanned out to active subscribers!",
      );

      // Auto redirect to deliveries tab after short delay
      setTimeout(() => {
        handleTabChange("deliveries");
        setDispatchSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to dispatch event:", err);
      setDispatchError(
        err.response?.data?.message ||
          "Failed to dispatch event. Make sure the API is active.",
      );
    } finally {
      setIsDispatching(false);
    }
  };

  // Copy Secret helper
  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(displayedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleTabChange = (tab: "deliveries" | "endpoints" | "test-event") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  // Close modals
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

        {/* Navigation Tabs */}
        <div className="tabs-navigation">
          <button
            className={`tab-btn ${activeTab === "deliveries" ? "active" : ""}`}
            onClick={() => handleTabChange("deliveries")}
          >
            Deliveries
          </button>
          <button
            className={`tab-btn ${activeTab === "endpoints" ? "active" : ""}`}
            onClick={() => handleTabChange("endpoints")}
          >
            Endpoints
          </button>
          <button
            className={`tab-btn ${activeTab === "test-event" ? "active" : ""}`}
            onClick={() => handleTabChange("test-event")}
          >
            Test Dispatcher
          </button>
        </div>

        <div className="actions-section">
          {activeTab === "deliveries" && (
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
          )}

          {/* Refresh Button */}
          {(activeTab === "deliveries" || activeTab === "endpoints") && (
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
          )}
        </div>
      </header>

      {/* TABS BODY */}

      {/* 1. DELIVERIES TAB */}
      {activeTab === "deliveries" && (
        <>
          {/* Metrics Section */}
          <section className="metric-grid animate-fade-in">
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
                loadingMetrics && !metrics
                  ? "..."
                  : (metrics?.totalDeliveries ?? 0)
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
              <span
                style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}
              >
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
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.05)"
                  />
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
        </>
      )}

      {/* 2. ENDPOINTS TAB */}
      {activeTab === "endpoints" && (
        <section className="content-section animate-fade-in">
          <div className="filter-bar" style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Webhook Endpoints
            </h2>
            <button className="btn btn-primary" onClick={openCreateModal}>
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
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="rgba(255,255,255,0.05)"
                />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>Loading endpoints...</span>
            </div>
          ) : endpoints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">
                No webhook endpoints registered
              </div>
              <div className="empty-state-desc">
                Configure target servers to start fanning out events matching
                event subscriptions.
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={openCreateModal}
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
                    <th style={{ width: "120px", textAlign: "center" }}>
                      Status
                    </th>
                    <th style={{ width: "240px", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint) => (
                    <tr key={endpoint.id} style={{ cursor: "default" }}>
                      <td style={{ verticalAlign: "middle" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {endpoint.url}
                          </span>
                          <span
                            className="mono-text"
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            ID: {endpoint.id}
                          </span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.35rem",
                          }}
                        >
                          {endpoint.subscriptions &&
                          endpoint.subscriptions.length > 0 ? (
                            endpoint.subscriptions.map((sub, idx) => (
                              <span key={idx} className="event-tag">
                                {sub.eventType}
                              </span>
                            ))
                          ) : (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              No subscriptions
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{ textAlign: "center", verticalAlign: "middle" }}
                      >
                        <div
                          style={{ display: "flex", justifyContent: "center" }}
                        >
                          <label className="switch" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={endpoint.isActive}
                              onChange={() => handleToggleEndpoint(endpoint)}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </td>
                      <td
                        style={{ textAlign: "right", verticalAlign: "middle" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.375rem 0.625rem",
                            }}
                            onClick={() => openEditModal(endpoint)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.375rem 0.625rem",
                            }}
                            onClick={() => handleRotateSecret(endpoint.id)}
                            title="Rotate signing secret"
                          >
                            Rotate Key
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.375rem 0.625rem",
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.2)",
                            }}
                            onClick={() => handleDeleteEndpoint(endpoint.id)}
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
      )}

      {/* 3. TEST EVENT DISPATCHER TAB */}
      {activeTab === "test-event" && (
        <section
          className="content-section animate-fade-in"
          style={{ maxWidth: "800px", margin: "0 auto" }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--border-color)",
              padding: "2rem",
              paddingBottom: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Dispatch Test Webhook Event
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                marginTop: "0.25rem",
              }}
            >
              Manually trigger events to verify your endpoints can successfully
              ingest signatures and payloads.
            </p>
          </div>

          <form onSubmit={handleDispatchEvent} className="form-layout">
            {dispatchSuccess && (
              <div className="success-banner" style={{ margin: "0 0 1rem 0" }}>
                {dispatchSuccess}
              </div>
            )}
            {dispatchError && (
              <div className="error-banner" style={{ margin: "0 0 1rem 0" }}>
                {dispatchError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Event Type</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. user.created, invoice.paid"
                value={testEventType}
                onChange={(e) => setTestEventType(e.target.value)}
                required
              />
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.375rem",
                  flexWrap: "wrap",
                }}
              >
                {["user.created", "payment.succeeded", "order.shipped"].map(
                  (item) => (
                    <button
                      type="button"
                      key={item}
                      className="btn btn-sm"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => setTestEventType(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">JSON Payload</label>
              <textarea
                className="form-textarea mono-text"
                rows={8}
                value={testEventPayload}
                onChange={(e) => setTestEventPayload(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isDispatching}
              style={{ width: "100%", padding: "0.875rem" }}
            >
              {isDispatching ? "Dispatching Event..." : "Dispatch Event"}
            </button>
          </form>
        </section>
      )}

      {/* Modals */}

      {/* A. Detail Modal */}
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

      {/* B. Endpoint Register/Edit Modal */}
      {endpointModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setEndpointModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-header">
              <h2>
                {endpointToEdit ? "Edit Endpoint" : "Register Webhook Endpoint"}
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => setEndpointModalOpen(false)}
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
            <form onSubmit={handleSaveEndpoint}>
              <div className="modal-body">
                {endpointFormError && (
                  <div
                    className="error-banner"
                    style={{ marginBottom: "1rem" }}
                  >
                    {endpointFormError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Endpoint URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://your-api.com/webhooks"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    required
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    The target HTTP URL where webhook POST request events will
                    be delivered.
                  </span>
                </div>

                {!endpointToEdit && (
                  <div className="form-group">
                    <label className="form-label">
                      Signing Secret (Optional)
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Leave blank to auto-generate a secure key"
                      value={endpointSecret}
                      onChange={(e) => setEndpointSecret(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Subscribed Event Types (Comma-separated)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="user.created, payment.succeeded"
                    value={endpointSubscriptions}
                    onChange={(e) => setEndpointSubscriptions(e.target.value)}
                    required
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Only events matching these topics will trigger webhook
                    delivery to this URL.
                  </span>
                </div>
              </div>
              <div
                className="modal-footer"
                style={{
                  borderTop: "1px solid var(--border-color)",
                  padding: "1rem 1.5rem",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEndpointModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingEndpoint}
                >
                  {isSavingEndpoint
                    ? "Saving..."
                    : endpointToEdit
                      ? "Save Changes"
                      : "Register Endpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Secret Display Modal (One-time viewing) */}
      {secretDisplayOpen && (
        <div
          className="modal-overlay"
          onClick={() => setSecretDisplayOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", textAlign: "center" }}
          >
            <div className="modal-header">
              <h2>{secretDisplayTitle}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setSecretDisplayOpen(false)}
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
            <div
              className="modal-body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  color: "var(--text-primary)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "0.875rem",
                }}
              >
                <strong style={{ color: "var(--accent-primary)" }}>
                  Important Security Warning:
                </strong>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  Please copy the signing secret below. For security reasons,{" "}
                  <strong>it will not be displayed again</strong>. Use this
                  secret key on your server to verify Hookfire signatures
                  (`X-Hookfire-Signature` header).
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  width: "100%",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="mono-text"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    textAlign: "left",
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                    color: "var(--accent-secondary)",
                  }}
                >
                  {displayedSecret}
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={copySecretToClipboard}
                  style={{
                    border: "none",
                    borderRadius: 0,
                    borderLeft: "1px solid var(--border-color)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                  }}
                >
                  {copiedSecret ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div
              className="modal-footer"
              style={{
                borderTop: "1px solid var(--border-color)",
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                style={{ minWidth: "120px" }}
                onClick={() => setSecretDisplayOpen(false)}
              >
                I've Saved It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
