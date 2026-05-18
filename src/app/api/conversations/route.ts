import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") ?? undefined;

  const conversations = await prisma.conversation.findMany({
    where: {
      source: "whatsapp",
      ...(phone ? { phone: { contains: phone } } : {}),
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(conversations);
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
