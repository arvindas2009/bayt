-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN "preferences" TEXT;

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "recurrence" TEXT,
    "ownerId" TEXT NOT NULL,
    "backupIds" TEXT NOT NULL DEFAULT '[]',
    "subjectId" TEXT,
    "consequence" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Obligation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "redirectedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "Handoff_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Handoff_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Handoff_toId_fkey" FOREIGN KEY ("toId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRun_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'captured',
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Briefing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "opsOutput" TEXT NOT NULL,
    "healthOutput" TEXT NOT NULL,
    "timeSaved" REAL NOT NULL,
    "alerts" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Briefing_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Briefing" ("alerts", "date", "familyId", "healthOutput", "id", "opsOutput", "summary", "timeSaved") SELECT "alerts", "date", "familyId", "healthOutput", "id", "opsOutput", "summary", "timeSaved" FROM "Briefing";
DROP TABLE "Briefing";
ALTER TABLE "new_Briefing" RENAME TO "Briefing";
CREATE TABLE "new_CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "ownerId" TEXT,
    "backupIds" TEXT NOT NULL DEFAULT '[]',
    "recurrence" TEXT,
    CONSTRAINT "CalendarEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CalendarEvent" ("category", "conflict", "date", "id", "memberId", "metadata", "title") SELECT "category", "conflict", "date", "id", "memberId", "metadata", "title" FROM "CalendarEvent";
DROP TABLE "CalendarEvent";
ALTER TABLE "new_CalendarEvent" RENAME TO "CalendarEvent";
CREATE TABLE "new_Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "interactions" TEXT NOT NULL,
    "ownerId" TEXT,
    "backupIds" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Medication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Medication" ("dosage", "frequency", "id", "interactions", "memberId", "name") SELECT "dosage", "frequency", "id", "interactions", "memberId", "name" FROM "Medication";
DROP TABLE "Medication";
ALTER TABLE "new_Medication" RENAME TO "Medication";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AgentRun_familyId_agent_createdAt_idx" ON "AgentRun"("familyId", "agent", "createdAt");
