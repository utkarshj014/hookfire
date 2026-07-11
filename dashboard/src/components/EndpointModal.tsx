import React from "react";
import type { WebhookEndpoint } from "../types";
import { Modal } from "./Modal";

interface EndpointModalProps {
  isOpen: boolean;
  endpointToEdit: WebhookEndpoint | null;
  url: string;
  setUrl: (val: string) => void;
  secret: string;
  setSecret: (val: string) => void;
  subscriptions: string;
  setSubscriptions: (val: string) => void;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const EndpointModal: React.FC<EndpointModalProps> = ({
  isOpen,
  endpointToEdit,
  url,
  setUrl,
  secret,
  setSecret,
  subscriptions,
  setSubscriptions,
  error,
  isSaving,
  onClose,
  onSave,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={endpointToEdit ? "Edit Endpoint" : "Register Webhook Endpoint"}
      maxWidth="550px"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="endpoint-form"
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : endpointToEdit ? "Save Changes" : "Register Endpoint"}
          </button>
        </>
      }
    >
      <form onSubmit={onSave} id="endpoint-form">
        {error && (
          <div className="error-banner" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Endpoint URL</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://your-api.com/webhooks"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            The target HTTP URL where webhook POST request events will be delivered.
          </span>
        </div>

        {!endpointToEdit && (
          <div className="form-group">
            <label className="form-label">Signing Secret (Optional)</label>
            <input
              type="password"
              className="form-input"
              placeholder="Leave blank to auto-generate a secure key"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Subscribed Event Types (Comma-separated)</label>
          <input
            type="text"
            className="form-input"
            placeholder="user.created, payment.succeeded"
            value={subscriptions}
            onChange={(e) => setSubscriptions(e.target.value)}
            required
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Only events matching these topics will trigger webhook delivery to this URL.
          </span>
        </div>
      </form>
    </Modal>
  );
};
