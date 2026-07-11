import React from "react";

interface TestDispatcherTabProps {
  testEventType: string;
  setTestEventType: (val: string) => void;
  testEventPayload: string;
  setTestEventPayload: (val: string) => void;
  isDispatching: boolean;
  dispatchSuccess: string | null;
  dispatchError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export const TestDispatcherTab: React.FC<TestDispatcherTabProps> = ({
  testEventType,
  setTestEventType,
  testEventPayload,
  setTestEventPayload,
  isDispatching,
  dispatchSuccess,
  dispatchError,
  onSubmit,
}) => {
  return (
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

      <form onSubmit={onSubmit} className="form-layout">
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
  );
};
