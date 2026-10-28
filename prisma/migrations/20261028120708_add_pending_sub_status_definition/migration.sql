-- CreateTable
CREATE TABLE "PendingSubStatusDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSubStatusDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingSubStatusDefinition_orgId_position_idx" ON "PendingSubStatusDefinition"("orgId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PendingSubStatusDefinition_orgId_key_key" ON "PendingSubStatusDefinition"("orgId", "key");
