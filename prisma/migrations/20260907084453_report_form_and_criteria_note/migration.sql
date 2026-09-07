-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "criteriaNote" TEXT;

-- AlterTable
ALTER TABLE "QuarterlyReport" ADD COLUMN     "keyProjects" TEXT,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "obstacleFactors" TEXT,
ADD COLUMN     "problems" TEXT,
ADD COLUMN     "progressReport" TEXT,
ADD COLUMN     "responsible" TEXT,
ADD COLUMN     "supportFactors" TEXT;
