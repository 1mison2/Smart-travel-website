import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Something went wrong while rendering this page.",
    };
  }

  componentDidCatch(error, info) {
    console.error("App render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #edf6ff 0%, #f8fafc 100%)",
          padding: "24px",
        }}>
          <div style={{
            width: "min(680px, 100%)",
            borderRadius: "24px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
            padding: "24px",
            color: "#0f172a",
          }}>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b" }}>
              Page Error
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "1.75rem" }}>This page crashed while loading.</h1>
            <p style={{ margin: "12px 0 0", color: "#475569", lineHeight: 1.6 }}>
              {this.state.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
