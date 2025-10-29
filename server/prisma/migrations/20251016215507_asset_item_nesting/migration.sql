/*
  Warnings:

  - You are about to drop the column `order` on the `AssetGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AssetGroup" DROP COLUMN "order";

-- AlterTable
ALTER TABLE "AssetItem" ADD COLUMN     "parentItemId" INTEGER,
ALTER COLUMN "groupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "AssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
