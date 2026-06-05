-- CreateTable
CREATE TABLE "DrivingRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrivingRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePoint" (
    "id" BIGSERIAL NOT NULL,
    "routeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "RoutePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSummary" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeName" TEXT,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "endLat" DOUBLE PRECISION,
    "endLng" DOUBLE PRECISION,
    "erpCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fuelCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "parkingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrivingRoute_userId_startTime_idx" ON "DrivingRoute"("userId", "startTime");

-- CreateIndex
CREATE INDEX "DrivingRoute_userId_isActive_idx" ON "DrivingRoute"("userId", "isActive");

-- CreateIndex
CREATE INDEX "RoutePoint_routeId_timestamp_idx" ON "RoutePoint"("routeId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TripSummary_routeId_key" ON "TripSummary"("routeId");

-- CreateIndex
CREATE INDEX "TripSummary_userId_createdAt_idx" ON "TripSummary"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DrivingRoute" ADD CONSTRAINT "DrivingRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePoint" ADD CONSTRAINT "RoutePoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DrivingRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSummary" ADD CONSTRAINT "TripSummary_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DrivingRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSummary" ADD CONSTRAINT "TripSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
