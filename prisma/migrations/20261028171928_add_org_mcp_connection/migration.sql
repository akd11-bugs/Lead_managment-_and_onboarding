-- CreateTable
CREATE TABLE "OrgMcpConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "tokenEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastToolCount" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuredByUserId" TEXT,

    CONSTRAINT "OrgMcpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgMcpConnection_orgId_idx" ON "OrgMcpConnection"("orgId");

-- AddForeignKey
ALTER TABLE "OrgMcpConnection" ADD CONSTRAINT "OrgMcpConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
