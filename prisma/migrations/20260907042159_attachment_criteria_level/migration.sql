-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "criteriaLevel" INTEGER;

-- CreateIndex
CREATE INDEX "Attachment_reportId_criteriaLevel_idx" ON "Attachment"("reportId", "criteriaLevel");
