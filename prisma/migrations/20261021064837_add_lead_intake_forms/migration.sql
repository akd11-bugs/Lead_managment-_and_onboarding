-- CreateTable
CREATE TABLE "OrgLeadIntakeForm" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultOwnerUserId" TEXT NOT NULL,
    "defaultSource" TEXT NOT NULL DEFAULT 'event',
    "configuredByUserId" TEXT NOT NULL,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrgLeadIntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgLeadIntakeForm_slug_key" ON "OrgLeadIntakeForm"("slug");

-- CreateIndex
CREATE INDEX "OrgLeadIntakeForm_orgId_idx" ON "OrgLeadIntakeForm"("orgId");
