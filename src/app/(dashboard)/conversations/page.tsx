"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: string;
  content: string;
  tokens?: number | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  phone: string | null;
  messages: Message[];
  updatedAt: string;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations(phone?: string) {
    setLoading(true);
    const url = phone ? `/api/conversations?phone=${encodeURIComponent(phone)}` : "/api/conversations";
    const res = await fetch(url);
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setConversations(data);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadConversations(search.trim() || undefined);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitials(phone: string | null) {
    if (!phone) return "?";
    return phone.slice(-2);
  }

  function lastMessage(conv: Conversation) {
    const msgs = conv.messages;
    return msgs[msgs.length - 1]?.content ?? "";
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Lista */}
      <div
        style={{
          width: "320px",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 16px 12px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: "12px",
            }}
          >
            Conversas WA
          </h1>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              className="field-input"
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: "13px" }}
            />
            <button className="btn-ghost" type="submit" style={{ flexShrink: 0, padding: "8px 14px", fontSize: "13px" }}>
              Buscar
            </button>
          </form>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "20px 16px", color: "var(--text-3)", fontSize: "13px" }}>
              Carregando...
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: "20px 16px", color: "var(--text-3)", fontSize: "13px" }}>
              Nenhuma conversa encontrada
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelected(conv)}
              style={{
                padding: "14px 16px",
                cursor: "pointer",
                borderLeft: selected?.id === conv.id ? "3px solid var(--accent)" : "3px solid transparent",
                background: selected?.id === conv.id ? "var(--accent-dim)" : "transparent",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "background 0.1s",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  flexShrink: 0,
                }}
              >
                {getInitials(conv.phone)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
                    {conv.phone ?? "Desconhecido"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lastMessage(conv)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              fontSize: "14px",
            }}
          >
            Selecione uma conversa para ver as mensagens
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-2)",
                }}
              >
                {getInitials(selected.phone)}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-1)" }}>
                  {selected.phone ?? "Desconhecido"}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-3)" }}>
                  {selected.messages.length} mensagens
                </p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {selected.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.role === "user" ? "var(--surface-3)" : "var(--ai-dim)",
                      border: msg.role === "user" ? "1px solid var(--border-2)" : "1px solid var(--ai-border)",
                      color: "var(--text-1)",
                      fontSize: "13px",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-3)",
                      marginTop: "3px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatDate(msg.createdAt)}
                    {msg.role === "assistant" && msg.tokens ? ` · ${msg.tokens} tokens` : ""}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
