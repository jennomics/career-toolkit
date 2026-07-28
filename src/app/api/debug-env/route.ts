import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug-env
 * 
 * Temporary diagnostic endpoint to check which database the app is connecting to.
 * DELETE THIS FILE after debugging.
 */
export async function GET() {
  const pgUrl = process.env.POSTGRES_URL;
  const pgPrismaUrl = process.env.POSTGRES_PRISMA_URL;
  const dbUrl = process.env.DATABASE_URL;

  const connectionString = pgUrl || pgPrismaUrl || dbUrl;

  // Check for stray lockfiles in parent dirs
  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();
  const parentLockfile = fs.existsSync(path.join(cwd, "..", "package-lock.json"));
  const grandparentLockfile = fs.existsSync(path.join(cwd, "..", "..", "package-lock.json"));

  return NextResponse.json({
    cwd,
    envVars: {
      POSTGRES_URL: pgUrl ? `${pgUrl.substring(0, 20)}...` : "NOT SET",
      POSTGRES_PRISMA_URL: pgPrismaUrl ? `${pgPrismaUrl.substring(0, 20)}...` : "NOT SET",
      DATABASE_URL: dbUrl ? `${dbUrl.substring(0, 20)}...` : "NOT SET",
    },
    resolvedConnection: connectionString ? `${connectionString.substring(0, 25)}...` : "NONE",
    isPostgres: connectionString?.startsWith("postgresql") || false,
    isSQLite: connectionString?.startsWith("file:") || false,
    parentHasLockfile: parentLockfile,
    grandparentHasLockfile: grandparentLockfile,
    nodeEnv: process.env.NODE_ENV,
  });
}
