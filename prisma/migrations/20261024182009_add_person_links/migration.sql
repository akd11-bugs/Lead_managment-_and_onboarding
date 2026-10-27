-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "otherLinksJson" TEXT NOT NULL DEFAULT '[]';
