import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import os from "os";

let databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// On Netlify (which sets NETLIFY=true) or Vercel, the filesystem where the function runs is often read-only.
// We can copy the seed database to a temp directory to make it writable.
if (process.env.NETLIFY === "true" || process.env.NODE_ENV === "production") {
  try {
    const dbName = "dev.db";
    const sourceDbPath = path.join(process.cwd(), dbName);
    const destDbPath = path.join(os.tmpdir(), dbName);

    // Copy if it doesn't already exist in the temp directory
    if (!fs.existsSync(destDbPath) && fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, destDbPath);
    }

    // Change the DB url to point to the writable temp location
    // Prisma requires absolute paths for sqlite if we use the file protocol
    databaseUrl = `file:${destDbPath}`;
  } catch (error) {
    console.error("Error setting up SQLite in temp dir:", error);
  }
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const createPrismaClient = () => new PrismaClient({ adapter });

const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: ReturnType<typeof createPrismaClient>;
};

const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

export default prisma;

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prismaGlobal = prisma;
