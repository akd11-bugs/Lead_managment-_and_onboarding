-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "intakeFormId" TEXT,
ADD COLUMN     "intakeFormName" TEXT;

-- AlterTable
ALTER TABLE "OrgLeadIntakeForm" ALTER COLUMN "defaultSource" SET DEFAULT 'form';
