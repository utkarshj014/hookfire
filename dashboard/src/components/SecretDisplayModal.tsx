import React from "react";
import { Modal } from "./Modal";

interface SecretDisplayModalProps {
  isOpen: boolean;
  title: string;
  secret: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export const SecretDisplayModal: React.FC<SecretDisplayModalProps> = ({
  isOpen,
  title,
  secret,
  copied,
  onCopy,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="500px"
      footer={
        <button
          type="button"
          className="btn btn-primary"
          style={{ minWidth: "120px" }}
          onClick={onClose}
        >
          I've Saved It
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
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
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: "0.8125rem" }}>
            Please copy the signing secret below. For security reasons,{" "}
            <strong>it will not be displayed again</strong>. Use this secret key
            on your server to verify Hookfire signatures (`X-Hookfire-Signature` header).
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
            {secret}
          </div>
          <button
            type="button"
            className="btn"
            onClick={onCopy}
            style={{
              border: "none",
              borderRadius: 0,
              borderLeft: "1px solid var(--border-color)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              padding: "0.75rem 1rem",
              cursor: "pointer",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
