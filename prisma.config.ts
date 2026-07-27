import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use Postgres URL for migrations in production, SQLite locally
    url: process.env["POSTGRES_URL"] || process.env["DATABASE_URL"] || "file:./dev.db",
  },
});
