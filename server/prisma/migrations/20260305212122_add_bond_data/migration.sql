-- CreateTable
CREATE TABLE "BondData" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "isin" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "nominalValue" DECIMAL(65,30) NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "bankCommissions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "couponRate" DECIMAL(65,30),
    "couponFrequency" INTEGER NOT NULL DEFAULT 6,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 12.5,

    CONSTRAINT "BondData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponTier" (
    "id" SERIAL NOT NULL,
    "bondId" INTEGER NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "toYear" INTEGER NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "CouponTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BondData_itemId_key" ON "BondData"("itemId");

-- AddForeignKey
ALTER TABLE "BondData" ADD CONSTRAINT "BondData_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTier" ADD CONSTRAINT "CouponTier_bondId_fkey" FOREIGN KEY ("bondId") REFERENCES "BondData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
