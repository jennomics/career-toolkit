import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { resolve } from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/migrate/export
 *
 * Reads directly from the LOCAL SQLite dev.db file (NOT from Prisma/Neon).
 * This ensures we get the original 116 jobs even when POSTGRES_PRISMA_URL is set.
 *
 * Only works locally where dev.db exists.
 */
export async function GET() {
  try {
    // Find the SQLite database
    const dbPath = resolve(process.cwd(), "dev.db");

    if (!existsSync(dbPath)) {
      return NextResponse.json(
        {
          error: "SQLite database not found at " + dbPath,
          hint: "This endpoint only works locally where dev.db exists.",
        },
        { status: 404 }
      );
    }

    // Dynamic import to avoid build-time issues (better-sqlite3 is optional)
    let Database;
    try {
      Database = (await import("better-sqlite3")).default;
    } catch {
      return NextResponse.json(
        {
          error: "better-sqlite3 not installed. Run: npm install better-sqlite3",
        },
        { status: 500 }
      );
    }

    const db = new Database(dbPath, { readonly: true });

    const jobs = db.prepare("SELECT * FROM Job").all();
    const skills = db.prepare("SELECT * FROM JobSkill").all();
    const responsibilities = db.prepare("SELECT * FROM JobResponsibility").all();
    const corrections = db.prepare("SELECT * FROM Correction").all();

    db.close();

    return NextResponse.json({
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
  } catch (error) {
    console.error("[migrate/export] Failed:", error);
    return NextResponse.json(
      {
        error: "Export failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
