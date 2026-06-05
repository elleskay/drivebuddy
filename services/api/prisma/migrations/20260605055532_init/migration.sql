-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('Petrol', 'Hybrid', 'Electric');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" DATE,
    "homeAddress" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "fuelConsumption" DECIMAL(5,2) NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_provider_providerId_idx" ON "User"("provider", "providerId");

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_userId_vehicleNumber_key" ON "Vehicle"("userId", "vehicleNumber");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
