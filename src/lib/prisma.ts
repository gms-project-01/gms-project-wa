import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveFileUrl(rawUrl: string): string {
  if (rawUrl.startsWith("file:") && !rawUrl.startsWith("file://")) {
    const filePath = rawUrl.slice(5);
    if (!path.isAbsolute(filePath)) {
      return "file:" + path.resolve(process.cwd(), filePath);
    }
  }
  return rawUrl;
}

function createPrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    const url = process.env.DATABASE_URL ?? "file:/app/data/prod.db";
    const adapter = new PrismaLibSql({ url });
    return new PrismaClient({ adapter });
  }

  const url = resolveFileUrl(process.env.DATABASE_URL ?? "file:./dev.db");
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
