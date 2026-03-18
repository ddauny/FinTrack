-- CreateTable
CREATE TABLE "ExternalIncomeSource" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "apiUrl" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL DEFAULT 'GET',
    "authType" TEXT NOT NULL DEFAULT 'BEARER',
    "authToken" TEXT,
    "authHeaderName" TEXT,
    "authQueryParam" TEXT,
    "responseField" TEXT NOT NULL,
    "cacheTtlMinutes" INTEGER NOT NULL DEFAULT 15,
    "lastFetchedAt" TIMESTAMP(3),
    "lastFetchedValue" DECIMAL(65,30),
    "lastFetchError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalIncomeSource_userId_idx" ON "ExternalIncomeSource"("userId");

-- AddForeignKey
ALTER TABLE "ExternalIncomeSource" ADD CONSTRAINT "ExternalIncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
