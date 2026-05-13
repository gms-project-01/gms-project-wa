import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveDbUrl(rawUrl: string): string {
  if (rawUrl.startsWith("file:") && !rawUrl.startsWith("file://")) {
    const filePath = rawUrl.slice(5);
    if (!path.isAbsolute(filePath)) {
      return pathToFileURL(path.resolve(process.cwd(), filePath)).href;
    }
    return pathToFileURL(filePath).href;
  }
  return rawUrl;
}

function createPrisma() {
  const url = resolveDbUrl(process.env.DATABASE_URL ?? "file:./dev.db");
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
