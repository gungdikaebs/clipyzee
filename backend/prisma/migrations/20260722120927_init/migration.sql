-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('ANALYZE', 'RENDER');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "type" "JobType" NOT NULL DEFAULT 'ANALYZE';
