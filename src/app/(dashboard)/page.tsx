"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokens?: number | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("conversationId");
    if (saved) {
      setConversationId(saved);
      loadHistory(saved);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadHistory(convId: string) {
    const res = await fetch("/api/chat");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    const conv = data.find((c: { id: string; messages: Message[] }) => c.id === convId);
    if (conv) setMessages(conv.messages);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg.content, conversationId }),
    });

    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) { setLoading(false); return; }

    const data = await res.json();
    if (data.conversationId) {
      setConversationId(data.conversationId);
      localStorage.setItem("conversationId", data.conversationId);
    }
    if (data.message) setMessages((prev) => [...prev, data.message]);
    setLoading(false);
  }

  function handleNewConversation() {
    localStorage.removeItem("conversationId");
    setConversationId(null);
    setMessages([]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 28px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-1)",
            }}
          >
            Chat de Teste
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "13px", marginTop: "2px" }}>
            Teste o agente diretamente pelo navegador
          </p>
        </div>
        <button className="btn-ghost" onClick={handleNewConversation} style={{ fontSize: "13px", padding: "8px 16px" }}>
          Nova conversa
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: "14px" }}>
            Envie uma mensagem para começar
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-fade-up"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--surface-3)" : "var(--ai-dim)",
                border: msg.role === "user" ? "1px solid var(--border-2)" : "1px solid var(--ai-border)",
                color: "var(--text-1)",
                fontSize: "14px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
            {msg.role === "assistant" && msg.tokens && (
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px", fontFamily: "var(--font-sans)" }}>
                {msg.tokens} tokens
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "16px 16px 16px 4px",
                background: "var(--ai-dim)",
                border: "1px solid var(--ai-border)",
              }}
            >
              <div className="dot-pulse" style={{ display: "flex", gap: "4px" }}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)" }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: "12px" }}>
          <input
            className="field-input"
            type="text"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            className="btn-primary"
            type="submit"
            disabled={loading || !input.trim()}
            style={{ flexShrink: 0, padding: "10px 20px" }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
