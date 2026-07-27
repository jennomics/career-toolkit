import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Turso (cloud SQLite) for production, local file for dev
  const url = process.env.TURSO_DATABASE_URL || "file:dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  const adapter = new PrismaLibSql({
    url,
    authToken,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
