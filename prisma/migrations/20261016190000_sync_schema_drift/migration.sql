-- Reconciles the schema with the drift accumulated between August 2026 and
-- 2026-10-16, during which changes were applied with `prisma db push` and
-- never recorded as migrations.
--
-- DESTRUCTIVE. This is safe to apply ONLY to an empty database:
--   * Lead.company and Lead.poc are dropped (replaced by the Company/Person
--     relations), which loses their contents.
--   * orgId is added NOT NULL with no default to Activity, Lead, SkillRun,
--     Task and User. On a table with existing rows this FAILS rather than
--     silently corrupting, which is the behaviour we want.
--
-- Production held zero rows when this was generated and applied. A database
-- with data needs a hand-written backfill between the ADD COLUMN and the
-- NOT NULL constraint instead.

-- DropIndex
DROP INDEX "Task_ownerId_idx";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "orgId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "company",
DROP COLUMN "poc",
ADD COLUMN     "assignedOpsId" TEXT,
ADD COLUMN     "assignedOpsName" TEXT,
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "customFieldsJson" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "pendingSubStatus" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "wonAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SkillRun" ADD COLUMN     "orgId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "orgId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailAppPasswordEnc" TEXT,
ADD COLUMN     "emailConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "emailFromAddress" TEXT,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT,
    "logoUrl" TEXT,
    "logoDataUrl" TEXT,
    "brandColor" TEXT,
    "reportsApiKey" TEXT,
    "agentApiKey" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgEmailConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUser" TEXT NOT NULL,
    "smtpPassEnc" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuredByUserId" TEXT,

    CONSTRAINT "OrgEmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgSheetConnector" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "sheetRange" TEXT NOT NULL DEFAULT 'Sheet1',
    "defaultOwnerUserId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuredByUserId" TEXT,

    CONSTRAINT "OrgSheetConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStepDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "localKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "note" TEXT,
    "holderUserId" TEXT,
    "holderLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFieldDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "businessType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionConfig" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "viewType" TEXT NOT NULL DEFAULT 'leads',
    "filtersJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isReusable" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByUserId" TEXT,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "targetInviteId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardElement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION,
    "h" DOUBLE PRECISION,
    "color" TEXT,
    "text" TEXT,
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteboardElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_reportsApiKey_key" ON "Organization"("reportsApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_agentApiKey_key" ON "Organization"("agentApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "OrgEmailConfig_orgId_key" ON "OrgEmailConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSheetConnector_orgId_key" ON "OrgSheetConnector"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSheetConnector_sheetId_key" ON "OrgSheetConnector"("sheetId");

-- CreateIndex
CREATE INDEX "StageDefinition_orgId_position_idx" ON "StageDefinition"("orgId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StageDefinition_orgId_key_key" ON "StageDefinition"("orgId", "key");

-- CreateIndex
CREATE INDEX "OnboardingStepDefinition_orgId_position_idx" ON "OnboardingStepDefinition"("orgId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStepDefinition_orgId_key_key" ON "OnboardingStepDefinition"("orgId", "key");

-- CreateIndex
CREATE INDEX "OnboardingDocument_orgId_leadId_idx" ON "OnboardingDocument"("orgId", "leadId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_orgId_status_idx" ON "OnboardingDocument"("orgId", "status");

-- CreateIndex
CREATE INDEX "LeadFieldDefinition_orgId_position_idx" ON "LeadFieldDefinition"("orgId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFieldDefinition_orgId_key_key" ON "LeadFieldDefinition"("orgId", "key");

-- CreateIndex
CREATE INDEX "Company_orgId_name_idx" ON "Company"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_orgId_normalizedName_key" ON "Company"("orgId", "normalizedName");

-- CreateIndex
CREATE INDEX "Person_orgId_companyId_idx" ON "Person"("orgId", "companyId");

-- CreateIndex
CREATE INDEX "Person_orgId_name_idx" ON "Person"("orgId", "name");

-- CreateIndex
CREATE INDEX "WorkflowRule_orgId_ownerId_triggerType_active_idx" ON "WorkflowRule"("orgId", "ownerId", "triggerType", "active");

-- CreateIndex
CREATE INDEX "SavedView_orgId_userId_idx" ON "SavedView"("orgId", "userId");

-- CreateIndex
CREATE INDEX "SavedView_orgId_userId_viewType_idx" ON "SavedView"("orgId", "userId", "viewType");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_orgId_status_idx" ON "Invite"("orgId", "status");

-- CreateIndex
CREATE INDEX "JoinRequest_orgId_status_idx" ON "JoinRequest"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SignupToken_token_key" ON "SignupToken"("token");

-- CreateIndex
CREATE INDEX "SignupToken_email_idx" ON "SignupToken"("email");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_key_key" ON "SyncCursor"("key");

-- CreateIndex
CREATE INDEX "JobRun_jobKey_finishedAt_idx" ON "JobRun"("jobKey", "finishedAt");

-- CreateIndex
CREATE INDEX "JobRun_orgId_finishedAt_idx" ON "JobRun"("orgId", "finishedAt");

-- CreateIndex
CREATE INDEX "WhiteboardElement_orgId_idx" ON "WhiteboardElement"("orgId");

-- CreateIndex
CREATE INDEX "Activity_orgId_date_idx" ON "Activity"("orgId", "date");

-- CreateIndex
CREATE INDEX "Lead_orgId_idx" ON "Lead"("orgId");

-- CreateIndex
CREATE INDEX "Lead_wonAt_idx" ON "Lead"("wonAt");

-- CreateIndex
CREATE INDEX "SkillRun_orgId_createdAt_idx" ON "SkillRun"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_orgId_ownerId_idx" ON "Task"("orgId", "ownerId");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_name_key" ON "User"("orgId", "name");

-- AddForeignKey
ALTER TABLE "OrgEmailConfig" ADD CONSTRAINT "OrgEmailConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgSheetConnector" ADD CONSTRAINT "OrgSheetConnector_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

