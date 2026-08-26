"use client";



export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-plus-jakarta), sans-serif",
      }}
    >
      {/* Offline Icon */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "var(--primary-transparent, rgba(192, 57, 43, 0.1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--primary, #C0392B)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--text-primary, #1A1A1A)",
          marginBottom: "0.75rem",
          lineHeight: 1.3,
        }}
      >
        You&apos;re Offline
      </h1>

      <p
        style={{
          fontSize: "1rem",
          color: "var(--text-secondary, #4A4A4A)",
          maxWidth: "400px",
          lineHeight: 1.6,
          marginBottom: "2rem",
        }}
      >
        It looks like you&apos;ve lost your internet connection. Check your
        Wi-Fi or mobile data and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          background: "var(--primary, #C0392B)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "12px",
          padding: "0.875rem 2rem",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.2s ease",
        }}
      >
        Try Again
      </button>

      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-muted, #717171)",
          marginTop: "1.5rem",
        }}
      >
        TTC Network
      </p>
    </div>
  );
}
