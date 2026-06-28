import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  type?: "default" | "success" | "danger" | "warning";
  progressBar?: boolean;
  progressValue?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  type = "default",
  progressBar = false,
  progressValue = 0,
}) => {
  const getProgressColor = () => {
    switch (type) {
      case "success":
        return "var(--success)";
      case "danger":
        return "var(--danger)";
      case "warning":
        return "var(--warning)";
      default:
        return "var(--accent-primary)";
    }
  };

  return (
    <div className="metric-card animate-fade-in">
      <div className="metric-header">
        <span>{title}</span>
        <div className="metric-icon-wrapper">{icon}</div>
      </div>
      <div className="metric-value">{value}</div>
      {progressBar && (
        <div className="metric-bar-container">
          <div
            className="metric-bar"
            style={{
              width: `${Math.min(100, Math.max(0, progressValue))}%`,
              backgroundColor: getProgressColor(),
              boxShadow: `0 0 8px ${getProgressColor()}`,
            }}
          />
        </div>
      )}
    </div>
  );
};
