-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "effort" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "quality" TEXT NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "Lead_quality_idx" ON "Lead"("quality");
