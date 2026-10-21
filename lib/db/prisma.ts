import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import os from "os";

export interface DbLocation {
  /** The DATABASE_URL (or default) the app was asked to use. */
  configured: string;
  /** The seeded file that was found, or null when none could be located. */
  source: string | null;
  /** True when the source was read-only (serverless) and a copy in the temp dir is used instead. */
  copiedToTmp: boolean;
  url: string;
}

const isWritable = (target: string): boolean => {
  try {
    fs.accessSync(target, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

/** Looks for `fileName` in `start` and the folders above it (and in a `bayt/` child, for monorepo-style deploys). */
function searchUp(start: string, fileName: string): string | null {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    for (const candidate of [path.join(dir, fileName), path.join(dir, "bayt", fileName)]) {
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * SQLite needs a writable file *and* folder (journal files). On Netlify/Lambda the deployed bundle is
 * read-only, so the seeded database is copied to the temp dir on first use. The decision is made by
 * probing the filesystem, never by `NETLIFY=true`: Netlify sets that during the build too, and the
 * build-time seed has to write to the real file that gets deployed.
 */
function resolveDatabase(): DbLocation {
  const configured = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!configured.startsWith("file:")) {
    return { configured, source: null, copiedToTmp: false, url: configured };
  }

  const filePart = configured.slice("file:".length);
  const wanted = path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);
  const fileName = path.basename(wanted);

  // The runtime working directory is not always the folder the build ran in, so search around.
  const source = fs.existsSync(wanted)
    ? wanted
    : (searchUp(process.cwd(), fileName) ?? searchUp(__dirname, fileName));

  if (!source) {
    // Nothing to copy (a fresh local checkout before `npm run seed`, or a bundle without the file).
    return { configured, source: null, copiedToTmp: false, url: configured };
  }

  if (isWritable(source) && isWritable(path.dirname(source))) {
    return { configured, source, copiedToTmp: false, url: source === wanted ? configured : `file:${source}` };
  }

  try {
    const dest = path.join(os.tmpdir(), fileName);
    if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
    return { configured, source, copiedToTmp: true, url: `file:${dest}` };
  } catch (error) {
    console.error("Error setting up SQLite in temp dir:", error);
    return { configured, source, copiedToTmp: false, url: source === wanted ? configured : `file:${source}` };
  }
}

export const dbLocation = resolveDatabase();

if (!dbLocation.source && dbLocation.configured.startsWith("file:")) {
  console.error(
    `[db] No SQLite file found for ${dbLocation.configured} (cwd ${process.cwd()}). ` +
      "Run `npm run seed` at build time and make sure the file is bundled (next.config outputFileTracingIncludes)."
  );
}

const adapter = new PrismaBetterSqlite3({ url: dbLocation.url });

const createPrismaClient = () => new PrismaClient({ adapter });

const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: ReturnType<typeof createPrismaClient>;
};

const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

export default prisma;

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prismaGlobal = prisma;
