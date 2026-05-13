import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
