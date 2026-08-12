-- RenameColumn (preserves existing data, unlike drop+add)
ALTER TABLE "Lead" RENAME COLUMN "name" TO "poc";
-- Point of contact is now optional
ALTER TABLE "Lead" ALTER COLUMN "poc" DROP NOT NULL;

-- AddColumn
ALTER TABLE "Lead" ADD COLUMN "website" TEXT;
ALTER TABLE "Lead" ADD COLUMN "industry" TEXT;
ALTER TABLE "Lead" ADD COLUMN "businessType" TEXT;
ALTER TABLE "Lead" ADD COLUMN "painPoints" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "whatTheyWant" TEXT NOT NULL DEFAULT '';
