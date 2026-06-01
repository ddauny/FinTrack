-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "parentSplitId" INTEGER,
ADD COLUMN     "splitGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_userId_splitGroupId_idx" ON "Transaction"("userId", "splitGroupId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_parentSplitId_fkey" FOREIGN KEY ("parentSplitId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
