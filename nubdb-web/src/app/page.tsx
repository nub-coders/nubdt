import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      position: "relative",
      zIndex: 1,
      padding: "24px",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "56px",
        fontWeight: 700,
        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        letterSpacing: "-1px",
        marginBottom: "16px",
      }}>
        ⚡ NubDT
      </div>
      <p style={{
        fontSize: "18px",
        color: "var(--text-secondary)",
        maxWidth: "480px",
        lineHeight: 1.7,
        marginBottom: "40px",
      }}>
        A blazing-fast, lightweight database built with Zig.
        Manage your instances from a beautiful web console.
      </p>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/login" className="btn-primary" style={{ textDecoration: "none" }}>
          Sign In
        </Link>
        <Link href="/register" className="btn-ghost" style={{ textDecoration: "none" }}>
          Create Account
        </Link>
      </div>
      <div style={{ marginTop: "24px" }}>
        <Link href="/docs" style={{
          color: "#a78bfa", textDecoration: "none", fontSize: "14px",
          borderBottom: "1px solid rgba(167,139,250,0.3)", paddingBottom: "2px",
        }}>
          📚 View Documentation & API Reference →
        </Link>
      </div>
    </div>
  );
}
