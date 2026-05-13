"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  phone: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  requisicao: "Requisição",
  anotacao: "Anotação",
  problema: "Problema",
  solucao: "Solução",
  feedback: "Feedback",
  duvida: "Dúvida",
  tarefa: "Tarefa",
  outro: "Outro",
};

const CATEGORY_COLORS: Record<string, string> = {
  requisicao: "#F0A020",
  anotacao: "#2DD4BF",
  problema: "#F87171",
  solucao: "#4ADE80",
  feedback: "#A78BFA",
  duvida: "#60A5FA",
  tarefa: "#FB923C",
  outro: "#7A7A9C",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "#F87171",
  em_andamento: "#F0A020",
  resolvido: "#4ADE80",
};

const ALL_STATUSES = ["aberto", "em_andamento", "resolvido"];

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/items?${params}`);
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [filterCategory, filterStatus, router]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    setUpdating(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("Excluir este item?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  const categories = [...new Set(items.map((i) => i.category))];

  const grouped = ALL_STATUSES.reduce<Record<string, Item[]>>((acc, s) => {
    acc[s] = items.filter((i) => i.status === s);
    return acc;
  }, {});

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--text-1)" }}>
                Itens Registrados
              </h1>
              <p style={{ color: "var(--text-2)", fontSize: "13px", marginTop: "2px" }}>
                {items.length} item{items.length !== 1 ? "s" : ""} no total
              </p>
            </div>
            <button className="btn-ghost" onClick={load} style={{ fontSize: "13px", padding: "7px 14px" }}>
              Atualizar
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              className="field-input"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ fontSize: "13px", maxWidth: "180px" }}
            >
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select
              className="field-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: "13px", maxWidth: "180px" }}
            >
              <option value="">Todos os status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kanban-style columns */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
          <div style={{ display: "flex", height: "100%", gap: "0", minWidth: "600px" }}>
            {ALL_STATUSES.map((status) => (
              <div
                key={status}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "1px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                {/* Column header */}
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: STATUS_COLORS[status], flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    background: "var(--surface-2)",
                    padding: "2px 7px",
                    borderRadius: "10px",
                    color: "var(--text-2)",
                  }}>
                    {grouped[status]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {loading && <p style={{ color: "var(--text-3)", fontSize: "12px", padding: "4px 6px" }}>Carregando...</p>}
                  {!loading && grouped[status]?.length === 0 && (
                    <p style={{ color: "var(--text-3)", fontSize: "12px", padding: "4px 6px" }}>Nenhum item</p>
                  )}
                  {grouped[status]?.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelected(selected?.id === item.id ? null : item)}
                      className="card"
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        borderColor: selected?.id === item.id ? "var(--accent-border)" : "var(--border)",
                        background: selected?.id === item.id ? "var(--accent-dim)" : "var(--surface)",
                        transition: "all 0.1s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: CATEGORY_COLORS[item.category] + "18",
                          color: CATEGORY_COLORS[item.category] ?? "var(--text-2)",
                          flexShrink: 0,
                        }}>
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        {item.phone && (
                          <span style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                            {item.phone.slice(-8)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", marginBottom: "4px", lineHeight: "1.4" }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — detail */}
      {selected && (
        <div style={{
          width: "340px",
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
              Detalhes
            </h2>
            <button
              className="btn-ghost"
              onClick={() => setSelected(null)}
              style={{ fontSize: "12px", padding: "5px 10px" }}
            >
              Fechar
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {/* Category & Status */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "8px",
                background: (CATEGORY_COLORS[selected.category] ?? "#7A7A9C") + "18",
                color: CATEGORY_COLORS[selected.category] ?? "var(--text-2)",
              }}>
                {CATEGORY_LABELS[selected.category] ?? selected.category}
              </span>
              <span style={{
                fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "8px",
                background: (STATUS_COLORS[selected.status] ?? "#7A7A9C") + "18",
                color: STATUS_COLORS[selected.status] ?? "var(--text-2)",
              }}>
                {STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>

            {/* Title */}
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", marginBottom: "10px", lineHeight: "1.5" }}>
              {selected.title}
            </p>

            {/* Content */}
            <div style={{
              padding: "12px 14px",
              background: "var(--surface-2)",
              borderRadius: "10px",
              fontSize: "13px",
              color: "var(--text-2)",
              lineHeight: "1.6",
              marginBottom: "16px",
              whiteSpace: "pre-wrap",
            }}>
              {selected.content}
            </div>

            {/* Meta */}
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {selected.phone && <span>Número: {selected.phone}</span>}
              <span>Criado: {formatDate(selected.createdAt)}</span>
            </div>

            {/* Change status */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Alterar status
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    disabled={selected.status === s || updating}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: `1px solid ${selected.status === s ? STATUS_COLORS[s] + "50" : "var(--border-2)"}`,
                      background: selected.status === s ? STATUS_COLORS[s] + "18" : "transparent",
                      color: selected.status === s ? STATUS_COLORS[s] : "var(--text-2)",
                      fontWeight: selected.status === s ? 700 : 400,
                      fontSize: "13px",
                      cursor: selected.status === s ? "default" : "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-body)",
                      transition: "all 0.15s",
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteItem(selected.id)}
              className="btn-ghost"
              style={{ width: "100%", fontSize: "13px", color: "var(--error)" }}
            >
              Excluir item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
