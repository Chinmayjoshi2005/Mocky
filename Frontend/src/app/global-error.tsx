"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#f4f6fb",
        color: "#0f172a",
        margin: 0,
        padding: "2rem",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: "560px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "1.5rem",
          padding: "2.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          textAlign: "center"
        }}>
          <div style={{
            display: "inline-flex",
            padding: "0.75rem 1.25rem",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            fontWeight: "bold",
            marginBottom: "1.5rem"
          }}>
            Critical System Error
          </div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "800", margin: "0 0 1rem 0", color: "#0f172a" }}>
            Application Error
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: "1.5", marginBottom: "2rem" }}>
            A critical error occurred while rendering the root application layout.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
