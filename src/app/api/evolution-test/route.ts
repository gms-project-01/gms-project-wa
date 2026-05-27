import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { checkEvolutionConnection } from "@/lib/evolution";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { evolutionUrl, evolutionApiKey, instanceId } = await request.json();

  if (!evolutionUrl || !instanceId) {
    return NextResponse.json({ connected: false, error: "URL e Instance ID são obrigatórios" });
  }

  const result = await checkEvolutionConnection(evolutionUrl, evolutionApiKey, instanceId);
  return NextResponse.json(result);
}
