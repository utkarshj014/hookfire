import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  totalItems: number;
  itemsPerPage: number;
  onLimitChange?: (limit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  hasPrevPage,
  hasNextPage,
  totalItems,
  itemsPerPage,
  onLimitChange,
}) => {
  if (totalPages <= 1 && totalItems === 0) return null;

  const startRange = (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        {totalItems > 0 ? (
          <>
            Showing <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{startRange}</span> to{" "}
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{endRange}</span> of{" "}
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{totalItems}</span> deliveries
          </>
        ) : (
          "No deliveries"
        )}
      </div>

      <div className="pagination-controls">
        {onLimitChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", minWidth: "80px", textAlign: "center" }}>
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          title="Next Page"
          aria-label="Next Page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};
