function baseUrl(evolutionUrl: string) {
  return evolutionUrl.replace(/\/+$/, "");
}

export async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceId: string,
  phone: string,
  text: string
): Promise<void> {
  const url = `${baseUrl(evolutionUrl)}/message/sendText/${instanceId}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: evolutionApiKey,
    },
    body: JSON.stringify({ number: phone, text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Evolution API ${response.status}: ${body || response.statusText}`);
  }
}

export async function checkEvolutionConnection(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceId: string,
): Promise<{ connected: boolean; state?: string; error?: string }> {
  try {
    const url = `${baseUrl(evolutionUrl)}/instance/connectionState/${instanceId}`;
    const response = await fetch(url, {
      headers: { apikey: evolutionApiKey },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}: ${JSON.stringify(body)}` };
    }
    const state: string = body?.instance?.state ?? body?.state ?? "unknown";
    return { connected: state === "open", state };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
