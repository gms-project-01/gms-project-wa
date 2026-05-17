"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/",              label: "Chat de Teste",    icon: "💬" },
  { href: "/items",         label: "Tasks",              icon: "📋" },
  { href: "/conversations", label: "Conversas WA",     icon: "📱" },
  { href: "/config",        label: "Configurações",    icon: "⚙️" },
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "224px",
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 14px 16px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "11px 14px",
            background: "var(--accent-dim)",
            border: "1px solid var(--accent-border)",
            borderRadius: "12px",
          }}>
            <span style={{ fontSize: "20px" }}>🌙</span>
            <span style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "14px",
              color: "var(--accent-text)",
              letterSpacing: "0.01em",
            }}>
              Lualy Project
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: "var(--font-sans)",
                  background: isActive ? "var(--accent-dim)" : "transparent",
                  border: isActive ? "1px solid var(--accent-border)" : "1px solid transparent",
                  color: isActive ? "var(--accent-text)" : "var(--text-2)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 10px 16px" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "9px 12px",
              borderRadius: "10px",
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--text-3)",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.color = "var(--error)";
              b.style.background = "var(--error-dim)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.color = "var(--text-3)";
              b.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: "15px" }}>🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: "224px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
