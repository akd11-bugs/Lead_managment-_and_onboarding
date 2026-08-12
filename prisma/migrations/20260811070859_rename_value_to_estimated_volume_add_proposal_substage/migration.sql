-- RenameColumn (preserves existing data, unlike drop+add)
ALTER TABLE "Lead" RENAME COLUMN "value" TO "estimatedVolume";

-- AddColumn
ALTER TABLE "Lead" ADD COLUMN "proposalSubStage" TEXT;
