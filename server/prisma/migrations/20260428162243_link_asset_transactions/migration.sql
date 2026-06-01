-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN     "assetItemId" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "assetItemId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetItemId_fkey" FOREIGN KEY ("assetItemId") REFERENCES "AssetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_assetItemId_fkey" FOREIGN KEY ("assetItemId") REFERENCES "AssetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
