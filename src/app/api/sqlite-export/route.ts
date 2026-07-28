import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { resolve } from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/sqlite-export
 *
 * Reads directly from local SQLite dev.db using better-sqlite3.
 * Completely independent of Prisma — guaranteed to read local data.
 */
export async function GET() {
  try {
    const dbPath = resolve(process.cwd(), "dev.db");

    if (!existsSync(dbPath)) {
      // Try alternate locations
      const altPaths = [
        resolve(process.cwd(), "prisma/dev.db"),
        resolve(process.cwd(), "../dev.db"),
      ];
      const found = altPaths.find((p) => existsSync(p));
      if (!found) {
        return NextResponse.json(
          {
            error: "SQLite dev.db not found",
            searched: [dbPath, ...altPaths],
            cwd: process.cwd(),
          },
          { status: 404 }
        );
      }
      // Use the found path
      return await exportFromSqlite(found);
    }

    return await exportFromSqlite(dbPath);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Export failed",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function exportFromSqlite(dbPath: string) {
  let Database;
  try {
    Database = (await import("better-sqlite3")).default;
  } catch (e) {
    return NextResponse.json(
      {
        error: "better-sqlite3 not available",
        details: e instanceof Error ? e.message : String(e),
        fix: "Run: npm install better-sqlite3",
      },
      { status: 500 }
    );
  }

  const db = new Database(dbPath, { readonly: true });

  const jobs = db.prepare("SELECT * FROM Job").all();
  const skills = db.prepare("SELECT * FROM JobSkill").all();
  const responsibilities = db
    .prepare("SELECT * FROM JobResponsibility")
    .all();
  const corrections = db.prepare("SELECT * FROM Correction").all();

  db.close();

  return NextResponse.json({
    source: "sqlite",
    dbPath,
    exportedAt: new Date().toISOString(),
    counts: {
      jobs: jobs.length,
      skills: skills.length,
      responsibilities: responsibilities.length,
      corrections: corrections.length,
    },
    jobs,
    skills,
    responsibilities,
    corrections,
  });
}
