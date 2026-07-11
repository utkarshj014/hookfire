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
import { useDemo } from "../hooks/useDemo";
import { DemoBanner } from "../components/DemoBanner";
import { DeliveriesTab } from "../components/DeliveriesTab";
import { EndpointsTab } from "../components/EndpointsTab";
import { TestDispatcherTab } from "../components/TestDispatcherTab";
import { DeliveryDetailModal } from "../components/DeliveryDetailModal";
import { EndpointModal } from "../components/EndpointModal";
import { SecretDisplayModal } from "../components/SecretDisplayModal";

export const Dashboard: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"deliveries" | "endpoints" | "test-event">("deliveries");

  // Custom Demo Hook
  const {
    isDemoRunning,
    elapsedSeconds,
    demoStartedBy,
    clickWarning,
    countdown,
    checkDemoStatus,
    triggerStartDemo,
  } = useDemo();

  // Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetail | null>(null);

  // Webhook Endpoints state
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [endpointModalOpen, setEndpointModalOpen] = useState(false);
  const [endpointToEdit, setEndpointToEdit] = useState<WebhookEndpoint | null>(null);

  // Webhook Endpoint Form State
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointSecret, setEndpointSecret] = useState("");
  const [endpointSubscriptions, setEndpointSubscriptions] = useState("");
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [endpointFormError, setEndpointFormError] = useState<string | null>(null);

  // Raw Secret Copy State (For create/rotate secret)
  const [secretDisplayOpen, setSecretDisplayOpen] = useState(false);
  const [displayedSecret, setDisplayedSecret] = useState("");
  const [secretDisplayTitle, setSecretDisplayTitle] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Test Event State
  const [testEventType, setTestEventType] = useState("user.created");
  const [testEventPayload, setTestEventPayload] = useState(
    JSON.stringify({ id: "usr_123", email: "alice@example.com", name: "Alice" }, null, 2)
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
        `/deliveries?page=${page}&limit=${limit}${statusParam}`
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
    const promises: Promise<any>[] = [checkDemoStatus()];
    if (activeTab === "deliveries") {
      promises.push(
        fetchMetrics(),
        fetchQueueMetrics(),
        fetchDeliveries(currentPage, itemsPerPage, statusFilter)
      );
    } else if (activeTab === "endpoints") {
      promises.push(fetchEndpoints());
    }
    await Promise.all(promises);
    setIsRefreshing(false);
  }, [
    activeTab,
    fetchMetrics,
    fetchQueueMetrics,
    fetchDeliveries,
    fetchEndpoints,
    checkDemoStatus,
    currentPage,
    itemsPerPage,
    statusFilter,
  ]);

  // Initial load & automatic pagination trigger
  useEffect(() => {
    checkDemoStatus();
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
    checkDemoStatus,
  ]);

  // Auto-refresh interval (only active on Deliveries tab)
  useEffect(() => {
    if (!autoRefresh || activeTab !== "deliveries") return;
    const delay = isDemoRunning ? 2000 : 5000;
    const interval = setInterval(() => {
      triggerRefresh();
    }, delay);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, triggerRefresh, isDemoRunning]);

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
      const response = await api.get<{ data: DeliveryDetail }>(`/deliveries/${id}`);
      setSelectedDelivery(response.data.data);
    } catch (err: any) {
      console.error("Error fetching delivery details:", err);
      setErrorDetail(err.response?.data?.message || "Failed to load delivery details");
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
      const response = await api.patch<{ data: WebhookEndpoint }>(`/endpoints/${endpoint.id}`, {
        isActive: !endpoint.isActive,
      });
      setEndpoints((prev) => prev.map((e) => (e.id === endpoint.id ? response.data.data : e)));
    } catch (err: any) {
      console.error("Failed to toggle endpoint status:", err);
      alert(err.response?.data?.message || "Failed to toggle endpoint status");
    }
  };

  // Rotate Secret Trigger
  const handleRotateSecret = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to rotate this endpoint's secret? The current secret will enter a 24-hour grace period, and the new secret will sign all future requests."
      )
    ) {
      return;
    }
    try {
      const response = await api.post<{ data: { rawSecret: string } }>(`/endpoints/${id}/rotate-secret`, {});
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
    if (!window.confirm("Are you sure you want to permanently delete this webhook endpoint? All subscription mappings will be destroyed.")) {
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
    const subTopics = endpoint.subscriptions?.map((s) => s.eventType).join(", ") || "";
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
        const response = await api.patch<{ data: WebhookEndpoint }>(`/endpoints/${endpointToEdit.id}`, {
          url: endpointUrl,
          subscriptions: subList,
        });
        setEndpoints((prev) => prev.map((e) => (e.id === endpointToEdit.id ? response.data.data : e)));
        setEndpointModalOpen(false);
      } else {
        const response = await api.post<{ data: WebhookEndpoint & { rawSecret: string } }>("/endpoints", {
          url: endpointUrl,
          secret: endpointSecret || undefined,
          subscriptions: subList,
        });
        setEndpoints((prev) => [response.data.data, ...prev]);
        setEndpointModalOpen(false);

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
          "An unexpected error occurred while saving the endpoint"
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
      setDispatchError("Invalid JSON payload syntax. Please verify JSON format.");
      setIsDispatching(false);
      return;
    }

    try {
      await api.post<{ success: boolean; message: string }>("/events", {
        eventType: testEventType,
        payload: parsedPayload,
      });

      setDispatchSuccess("Event successfully created and fanned out to active subscribers!");

      setTimeout(() => {
        handleTabChange("deliveries");
        setDispatchSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to dispatch event:", err);
      setDispatchError(err.response?.data?.message || "Failed to dispatch event. Make sure the API is active.");
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

  const closeModal = () => {
    setSelectedDelivery(null);
    setErrorDetail(null);
    setRetrySuccessMessage(null);
  };

  const onStartDemoClick = async () => {
    const success = await triggerStartDemo();
    if (success) {
      setAutoRefresh(true);
      handleTabChange("deliveries");
    }
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
          {([
            { id: "deliveries", label: "Deliveries" },
            { id: "endpoints", label: "Endpoints" },
            { id: "test-event", label: "Test Dispatcher" },
          ] as const).map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => handleTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="actions-section">
          <button
            className="btn btn-primary"
            style={{
              backgroundColor: isDemoRunning ? "rgba(139, 92, 246, 0.25)" : "var(--accent-primary)",
              borderColor: isDemoRunning ? "rgba(139, 92, 246, 0.4)" : "var(--accent-primary)",
              color: isDemoRunning ? "var(--text-secondary)" : "var(--text-primary)",
              cursor: isDemoRunning ? "not-allowed" : "pointer",
            }}
            onClick={onStartDemoClick}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: "4px" }}
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>{isDemoRunning ? `Demo Running (${countdown}s)` : "Run Demo"}</span>
          </button>

          {activeTab === "deliveries" && (
            <div className="toggle-container">
              <span>Auto Refresh {isDemoRunning ? "(2s)" : "(5s)"}</span>
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
            <button className="btn" onClick={triggerRefresh} disabled={isRefreshing}>
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

      {/* Public Demo Environment Banner */}
      <DemoBanner
        isDemoRunning={isDemoRunning}
        elapsedSeconds={elapsedSeconds}
        demoStartedBy={demoStartedBy}
        clickWarning={clickWarning}
      />

      {/* TABS BODY */}
      {activeTab === "deliveries" && (
        <DeliveriesTab
          metrics={metrics}
          loadingMetrics={loadingMetrics}
          queueMetrics={queueMetrics}
          loadingDeliveries={loadingDeliveries}
          deliveries={deliveries}
          currentPage={currentPage}
          totalPages={totalPages}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          statusFilter={statusFilter}
          onFilterChange={handleFilterChange}
          onPageChange={setCurrentPage}
          onLimitChange={setItemsPerPage}
          onRowClick={handleRowClick}
        />
      )}

      {activeTab === "endpoints" && (
        <EndpointsTab
          loadingEndpoints={loadingEndpoints}
          endpoints={endpoints}
          onRegisterClick={openCreateModal}
          onToggleStatus={handleToggleEndpoint}
          onEditClick={openEditModal}
          onRotateSecret={handleRotateSecret}
          onDeleteClick={handleDeleteEndpoint}
        />
      )}

      {activeTab === "test-event" && (
        <TestDispatcherTab
          testEventType={testEventType}
          setTestEventType={setTestEventType}
          testEventPayload={testEventPayload}
          setTestEventPayload={setTestEventPayload}
          isDispatching={isDispatching}
          dispatchSuccess={dispatchSuccess}
          dispatchError={dispatchError}
          onSubmit={handleDispatchEvent}
        />
      )}

      {/* Modular Modals */}
      <DeliveryDetailModal
        selectedDelivery={selectedDelivery}
        loadingDetail={loadingDetail}
        errorDetail={errorDetail}
        retrySuccessMessage={retrySuccessMessage}
        isRetrying={isRetrying}
        onClose={closeModal}
        onRetry={handleRetryDelivery}
      />

      <EndpointModal
        isOpen={endpointModalOpen}
        endpointToEdit={endpointToEdit}
        url={endpointUrl}
        setUrl={setEndpointUrl}
        secret={endpointSecret}
        setSecret={setEndpointSecret}
        subscriptions={endpointSubscriptions}
        setSubscriptions={setEndpointSubscriptions}
        error={endpointFormError}
        isSaving={isSavingEndpoint}
        onClose={() => setEndpointModalOpen(false)}
        onSave={handleSaveEndpoint}
      />

      <SecretDisplayModal
        isOpen={secretDisplayOpen}
        title={secretDisplayTitle}
        secret={displayedSecret}
        copied={copiedSecret}
        onCopy={copySecretToClipboard}
        onClose={() => setSecretDisplayOpen(false)}
      />
    </div>
  );
};
