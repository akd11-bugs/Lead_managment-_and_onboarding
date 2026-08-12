-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'merchant';

-- CreateIndex
CREATE INDEX "Lead_type_idx" ON "Lead"("type");

-- CreateIndex
CREATE INDEX "Lead_onboardedAt_idx" ON "Lead"("onboardedAt");

-- CreateIndex
CREATE INDEX "Lead_expectedCloseDate_idx" ON "Lead"("expectedCloseDate");
