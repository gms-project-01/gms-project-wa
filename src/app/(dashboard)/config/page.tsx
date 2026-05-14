"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Config {
  id?: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  historyLimit: number;
  enabled: boolean;
  allowedPhones: string;
  evolutionUrl: string;
  evolutionApiKey: string;
  instanceId: string;
  aiProvider: string;
  openaiApiKey: string;
  openaiModel: string;
  groqApiKey: string;
  groqModel: string;
}

const defaultConfig: Config = {
  name: "Assistente IA",
  systemPrompt: "Você é um assistente prestativo e amigável.",
  temperature: 0.7,
  maxTokens: 1024,
  historyLimit: 10,
  enabled: true,
  allowedPhones: "",
  evolutionUrl: "",
  evolutionApiKey: "",
  instanceId: "",
  aiProvider: "openai",
  openaiApiKey: "",
  openaiModel: "gpt-4.1-mini",
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
};

export default function ConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWebhookUrl(window.location.origin + "/api/webhook");
    fetch("/api/config")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setConfig(data); });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      setFeedback({ type: "success", msg: "Configurações salvas com sucesso!" });
    } else {
      const data = await res.json().catch(() => ({}));
      setFeedback({ type: "error", msg: data.error ?? "Erro ao salvar configurações." });
    }
    setSaving(false);
  }

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-2)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    paddingBottom: "28px",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div style={{ padding: "28px", maxWidth: "720px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--text-1)",
          }}
        >
          Configurações
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "14px", marginTop: "4px" }}>
          Configure o agente, provedor de IA e conexão com WhatsApp
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Geral */}
        <div style={sectionStyle}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
            Geral
          </h2>

          <div>
            <label style={labelStyle}>Nome do agente</label>
            <input
              className="field-input"
              value={config.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Prompt do sistema</label>
            <textarea
              className="field-input"
              rows={4}
              value={config.systemPrompt}
              onChange={(e) => set("systemPrompt", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Temperatura</label>
              <input
                className="field-input"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => set("temperature", parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Max tokens</label>
              <input
                className="field-input"
                type="number"
                min={256}
                max={8192}
                value={config.maxTokens}
                onChange={(e) => set("maxTokens", parseInt(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Histórico (msgs)</label>
              <input
                className="field-input"
                type="number"
                min={1}
                max={100}
                value={config.historyLimit}
                onChange={(e) => set("historyLimit", parseInt(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-1)" }}>Agente ativo</p>
              <p style={{ fontSize: "13px", color: "var(--text-2)" }}>Responde mensagens do WhatsApp</p>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !config.enabled)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                cursor: "pointer",
                background: config.enabled ? "var(--accent)" : "var(--border-2)",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "3px",
                  left: config.enabled ? "25px" : "3px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>

          <div>
            <label style={labelStyle}>Telefones permitidos (CSV)</label>
            <input
              className="field-input"
              placeholder="5511999999999,5511888888888"
              value={config.allowedPhones}
              onChange={(e) => set("allowedPhones", e.target.value)}
            />
            <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
              Deixe vazio para aceitar todos os números
            </p>
          </div>
        </div>

        {/* Provedor de IA */}
        <div style={sectionStyle}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
            Provedor de IA
          </h2>

          <div style={{ display: "flex", gap: "10px" }}>
            {["openai", "groq"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("aiProvider", p)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  border: config.aiProvider === p ? "1px solid var(--accent-border)" : "1px solid var(--border-2)",
                  background: config.aiProvider === p ? "var(--accent-dim)" : "transparent",
                  color: config.aiProvider === p ? "var(--accent)" : "var(--text-2)",
                  fontWeight: config.aiProvider === p ? 600 : 400,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {p === "openai" ? "OpenAI" : "Groq (grátis)"}
              </button>
            ))}
          </div>

          {config.aiProvider === "openai" ? (
            <>
              <div>
                <label style={labelStyle}>OpenAI API Key</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="sk-..."
                  value={config.openaiApiKey}
                  onChange={(e) => set("openaiApiKey", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Modelo</label>
                <select
                  className="field-input"
                  value={config.openaiModel}
                  onChange={(e) => set("openaiModel", e.target.value)}
                >
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Groq API Key</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="gsk_..."
                  value={config.groqApiKey}
                  onChange={(e) => set("groqApiKey", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Modelo</label>
                <select
                  className="field-input"
                  value={config.groqModel}
                  onChange={(e) => set("groqModel", e.target.value)}
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                  <option value="gemma2-9b-it">gemma2-9b-it</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Evolution API */}
        <div style={sectionStyle}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
            Evolution API (WhatsApp)
          </h2>

          <div>
            <label style={labelStyle}>URL da Evolution API</label>
            <input
              className="field-input"
              placeholder="https://sua-evolution.com"
              value={config.evolutionUrl}
              onChange={(e) => set("evolutionUrl", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>API Key</label>
            <input
              className="field-input"
              type="password"
              value={config.evolutionApiKey}
              onChange={(e) => set("evolutionApiKey", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Instance ID</label>
            <input
              className="field-input"
              value={config.instanceId}
              onChange={(e) => set("instanceId", e.target.value)}
            />
          </div>
        </div>

        {/* Webhook */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
            Webhook
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-2)" }}>
            Configure esta URL na Evolution API com o evento <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: "4px" }}>messages.upsert</code>
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              className="field-input"
              readOnly
              value={webhookUrl}
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={copyWebhook}
              style={{ flexShrink: 0, padding: "10px 16px" }}
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: feedback.type === "success" ? "var(--success-dim)" : "var(--error-dim)",
              color: feedback.type === "success" ? "var(--success)" : "var(--error)",
              fontSize: "14px",
            }}
          >
            {feedback.msg}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: "flex-start", padding: "12px 32px" }}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </div>
  );
}
