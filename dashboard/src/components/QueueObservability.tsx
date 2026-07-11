import React from "react";
import type { QueueMetrics } from "../types";

interface QueueObservabilityProps {
  queueMetrics: QueueMetrics | null;
}

export const QueueObservability: React.FC<QueueObservabilityProps> = ({ queueMetrics }) => {
  const items = [
    { label: "Active", value: queueMetrics?.active ?? 0, color: "var(--accent-secondary)" },
    { label: "Waiting", value: queueMetrics?.waiting ?? 0, color: "var(--warning)" },
    { label: "Delayed", value: queueMetrics?.delayed ?? 0, color: "var(--accent-primary)" },
    { label: "Completed", value: queueMetrics?.completed ?? 0, color: "var(--success)" },
    { label: "Failed (DLQ)", value: queueMetrics?.failed ?? 0, color: "var(--danger)" },
  ];

  return (
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Queue Observability (BullMQ)
        </h2>
        <span className="badge badge-pending" style={{ fontSize: "0.75rem" }}>
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
        {items.map((q) => (
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
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              {q.label}
            </span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: q.color }}>
              {q.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
