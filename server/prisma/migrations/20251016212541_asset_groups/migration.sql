-- CreateTable
CREATE TABLE "AssetGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetItem" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AssetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValuation" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AssetValuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetValuation_itemId_month_key" ON "AssetValuation"("itemId", "month");

-- AddForeignKey
ALTER TABLE "AssetGroup" ADD CONSTRAINT "AssetGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AssetGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValuation" ADD CONSTRAINT "AssetValuation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
