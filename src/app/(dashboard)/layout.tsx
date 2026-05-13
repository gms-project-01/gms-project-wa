"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/", label: "Chat de Teste", icon: "💬" },
  { href: "/items", label: "Itens Registrados", icon: "📋" },
  { href: "/conversations", label: "Conversas WA", icon: "📱" },
  { href: "/config", label: "Configurações", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "216px",
          flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 16px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderRadius: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🤖</span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "15px",
                color: "var(--accent-text)",
              }}
            >
              GMS Project - WA
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "var(--accent-dim)" : "transparent",
                  border: isActive ? "1px solid var(--accent-border)" : "1px solid transparent",
                  color: isActive ? "var(--accent)" : "var(--text-2)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "16px" }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 10px" }}>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{
              width: "100%",
              fontSize: "14px",
              padding: "9px 12px",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--error-dim)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "";
              (e.currentTarget as HTMLButtonElement).style.background = "";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "";
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: "216px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
