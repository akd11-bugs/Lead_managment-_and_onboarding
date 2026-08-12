-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "onboardingSubStage" TEXT;

-- DataMigration: "won" is no longer a resting stage — winning a deal now
-- means entering the onboarding sub-pipeline. Leads already marked onboarded
-- land on the last sub-stage; the rest start at the top of the funnel.
UPDATE "Lead" SET "onboardingSubStage" = 'final_onboarded' WHERE "stage" = 'won' AND "onboardedAt" IS NOT NULL;
UPDATE "Lead" SET "onboardingSubStage" = 'document_submission' WHERE "stage" = 'won' AND "onboardedAt" IS NULL;
UPDATE "Lead" SET "stage" = 'onboarding' WHERE "stage" = 'won';
