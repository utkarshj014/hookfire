import React from "react";

interface DemoBannerProps {
  isDemoRunning: boolean;
  elapsedSeconds: number;
  demoStartedBy: string | null;
  clickWarning: string | null;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  isDemoRunning,
  elapsedSeconds,
  demoStartedBy,
  clickWarning,
}) => {
  return (
    <div className="demo-banner animate-fade-in">
      <div className="demo-banner-content">
        <div className="demo-banner-left">
          <span className="demo-emoji">🚀</span>
          <div className="demo-banner-text">
            <h3>Public Demo Environment</h3>
            <p>
              This is a shared demonstration instance. Running the simulation
              affects all active visitors.
            </p>
          </div>
        </div>

        {isDemoRunning ? (
          <div className="demo-status-card">
            <div className="demo-status-header">
              <span className="status-dot running">●</span>
              <span className="status-text">Running</span>
            </div>
            <div className="demo-status-info">
              <span>Started {elapsedSeconds}s ago</span>
              <span className="divider">•</span>
              <span>Started by {demoStartedBy || "Visitor"}</span>
            </div>
          </div>
        ) : (
          <div className="demo-status-card idle">
            <div className="demo-status-header">
              <span className="status-dot">●</span>
              <span className="status-text">Idle</span>
            </div>
            <div className="demo-status-info">
              <span>Ready to start a simulation</span>
            </div>
          </div>
        )}
      </div>

      {clickWarning && (
        <div className="demo-banner-warning animate-fade-in">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginRight: "6px" }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>{clickWarning}</span>
        </div>
      )}
    </div>
  );
};
