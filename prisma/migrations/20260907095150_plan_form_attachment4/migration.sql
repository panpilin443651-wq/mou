/*
  Warnings:

  - You are about to drop the column `activity` on the `ActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `expectedOutput` on the `ActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `quarter` on the `ActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ActionPlan` table. All the data in the column will be lost.
  - Added the required column `actualMonths` to the `ActionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planMonths` to the `ActionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ActionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanSection" AS ENUM ('TARGET', 'STEP');

-- DropIndex
DROP INDEX "ActionPlan_indicatorId_quarter_idx";

-- AlterTable
ALTER TABLE "ActionPlan" DROP COLUMN "activity",
DROP COLUMN "expectedOutput",
DROP COLUMN "quarter",
DROP COLUMN "status",
ADD COLUMN     "actualMonths" JSONB NOT NULL,
ADD COLUMN     "causeNote" TEXT,
ADD COLUMN     "correctiveAction" TEXT,
ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "planMonths" JSONB NOT NULL,
ADD COLUMN     "section" "PlanSection" NOT NULL DEFAULT 'STEP',
ADD COLUMN     "targetValue" DOUBLE PRECISION,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT;

-- DropEnum
DROP TYPE "PlanStatus";

-- CreateTable
CREATE TABLE "PlanHeader" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "owner" TEXT,
    "budget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanHeader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanHeader_indicatorId_key" ON "PlanHeader"("indicatorId");

-- CreateIndex
CREATE INDEX "ActionPlan_indicatorId_section_sortOrder_idx" ON "ActionPlan"("indicatorId", "section", "sortOrder");

-- AddForeignKey
ALTER TABLE "PlanHeader" ADD CONSTRAINT "PlanHeader_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
