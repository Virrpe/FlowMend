-- CreateTable
CREATE TABLE "ComplianceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "customerId" TEXT,
    "ordersUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ComplianceRequest_shopDomain_requestType_createdAt_idx" ON "ComplianceRequest"("shopDomain", "requestType", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceRequest_status_idx" ON "ComplianceRequest"("status");
