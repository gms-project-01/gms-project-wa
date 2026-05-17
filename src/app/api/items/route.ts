import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toInitCap } from "@/lib/utils";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const phone = searchParams.get("phone") ?? undefined;

  const items = await prisma.item.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(phone ? { phone: { contains: phone } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await prisma.item.create({
      data: {
        category: body.category ?? "outro",
        title: toInitCap(body.title ?? "Item manual"),
        content: body.content ?? "",
        status: body.status ?? "aberto",
        phone: body.phone ?? null,
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[items POST] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
